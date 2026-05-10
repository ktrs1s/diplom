const CART_PAGE_URL = "/cart/";
const FALLBACK_RETURN_URL = "/catalog/";

const catalogApi = window.ExclusiveCatalog;
const favoritesApi = window.ExclusiveFavorites;
const params = new URLSearchParams(window.location.search);
const currentTemplateBase = window.location.pathname.includes("/product-alt/") ? "/product-alt/" : "/product/";

const menuGroupsNode = document.getElementById("mobile-menu-groups");
const currentYearNode = document.getElementById("current-year");
const mainImageNode = document.getElementById("product-main-image");
const thumbsNode = document.getElementById("product-thumbs");
const titleNode = document.getElementById("product-title");
const articleNode = document.getElementById("product-article");
const priceNode = document.getElementById("product-price");
const sizesNode = document.getElementById("product-sizes");
const colorsNode = document.getElementById("product-colors");
const metaNode = document.getElementById("product-meta");
const similarProductsNode = document.getElementById("similar-products");
const breadcrumbSectionNode = document.getElementById("product-breadcrumb-section");
const breadcrumbSectionSeparatorNode = document.getElementById("product-breadcrumb-section-separator");

const favoriteButton = document.getElementById("toggle-favorite");
const addToCartButton = document.getElementById("add-to-cart");
const headerCartBadge = document.getElementById("header-cart-badge");
const headerCartLink = document.getElementById("header-cart-link");
const headerFavoriteBadge = document.getElementById("header-favorite-badge");
const headerFavoriteLink = document.getElementById("header-favorite-link");
const profileLinks = document.querySelectorAll("[data-profile-link]");

const sizeGuideOpenButton = document.getElementById("size-guide-open");
const sizeModal = document.getElementById("size-modal");
const sizeModalBackdrop = document.getElementById("size-modal-backdrop");
const sizeModalCloseButton = document.getElementById("size-modal-close");
const sizeTableBody = document.querySelector("#size-table tbody");

const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");
const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");

const resolveProductData = () => {
  const fallbackProduct = catalogApi?.getProductById(params.get("id")) || catalogApi?.getProducts()?.[0] || null;
  return fallbackProduct
    ? {
        ...fallbackProduct,
        returnUrl: params.get("return") || `/catalog/?page=${encodeURIComponent(fallbackProduct.categoryKey)}`,
      }
    : null;
};

let productData = resolveProductData();

let activeImageIndex = 0;
let activeSize = productData?.sizes?.[0] || "ONE SIZE";
let activeColor = productData?.colors?.[0]?.name || "Базовый";
let isFavorite = favoritesApi?.hasFavorite?.(productData?.id) || false;

