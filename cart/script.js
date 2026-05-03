const menuGroups = [
  {
    title: "Верхняя одежда",
    items: ["Пальто", "Куртки", "Ветровки", "Джинсовые куртки"],
    href: "../каталог/index.html?page=outerwear",
  },
  {
    title: "Джинсы",
    items: [],
    href: "../каталог/index.html?page=jeans",
  },
  {
    title: "Брюки",
    items: [],
    href: "../каталог/index.html?page=trousers",
  },
  {
    title: "Костюмы",
    items: ["Спортивные костюмы", "Классические костюмы", "Летние костюмы"],
    href: "../каталог/index.html?page=suits",
  },
  {
    title: "Джемперы и свитеры",
    items: [],
    href: "../каталог/index.html?page=knitwear",
  },
  {
    title: "Футболки, поло и лонгсливы",
    items: [],
    href: "../каталог/index.html?page=tops",
  },
  {
    title: "Обувь",
    items: ["Лето 2026", "Туфли", "Сапоги и ботильоны", "Кроссовки и кеды"],
    href: "../каталог/index.html?page=shoes",
  },
  {
    title: "Аксессуары",
    items: ["Шапки", "Кепки", "Платки", "Сумки", "Шарфы"],
    href: "../каталог/index.html?page=accessories",
  },
];

const drawerTreeNode = document.getElementById("cart-drawer-tree");
const currentYearNode = document.getElementById("current-year");
const cartItemsNode = document.getElementById("cart-items");
const emptyCartNode = document.getElementById("empty-cart");
const cartSummaryNode = document.getElementById("cart-summary");
const cartLayoutNode = document.querySelector(".cart-layout");
const headerCartBadge = document.getElementById("header-cart-badge");
const summarySubtotalNode = document.getElementById("summary-subtotal");
const summaryDeliveryNode = document.getElementById("summary-delivery");
const summaryTotalNode = document.getElementById("summary-total");
const deliveryNoteNode = document.getElementById("delivery-note");
const checkoutButton = document.getElementById("checkout-button");
const profileLinks = document.querySelectorAll("[data-profile-link]");

const headerToggle = document.getElementById("cart-header-toggle");
const drawerNode = document.getElementById("cart-drawer");
const drawerClose = document.getElementById("cart-drawer-close");
const overlayNode = document.getElementById("cart-overlay");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const setVisibility = (node, isVisible) => {
  if (!node) {
    return;
  }

  node.hidden = !isVisible;
};

const getDeliveryPrice = (subtotal) => {
  if (subtotal === 0 || subtotal >= window.ExclusiveStore.FREE_SHIPPING_THRESHOLD) {
    return 0;
  }

  return 490;
};

const formatCountLabel = (count) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return "позиция";
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "позиции";
  }

  return "позиций";
};

const renderDrawerTree = () => {
  if (!drawerTreeNode) {
    return;
  }

  drawerTreeNode.innerHTML = `
    <div class="cart-tree">
      ${menuGroups
        .map((group) => {
          if (!group.items.length) {
            return `<a class="cart-tree__link" href="${group.href}">${escapeHtml(group.title)}</a>`;
          }

          return `
            <details class="cart-tree__details">
              <summary class="cart-tree__summary">${escapeHtml(group.title)}</summary>
              <div class="cart-tree__sublist">
                ${group.items.map((item) => `<a href="${group.href}">${escapeHtml(item)}</a>`).join("")}
              </div>
            </details>
          `;
        })
        .join("")}
    </div>
  `;
};

const renderSummary = (items) => {
  const subtotal = window.ExclusiveStore.getSubtotal(items);
  const delivery = getDeliveryPrice(subtotal);
  const total = subtotal + delivery;
  const count = window.ExclusiveStore.getCartCount(items);

  if (summarySubtotalNode) {
    summarySubtotalNode.textContent = window.ExclusiveStore.formatPrice(subtotal);
  }

  if (summaryDeliveryNode) {
    summaryDeliveryNode.textContent = delivery === 0 ? "Бесплатно" : window.ExclusiveStore.formatPrice(delivery);
  }

  if (summaryTotalNode) {
    summaryTotalNode.textContent = window.ExclusiveStore.formatPrice(total);
  }

  if (!deliveryNoteNode) {
    return;
  }

  if (count === 0) {
    deliveryNoteNode.textContent = "Добавьте товары в корзину, чтобы увидеть итог заказа.";
    return;
  }

  if (subtotal >= window.ExclusiveStore.FREE_SHIPPING_THRESHOLD) {
    deliveryNoteNode.textContent = `В корзине ${count} ${formatCountLabel(count)}. Бесплатная доставка уже включена в заказ.`;
    return;
  }

  const leftToFreeShipping = window.ExclusiveStore.FREE_SHIPPING_THRESHOLD - subtotal;
  deliveryNoteNode.textContent = `До бесплатной доставки осталось ${window.ExclusiveStore.formatPrice(leftToFreeShipping)}.`;
};

const syncCheckoutButton = () => {
  if (!checkoutButton) {
    return;
  }

  const hasItems = window.ExclusiveStore.getCart().length > 0;
  const isAuthorized = window.ExclusiveAuth?.isAuthenticated?.() || false;

  checkoutButton.textContent = isAuthorized ? "Подтвердить в Telegram" : "Войти и продолжить";
  checkoutButton.classList.toggle("is-disabled", !hasItems);
  checkoutButton.setAttribute("aria-disabled", String(!hasItems));
};

