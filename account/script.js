const profileLinks = document.querySelectorAll("[data-profile-link]");
const headerCartBadge = document.getElementById("header-cart-badge");
const currentYearNode = document.getElementById("current-year");
const adminLinkNode = document.getElementById("account-admin-link");
const menuGroupsNode = document.getElementById("mobile-menu-groups");
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");
const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");
const noticeNode = document.getElementById("account-notice");
const accountForm = document.getElementById("account-form");
const logoutButton = document.getElementById("logout-button");
const ordersNode = document.getElementById("account-orders");
const emptyOrdersNode = document.getElementById("account-empty-orders");
const firstNameInput = document.getElementById("account-first-name");
const lastNameInput = document.getElementById("account-last-name");
const phoneInput = document.getElementById("account-phone");

const catalogApi = window.ExclusiveCatalog;
const accountParams = new URLSearchParams(window.location.search);

const ORDER_STATUS_LABELS = {
  draft: "Черновик",
  pending_manager: "Ждет менеджера",
  accepted: "Подтвержден",
  shipping: "Передан в доставку",
  completed: "Завершен",
  cancelled: "Отменен",
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

const renderOrders = (orders) => {
  if (!ordersNode || !emptyOrdersNode) {
    return;
  }

  if (!orders.length) {
    ordersNode.innerHTML = "";
    emptyOrdersNode.hidden = false;
    return;
  }

  emptyOrdersNode.hidden = true;
  ordersNode.innerHTML = orders
    .map((order) => {
      const itemsText = (order.items || [])
        .map((item) => `${escapeHtml(item.title)} × ${item.quantity}`)
        .join(", ");
      const dateValue = order.createdAt ? new Date(order.createdAt).toLocaleDateString("ru-RU") : "";

      return `
        <article class="account-order">
          <div class="account-order__top">
            <h3 class="account-order__id">${escapeHtml(order.id || "Заказ")}</h3>
            <span class="account-order__status">${escapeHtml(ORDER_STATUS_LABELS[order.status] || "В работе")}</span>
          </div>
          <div class="account-order__meta">
            <span>${escapeHtml(dateValue)}</span>
            <span>${window.ExclusiveStore?.formatPrice(order.total || 0) || `${order.total || 0} ₽`}</span>
          </div>
          <p class="account-order__items">${itemsText || "Состав заказа уточняется."}</p>
        </article>
      `;
    })
    .join("");
};

const fillForm = (user) => {
  if (firstNameInput) {
    firstNameInput.value = user.firstName || "";
  }

  if (lastNameInput) {
    lastNameInput.value = user.lastName || "";
  }

  if (phoneInput) {
    phoneInput.value = formatPhoneInput(user.phone || "");
  }
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

const loadAccount = async () => {
  try {
    const data = await window.ExclusiveAuth.getAccountData();
    fillForm(data.user);
    renderOrders(data.orders || []);
  } catch (error) {
    setNotice(error.message || "Не удалось загрузить кабинет.", "error");
  }
};

const initEvents = () => {
  phoneInput?.addEventListener("focus", () => {
    phoneInput.value = formatPhoneInput(phoneInput.value);
  });

  phoneInput?.addEventListener("input", () => {
    phoneInput.value = formatPhoneInput(phoneInput.value);
  });

  accountForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setNotice("");

    const formData = new FormData(accountForm);

    try {
      await window.ExclusiveAuth.updateProfile({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        phone: formData.get("phone"),
      });
      await loadAccount();
      window.ExclusiveAuth.mountProfileLinks(profileLinks);
      setNotice("Данные сохранены.");
    } catch (error) {
      setNotice(error.message || "Не удалось сохранить изменения.", "error");
    }
  });

  logoutButton?.addEventListener("click", async () => {
    await window.ExclusiveAuth.logout();
    window.location.href = window.ExclusiveAuth.getAuthUrl({ mode: "login" });
  });
};

const initPage = async () => {
  const currentUser = window.ExclusiveAuth?.getCurrentUser?.();

  if (!currentUser) {
    const redirectTarget = `${window.location.pathname}${window.location.search}`;
    window.location.href = window.ExclusiveAuth.getAuthUrl({ mode: "login", redirect: redirectTarget });
    return;
  }

  window.ExclusiveStore?.mountCartBadge(headerCartBadge);
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
  if (adminLinkNode) {
    adminLinkNode.hidden = !window.ExclusiveAuth?.isAdminUser?.(currentUser);
  }
  renderMenuGroups();
  initMobileMenu();
  initEvents();
  await loadAccount();

  if (currentYearNode) {
    currentYearNode.textContent = String(new Date().getFullYear());
  }

  document.querySelectorAll("[data-telegram-link]").forEach((link) => {
    link.setAttribute("href", window.ExclusiveSiteConfig?.getTelegramBotUrl?.() || "https://t.me/");
  });
};

initPage();
