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

const NOTICE_TIMEOUT_MS = 2400;
let noticeTimer = 0;

const setNotice = (message, type = "") => {
  if (!noticeNode) {
    return;
  }

  if (noticeTimer) {
    window.clearTimeout(noticeTimer);
    noticeTimer = 0;
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

  if (type !== "error") {
    noticeTimer = window.setTimeout(() => {
      setNotice("");
    }, NOTICE_TIMEOUT_MS);
  }
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const getPhoneDigits = (value) => {
  let digits = String(value || "").replace(/[^\d]/g, "");

  if (digits.startsWith("7") || digits.startsWith("8")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
};

const formatPhoneInput = (value) => {
  const digits = getPhoneDigits(value);
  let result = "+7";

  if (!digits) {
    return result;
  }

  result += ` (${digits.slice(0, 3)}`;

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

const bindPhoneMask = (input) => {
  if (!input) {
    return;
  }

  const applyMask = () => {
    input.value = formatPhoneInput(input.value);
  };

  input.addEventListener("focus", applyMask);
  input.addEventListener("input", applyMask);
  input.addEventListener("keydown", (event) => {
    if (!["Backspace", "Delete"].includes(event.key)) {
      return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;

    if (start !== end) {
      return;
    }

    const rawValue = input.value;
    const digits = getPhoneDigits(rawValue);
    const digitsBeforeCursor = getPhoneDigits(rawValue.slice(0, start)).length;
    const targetIndex = event.key === "Backspace" ? start - 1 : start;
    const targetChar = rawValue[targetIndex] || "";

    if (start <= 2 && event.key === "Backspace") {
      event.preventDefault();
      input.value = "+7";
      return;
    }

    if (targetChar && /\D/.test(targetChar)) {
      event.preventDefault();
      const removeIndex = event.key === "Backspace" ? digitsBeforeCursor - 1 : digitsBeforeCursor;

      if (removeIndex < 0 || removeIndex >= digits.length) {
        return;
      }

      const nextDigits = `${digits.slice(0, removeIndex)}${digits.slice(removeIndex + 1)}`;
      input.value = formatPhoneInput(nextDigits);
      const nextCaret = Math.max(2, Math.min(input.value.length, start - (event.key === "Backspace" ? 1 : 0)));

      window.requestAnimationFrame(() => {
        input.setSelectionRange(nextCaret, nextCaret);
      });
    }
  });

  applyMask();
};

const renderOrders = (orders) => {
  if (!ordersNode || !emptyOrdersNode) {
    return;
  }

  const completedOrders = (orders || []).filter((order) => order.status === "completed");

  if (!completedOrders.length) {
    ordersNode.innerHTML = "";
    emptyOrdersNode.hidden = false;
    return;
  }

  emptyOrdersNode.hidden = true;
  ordersNode.innerHTML = completedOrders
    .map((order) => {
      const dateValue = order.createdAt ? new Date(order.createdAt).toLocaleDateString("ru-RU") : "";
      const orderItems = Array.isArray(order.items) ? order.items : [];
      const thumbnails = orderItems
        .slice(0, 4)
        .map((item) => {
          const productImage = catalogApi?.getProductById?.(item.productId)?.image || "";
          if (!productImage) {
            return "";
          }

          return `
            <figure class="account-order__thumb">
              <img src="${escapeHtml(productImage)}" alt="${escapeHtml(item.title || "Товар EXCLUSIVE")}" loading="lazy">
            </figure>
          `;
        })
        .join("");
      const extraCount = Math.max(0, orderItems.length - 4);

      return `
        <article class="account-order">
          <div class="account-order__head">
            <div class="account-order__copy">
              <h3 class="account-order__date">Заказ от ${escapeHtml(dateValue || "Без даты")}</h3>
              <p class="account-order__id">${escapeHtml(order.id || "Заказ EXCLUSIVE")}</p>
            </div>
            <strong class="account-order__total">${window.ExclusiveStore?.formatPrice(order.total || 0) || `${order.total || 0} ₽`}</strong>
          </div>
          <div class="account-order__gallery" ${thumbnails ? "" : "hidden"}>
            ${thumbnails}
            ${extraCount ? `<span class="account-order__more">+${extraCount}</span>` : ""}
          </div>
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
    if (/сессия/i.test(String(error.message || ""))) {
      await window.ExclusiveAuth.logout();
      const redirectTarget = `${window.location.pathname}${window.location.search}`;
      window.location.href = window.ExclusiveAuth.getAuthUrl({ mode: "login", redirect: redirectTarget });
      return;
    }

    setNotice(error.message || "Не удалось загрузить кабинет.", "error");
  }
};

const initEvents = () => {
  bindPhoneMask(phoneInput);

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
      setNotice("Успешно.");
    } catch (error) {
      if (/сессия/i.test(String(error.message || ""))) {
        await window.ExclusiveAuth.logout();
        const redirectTarget = `${window.location.pathname}${window.location.search}`;
        window.location.href = window.ExclusiveAuth.getAuthUrl({ mode: "login", redirect: redirectTarget });
        return;
      }

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
  await catalogApi?.ready?.();
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