const renderCartItems = (items) => {
  if (!cartItemsNode || !emptyCartNode || !cartSummaryNode) {
    return;
  }

  const hasItems = items.length > 0;
  setVisibility(emptyCartNode, !hasItems);
  setVisibility(cartSummaryNode, hasItems);
  setVisibility(cartItemsNode, hasItems);
  cartLayoutNode?.classList.toggle("cart-layout--empty", !hasItems);

  if (!hasItems) {
    cartItemsNode.innerHTML = "";
    renderSummary(items);
    syncCheckoutButton();
    return;
  }

  cartItemsNode.innerHTML = items
    .map((item) => {
      const lineTotal = item.priceValue * item.quantity;

      return `
        <article class="cart-item" data-line-id="${escapeHtml(item.lineId)}">
          <a class="cart-item__media" href="${item.href}">
            <img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy">
          </a>

          <div class="cart-item__content">
            <div class="cart-item__topline">
              <span>${escapeHtml(item.article || "EXCLUSIVE")}</span>
              <button class="cart-item__remove" type="button" data-remove-line="${escapeHtml(item.lineId)}">Удалить</button>
            </div>

            <a class="cart-item__title" href="${item.href}">${escapeHtml(item.title)}</a>

            <div class="cart-item__meta">
              <span class="cart-item__tag">Размер: ${escapeHtml(item.size)}</span>
              <span class="cart-item__tag">Цвет: ${escapeHtml(item.color)}</span>
            </div>

            <div class="cart-item__footer">
              <div class="cart-item__quantity" aria-label="Количество товара">
                <button type="button" data-quantity-action="decrease" data-line-id="${escapeHtml(item.lineId)}" aria-label="Уменьшить количество">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-quantity-action="increase" data-line-id="${escapeHtml(item.lineId)}" aria-label="Увеличить количество">+</button>
              </div>

              <div class="cart-item__prices">
                <span class="cart-item__price">${escapeHtml(item.priceLabel)}</span>
                <strong class="cart-item__total">${window.ExclusiveStore.formatPrice(lineTotal)}</strong>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  renderSummary(items);
  syncCheckoutButton();
};

const syncCartView = () => {
  renderCartItems(window.ExclusiveStore.getCart());
};

const initCartInteractions = () => {
  cartItemsNode?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-line]");

    if (removeButton) {
      window.ExclusiveStore.removeFromCart(removeButton.dataset.removeLine || "");
      return;
    }

    const quantityButton = event.target.closest("[data-quantity-action]");

    if (!quantityButton) {
      return;
    }

    const lineId = quantityButton.dataset.lineId || "";
    const action = quantityButton.dataset.quantityAction;
    const currentItem = window.ExclusiveStore.getCart().find((item) => item.lineId === lineId);

    if (!currentItem) {
      return;
    }

    if (action === "increase") {
      window.ExclusiveStore.updateQuantity(lineId, currentItem.quantity + 1);
      return;
    }

    if (action === "decrease") {
      window.ExclusiveStore.updateQuantity(lineId, currentItem.quantity - 1);
    }
  });

  window.addEventListener(window.ExclusiveStore.CART_EVENT, syncCartView);

  checkoutButton?.addEventListener("click", async (event) => {
    event.preventDefault();

    if (checkoutButton.getAttribute("aria-disabled") === "true") {
      return;
    }

    try {
      await window.ExclusiveCheckout?.beginCheckout({
        items: window.ExclusiveStore.getCart(),
      });
    } catch (error) {
      if (deliveryNoteNode) {
        deliveryNoteNode.textContent = error.message || "Не удалось перейти к оформлению.";
      }
    }
  });
};

const closeDrawer = () => {
  document.body.classList.remove("drawer-open");

  if (overlayNode) {
    overlayNode.hidden = true;
  }

  if (drawerNode) {
    drawerNode.setAttribute("aria-hidden", "true");
  }
};

const openDrawer = () => {
  document.body.classList.add("drawer-open");

  if (overlayNode) {
    overlayNode.hidden = false;
  }

  if (drawerNode) {
    drawerNode.setAttribute("aria-hidden", "false");
  }
};

const initDrawer = () => {
  if (!drawerNode || !overlayNode) {
    return;
  }

  headerToggle?.addEventListener("click", openDrawer);
  drawerClose?.addEventListener("click", closeDrawer);
  overlayNode.addEventListener("click", closeDrawer);

  drawerNode.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });
};

const initPage = () => {
  renderDrawerTree();
  syncCartView();
  initCartInteractions();
  initDrawer();
  window.ExclusiveStore.mountCartBadge(headerCartBadge);
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
  syncCheckoutButton();

  if (currentYearNode) {
    currentYearNode.textContent = String(new Date().getFullYear());
  }

  document.querySelectorAll("[data-telegram-link]").forEach((link) => {
    link.setAttribute("href", window.ExclusiveSiteConfig?.getTelegramBotUrl?.() || "https://t.me/");
  });

  if (window.ExclusiveCheckout?.consumePendingIntent?.() === "checkout" && window.ExclusiveStore.getCart().length > 0) {
    window.setTimeout(() => {
      checkoutButton?.click();
    }, 180);
  }
};

initPage();
window.addEventListener(window.ExclusiveAuth?.AUTH_EVENT || "exclusive:authchange", () => {
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
  syncCheckoutButton();
});
