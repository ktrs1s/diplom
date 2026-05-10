const catalogApi = window.ExclusiveCatalog;
const favoritesApi = window.ExclusiveFavorites;
const productsNode = document.getElementById("favorites-products");
const emptyNode = document.getElementById("favorites-empty");
const menuGroupsNode = document.getElementById("catalog-drawer-tree");
const currentYearNode = document.getElementById("current-year");
const headerCartBadge = document.getElementById("header-cart-badge");
const profileLinks = document.querySelectorAll("[data-profile-link]");
const menuToggle = document.getElementById("catalog-header-toggle");
const mobileMenu = document.getElementById("catalog-drawer");
const mobileMenuClose = document.getElementById("catalog-drawer-close");
const mobileMenuBackdrop = document.getElementById("catalog-overlay");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const buildProductHref = (product) => {
  const returnUrl = "/favorites/";
  return `/product/?id=${encodeURIComponent(product.id)}&return=${encodeURIComponent(returnUrl)}`;
};

const renderProductCard = (product) => `
  <article class="catalog-card favorites-card" data-product-id="${escapeHtml(product.id)}">
    <button class="favorites-card__remove" type="button" data-remove-favorite="${escapeHtml(product.id)}" aria-label="Убрать из избранного">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6L18 18"></path>
        <path d="M18 6L6 18"></path>
      </svg>
    </button>
    <a class="catalog-card__media" href="${buildProductHref(product)}">
      <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
    </a>
    <div class="catalog-card__topline">
      <span>${escapeHtml(product.subTitle || product.categoryTitle || "")}</span>
      <span>${escapeHtml((product.sizes || []).join(" · "))}</span>
    </div>
    <a href="${buildProductHref(product)}">
      <h3 class="catalog-card__title">${escapeHtml(product.title)}</h3>
    </a>
    <span class="catalog-card__price">${escapeHtml(product.priceLabel || product.price || "")}</span>
  </article>
`;

const renderFavorites = () => {
  if (!productsNode || !emptyNode) {
    return;
  }

  const products = favoritesApi?.getFavoriteProducts?.() || [];
  productsNode.innerHTML = products.map(renderProductCard).join("");
  emptyNode.hidden = products.length > 0;
};

const renderMenuGroups = () => {
  if (!menuGroupsNode || !catalogApi) {
    return;
  }

  menuGroupsNode.innerHTML = catalogApi
    .getMenuGroups()
    .map((group) => `<a class="favorites-drawer-link" href="${group.href}">${escapeHtml(group.title)}</a>`)
    .join("");
};

const initMobileMenu = () => {
  if (!menuToggle || !mobileMenu || !mobileMenuClose || !mobileMenuBackdrop) {
    return;
  }

  const closeMenu = () => {
    document.body.classList.remove("drawer-open");
    mobileMenu.classList.remove("is-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    mobileMenuBackdrop.hidden = true;
  };

  const openMenu = () => {
    document.body.classList.add("drawer-open");
    mobileMenu.classList.add("is-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    mobileMenuBackdrop.hidden = false;
  };

  menuToggle.addEventListener("click", () => {
    if (document.body.classList.contains("drawer-open")) {
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

productsNode?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-favorite]");

  if (!button) {
    return;
  }

  favoritesApi?.removeFavorite?.(button.dataset.removeFavorite);
  renderFavorites();
});

if (currentYearNode) {
  currentYearNode.textContent = String(new Date().getFullYear());
}

renderMenuGroups();
renderFavorites();
initMobileMenu();
window.ExclusiveStore?.mountCartBadge(headerCartBadge);
window.ExclusiveAuth?.mountProfileLinks(profileLinks);
window.addEventListener(window.ExclusiveAuth?.AUTH_EVENT || "exclusive:authchange", () => {
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
});
catalogApi?.ready?.().then(() => {
  renderMenuGroups();
  renderFavorites();
});
window.addEventListener(window.ExclusiveCatalog?.CATALOG_EVENT || "exclusive:catalogchange", () => {
  renderMenuGroups();
  renderFavorites();
});
window.addEventListener(window.ExclusiveFavorites?.FAVORITES_EVENT || "exclusive:favoriteschange", renderFavorites);
