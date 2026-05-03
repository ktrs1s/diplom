const authTabs = Array.from(document.querySelectorAll("[data-auth-tab]"));
const loginPanel = document.getElementById("auth-login-panel");
const registerPanel = document.getElementById("auth-register-panel");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const noticeNode = document.getElementById("auth-notice");
const headerCartBadge = document.getElementById("header-cart-badge");
const currentYearNode = document.getElementById("current-year");
const menuGroupsNode = document.getElementById("mobile-menu-groups");
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");
const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");
const profileLinks = document.querySelectorAll("[data-profile-link]");
const phoneInputs = [
  document.getElementById("login-phone"),
  document.getElementById("register-phone"),
].filter(Boolean);

const catalogApi = window.ExclusiveCatalog;
const authParams = new URLSearchParams(window.location.search);
const initialMode = authParams.get("mode") === "register" ? "register" : "login";
const redirectTarget = authParams.get("redirect") || "../главная страница/index.html";
const nextIntent = authParams.get("intent") || "";
const POST_AUTH_INTENT_STORAGE_KEY = "exclusive-post-auth-intent-v1";

let activeTab = initialMode;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const formatPhoneInput = (value) => {
  let digits = String(value || "").replace(/[^\d]/g, "");

  if (digits.startsWith("7") || digits.startsWith("8")) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 10);

  let result = "+7";

  if (!digits) {
    return result;
  }

  result += " (";
  result += digits.slice(0, 3);

  if (digits.length >= 3) {
    result += ")";
  }

  if (digits.length > 3) {
    result += ` ${digits.slice(3, 6)}`;
  }

  if (digits.length > 6) {
    result += ` ${digits.slice(6, 8)}`;
  }

  if (digits.length > 8) {
    result += ` ${digits.slice(8, 10)}`;
  }

  return result;
};

const setNotice = (message, type = "") => {
  if (!noticeNode) {
    return;
  }

  if (!message) {
    noticeNode.hidden = true;
    noticeNode.textContent = "";
    noticeNode.classList.remove("is-error");
    return;
  }

  noticeNode.hidden = false;
  noticeNode.textContent = message;
  noticeNode.classList.toggle("is-error", type === "error");
};

const setActiveTab = (nextTab) => {
  activeTab = nextTab === "register" ? "register" : "login";

  authTabs.forEach((button) => {
    const isActive = button.dataset.authTab === activeTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  if (!loginPanel || !registerPanel) {
    return;
  }

  const showLogin = activeTab === "login";
  loginPanel.hidden = !showLogin;
  registerPanel.hidden = showLogin;
  loginPanel.classList.toggle("is-active", showLogin);
  registerPanel.classList.toggle("is-active", !showLogin);
};

const renderMenuGroups = () => {
  if (!menuGroupsNode || !catalogApi) {
    return;
  }

  menuGroupsNode.innerHTML = catalogApi
    .getMenuGroups()
    .map((group) => `<a class="mobile-menu__group-link" href="${group.href}">${escapeHtml(group.title)}</a>`)
    .join("");
};

const initMobileMenu = () => {
  if (!menuToggle || !mobileMenu || !mobileMenuClose || !mobileMenuBackdrop) {
    return;
  }

  const closeMenu = () => {
    document.body.classList.remove("menu-open");
    mobileMenu.classList.remove("is-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    mobileMenuBackdrop.hidden = true;
  };

  const openMenu = () => {
    document.body.classList.add("menu-open");
    mobileMenu.classList.add("is-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    mobileMenuBackdrop.hidden = false;
  };

  menuToggle.addEventListener("click", () => {
    if (document.body.classList.contains("menu-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  mobileMenuClose.addEventListener("click", closeMenu);
  mobileMenuBackdrop.addEventListener("click", closeMenu);
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
};

const redirectAfterAuth = () => {
  if (nextIntent === "checkout") {
    try {
      window.sessionStorage.setItem(POST_AUTH_INTENT_STORAGE_KEY, "checkout");
    } catch (error) {
      // If session storage is unavailable, we still continue to the cart flow.
    }

    window.location.href = redirectTarget;
    return;
  }

  if (window.ExclusiveAuth?.isAdminUser?.(window.ExclusiveAuth?.getCurrentUser?.())) {
    window.location.href = "../admin/index.html";
    return;
  }

  window.location.href = window.ExclusiveAuth.getAccountUrl();
};

const handleSuccess = (message) => {
  setNotice(message);
  window.setTimeout(redirectAfterAuth, 320);
};

const initEvents = () => {
  phoneInputs.forEach((input) => {
    input.value = formatPhoneInput(input.value);

    input.addEventListener("focus", () => {
      input.value = formatPhoneInput(input.value);
    });

    input.addEventListener("input", () => {
      input.value = formatPhoneInput(input.value);
    });
  });

  authTabs.forEach((button) => {
    button.addEventListener("click", () => {
      setNotice("");
      setActiveTab(button.dataset.authTab || "login");
    });
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setNotice("");

    const formData = new FormData(loginForm);

    try {
      await window.ExclusiveAuth.login(formData.get("phone"));
      handleSuccess("Вход выполнен.");
    } catch (error) {
      setNotice(error.message || "Не удалось войти.", "error");
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setNotice("");

    const formData = new FormData(registerForm);

    try {
      await window.ExclusiveAuth.register({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        phone: formData.get("phone"),
      });
      handleSuccess("Аккаунт создан.");
    } catch (error) {
      setNotice(error.message || "Не удалось создать аккаунт.", "error");
    }
  });
};

const initPage = () => {
  window.ExclusiveStore?.mountCartBadge(headerCartBadge);
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
  renderMenuGroups();
  initMobileMenu();
  setActiveTab(initialMode);
  initEvents();

  if (currentYearNode) {
    currentYearNode.textContent = String(new Date().getFullYear());
  }

  document.querySelectorAll("[data-telegram-link]").forEach((link) => {
    link.setAttribute("href", window.ExclusiveSiteConfig?.getTelegramBotUrl?.() || "https://t.me/");
  });
};

initPage();