const syncProductFromCatalog = () => {
  const nextProduct = resolveProductData();

  if (!nextProduct) {
    productData = null;
    return;
  }

  const hasActiveSize = nextProduct.sizes?.includes(activeSize);
  const hasActiveColor = nextProduct.colors?.some((color) => color.name === activeColor);
  productData = nextProduct;
  activeImageIndex = Math.min(activeImageIndex, Math.max((productData.gallery?.length || 1) - 1, 0));
  activeSize = hasActiveSize ? activeSize : productData.sizes?.[0] || "ONE SIZE";
  activeColor = hasActiveColor ? activeColor : productData.colors?.[0]?.name || "Базовый";
  isFavorite = favoritesApi?.hasFavorite?.(productData?.id) || false;
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const getCurrentProductHref = () =>
  `${currentTemplateBase}?id=${encodeURIComponent(productData?.id || "")}&return=${encodeURIComponent(productData?.returnUrl || FALLBACK_RETURN_URL)}`;

const getCurrentLineDescriptor = () => ({
  productId: productData?.id,
  size: activeSize,
  color: activeColor,
});

const getProductSections = () => {
  if (!productData) {
    return [];
  }

  return [
    {
      title: "Характеристики",
      type: "features",
      open: true,
      items: Array.isArray(productData.features) ? productData.features : [],
    },
    {
      title: "Уход",
      type: "list",
      items: Array.isArray(productData.care) ? productData.care : [],
    },
    {
      title: "Состав",
      type: "text",
      items: productData.composition || "",
    },
  ];
};

const isSelectedVariantInCart = () => window.ExclusiveStore?.hasCartItem(getCurrentLineDescriptor()) || false;

const setBadgeState = (node, isVisible) => {
  if (!node) {
    return;
  }

  node.hidden = !isVisible;
};

const syncFavoriteState = () => {
  const favoriteCount = favoritesApi?.count?.() || 0;

  favoriteButton?.classList.toggle("is-active", isFavorite);
  favoriteButton?.setAttribute("aria-pressed", String(isFavorite));
  headerFavoriteLink?.classList.toggle("is-active", isFavorite);

  if (headerFavoriteBadge) {
    headerFavoriteBadge.textContent = String(favoriteCount);
  }

  setBadgeState(headerFavoriteBadge, favoriteCount > 0);
};

const syncCartState = () => {
  if (!addToCartButton) {
    return;
  }

  const itemInCart = isSelectedVariantInCart();
  addToCartButton.textContent = itemInCart ? "ДОБАВЛЕНО В КОРЗИНУ" : "ДОБАВИТЬ В КОРЗИНУ";
  addToCartButton.setAttribute("aria-pressed", String(itemInCart));
  addToCartButton.classList.toggle("is-added", itemInCart);
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

const renderBreadcrumbs = () => {
  if (!breadcrumbSectionNode || !breadcrumbSectionSeparatorNode || !productData) {
    return;
  }

  let sectionTitle = productData.categoryTitle || "";

  try {
    const returnUrl = new URL(productData.returnUrl || FALLBACK_RETURN_URL, window.location.origin);

    if (returnUrl.pathname.startsWith("/new/")) {
      sectionTitle = "Новинки";
    } else if (returnUrl.pathname.startsWith("/hit/")) {
      sectionTitle = "Хиты продаж";
    }
  } catch {
    sectionTitle = productData.categoryTitle || "";
  }

  const hasSection = Boolean(sectionTitle);
  breadcrumbSectionSeparatorNode.hidden = !hasSection;
  breadcrumbSectionNode.hidden = !hasSection;

  if (hasSection) {
    breadcrumbSectionNode.textContent = sectionTitle;
    breadcrumbSectionNode.setAttribute("href", productData.returnUrl);
  }
};

const updateMainImage = () => {
  const current = productData?.gallery?.[activeImageIndex];

  if (!mainImageNode || !current) {
    return;
  }

  mainImageNode.src = current.src;
  mainImageNode.alt = current.alt;
};

const renderThumbs = () => {
  if (!thumbsNode || !productData) {
    return;
  }

  thumbsNode.innerHTML = productData.gallery
    .map(
      (image, index) => `
        <button class="product-thumb ${index === activeImageIndex ? "is-active" : ""}" type="button" data-thumb-index="${index}" aria-label="${escapeHtml(image.alt)}">
          <img src="${image.src}" alt="${escapeHtml(image.alt)}" loading="lazy">
        </button>
      `,
    )
    .join("");
};

const renderSizes = () => {
  if (!sizesNode || !productData) {
    return;
  }

  sizesNode.innerHTML = productData.sizes
    .map(
      (size) => `
        <button class="product-size ${size === activeSize ? "is-active" : ""}" type="button" data-size="${size}">
          ${size}
        </button>
      `,
    )
    .join("");
};

const renderColors = () => {
  if (!colorsNode || !productData) {
    return;
  }

  colorsNode.innerHTML = productData.colors
    .map(
      (color) => `
        <button
          class="product-color ${color.name === activeColor ? "is-active" : ""}"
          type="button"
          data-color="${escapeHtml(color.name)}"
          style="--swatch: ${color.swatch};"
          aria-label="${escapeHtml(color.name)}"
          title="${escapeHtml(color.name)}"
        ></button>
      `,
    )
    .join("");
};

const renderMetaSections = () => {
  if (!metaNode) {
    return;
  }

  metaNode.innerHTML = getProductSections()
    .map((section) => {
      let content = "";

      if (section.type === "features") {
        content = `
          <div class="product-features">
            ${section.items
              .map(
                ([label, value]) => `
                  <div class="product-feature">
                    <span class="product-feature__label">${escapeHtml(label)}</span>
                    <p class="product-feature__value">${escapeHtml(value)}</p>
                  </div>
                `,
              )
              .join("")}
          </div>
        `;
      }

      if (section.type === "list") {
        content = `
          <ul class="product-care-list">
            ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        `;
      }

      if (section.type === "text") {
        content = `<p class="product-composition">${escapeHtml(section.items)}</p>`;
      }

      return `
        <details class="product-detail" ${section.open ? "open" : ""}>
          <summary class="product-detail__summary">${escapeHtml(section.title)}</summary>
          <div class="product-detail__content">${content}</div>
        </details>
      `;
    })
    .join("");
};

const renderSimilarProducts = () => {
  if (!similarProductsNode || !catalogApi || !productData) {
    return;
  }

  const products = catalogApi.getProducts({
    categoryKey: productData.categoryKey,
    excludeId: productData.id,
    limit: 4,
  });

  similarProductsNode.innerHTML = products
    .map((product) => {
      const href = `${currentTemplateBase}?id=${encodeURIComponent(product.id)}&return=${encodeURIComponent(productData.returnUrl)}`;
      return `
        <article class="similar-product">
          <a class="similar-product__media" href="${href}">
            <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
          </a>
          <a href="${href}">
            <h3 class="similar-product__title">${escapeHtml(product.title)}</h3>
          </a>
          <span class="similar-product__price">${product.priceLabel}</span>
        </article>
      `;
    })
    .join("");
};

const renderSizeTable = () => {
  if (!sizeTableBody || !productData) {
    return;
  }

  sizeTableBody.innerHTML = productData.sizeTable
    .map(
      (row) => `
        <tr>
          ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
        </tr>
      `,
    )
    .join("");
};

const mountProduct = () => {
  syncProductFromCatalog();

  if (!productData) {
    return;
  }

  document.title = `${productData.title} | EXCLUSIVE`;

  const metaDescription = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');

  if (metaDescription) {
    metaDescription.setAttribute("content", `${productData.title}. Размеры, состав, уход и похожие модели в EXCLUSIVE.`);
  }

  if (ogTitle) {
    ogTitle.setAttribute("content", `${productData.title} | EXCLUSIVE`);
  }

  if (ogDescription) {
    ogDescription.setAttribute("content", `${productData.title}. Размеры, состав, уход и похожие модели в EXCLUSIVE.`);
  }

  if (titleNode) {
    titleNode.textContent = productData.title;
  }

  if (articleNode) {
    articleNode.textContent = productData.article;
  }

  if (priceNode) {
    priceNode.textContent = productData.priceLabel;
  }

  renderMenuGroups();
  renderBreadcrumbs();
  renderThumbs();
  updateMainImage();
  renderSizes();
  renderColors();
  renderMetaSections();
  renderSimilarProducts();
  renderSizeTable();

  if (currentYearNode) {
    currentYearNode.textContent = String(new Date().getFullYear());
  }

  if (headerCartLink) {
    headerCartLink.setAttribute("href", CART_PAGE_URL);
  }

  window.ExclusiveStore?.mountCartBadge(headerCartBadge);
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
  syncFavoriteState();
  syncCartState();
};

const openModal = () => {
  if (!sizeModal) {
    return;
  }

  document.body.classList.add("modal-open");
  sizeModal.hidden = false;
};

const closeModal = () => {
  if (!sizeModal) {
    return;
  }

  document.body.classList.remove("modal-open");
  sizeModal.hidden = true;
};

const handleAddToCartClick = (event) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  if (!window.ExclusiveStore || !productData) {
    return;
  }

  if (isSelectedVariantInCart()) {
    syncCartState();
    return;
  }

  const lineId = window.ExclusiveStore.createLineId(getCurrentLineDescriptor());

  window.ExclusiveStore.addToCart({
    lineId,
    productId: productData.id,
    title: productData.title,
    article: productData.article,
    image: productData.gallery[0]?.src || productData.image || "",
    href: getCurrentProductHref(),
    size: activeSize,
    color: activeColor,
    priceValue: window.ExclusiveStore.normalizePrice(productData.priceValue),
    priceLabel: productData.priceLabel,
    quantity: 1,
  });

  syncCartState();
};

const initProductInteractions = () => {
  thumbsNode?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-thumb-index]");

    if (!button) {
      return;
    }

    activeImageIndex = Number.parseInt(button.dataset.thumbIndex || "0", 10);
    renderThumbs();
    updateMainImage();
  });

  sizesNode?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-size]");

    if (!button) {
      return;
    }

    activeSize = button.dataset.size || activeSize;
    renderSizes();
    syncCartState();
  });

  colorsNode?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-color]");

    if (!button) {
      return;
    }

    activeColor = button.dataset.color || activeColor;
    renderColors();
    syncCartState();
  });

  favoriteButton?.addEventListener("click", () => {
    isFavorite = favoritesApi?.toggleFavorite?.(productData?.id) ?? !isFavorite;
    syncFavoriteState();
  });

  addToCartButton?.addEventListener("click", handleAddToCartClick, { capture: true });

  sizeGuideOpenButton?.addEventListener("click", openModal);
  sizeModalCloseButton?.addEventListener("click", closeModal);
  sizeModalBackdrop?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
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

mountProduct();
initProductInteractions();
initMobileMenu();
window.ExclusiveStore && window.addEventListener(window.ExclusiveStore.CART_EVENT, syncCartState);
window.addEventListener(favoritesApi?.FAVORITES_EVENT || "exclusive:favoriteschange", () => {
  isFavorite = favoritesApi?.hasFavorite?.(productData?.id) || false;
  syncFavoriteState();
});
window.addEventListener(window.ExclusiveAuth?.AUTH_EVENT || "exclusive:authchange", () => {
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
});
catalogApi?.ready?.().then(mountProduct);
window.addEventListener(window.ExclusiveCatalog?.CATALOG_EVENT || "exclusive:catalogchange", mountProduct);
