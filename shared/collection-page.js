const PRODUCT_PAGE_URL = "/product/";
const ITEMS_PER_PAGE = 20;

const catalogApi = window.ExclusiveCatalog;
const favoritesApi = window.ExclusiveFavorites;
const currentYearNode = document.getElementById("current-year");
const headerCartBadge = document.getElementById("header-cart-badge");
const profileLinks = document.querySelectorAll("[data-profile-link]");

const headerToggle = document.getElementById("catalog-header-toggle");
const drawerNode = document.getElementById("catalog-drawer");
const drawerClose = document.getElementById("catalog-drawer-close");
const overlayNode = document.getElementById("catalog-overlay");
const catalogTreeNode = document.getElementById("catalog-tree");
const drawerTreeNode = document.getElementById("catalog-drawer-tree");
const productsNode = document.getElementById("catalog-products");
const emptyNode = document.getElementById("catalog-empty");
const paginationNode = document.getElementById("catalog-pagination");
const pageTitleNode = document.getElementById("catalog-page-title");
const pageMetaDescriptionNode = document.getElementById("page-meta-description");
const breadcrumbCurrentNode = document.getElementById("breadcrumb-current");

const collectionKey = document.body?.dataset.collectionKey || "";
const collectionTitle = document.body?.dataset.collectionTitle || "Подборка";
const collectionDescription = document.body?.dataset.collectionDescription || "Подборка товаров EXCLUSIVE.";
let currentPageNumber = Number.parseInt(new URLSearchParams(window.location.search).get("pageNum") || "1", 10);

if (!Number.isFinite(currentPageNumber) || currentPageNumber < 1) {
  currentPageNumber = 1;
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const buildCollectionUrl = (pageNumber = 1) => {
  const params = new URLSearchParams();

  if (pageNumber > 1) {
    params.set("pageNum", String(pageNumber));
  }

  const query = params.toString();
  return query ? `${window.location.pathname}?${query}` : window.location.pathname;
};

const buildProductHref = (product) => {
  const returnUrl = buildCollectionUrl(currentPageNumber);
  return `${PRODUCT_PAGE_URL}?id=${encodeURIComponent(product.id)}&return=${encodeURIComponent(returnUrl)}`;
};

const renderFavoriteIcon = () => `
  <svg viewBox="0 0 24 25" aria-hidden="true">
    <path d="M12 20.5L4.9 13.4C3.7 12.2 3 10.64 3 8.97C3 5.56 7.04 3.83 9.5 6.15L12 8.5L14.5 6.15C16.96 3.83 21 5.56 21 8.97C21 10.64 20.3 12.2 19.1 13.4L12 20.5"></path>
  </svg>
`;

const renderFavoriteButton = (product) => {
  const isFavorite = favoritesApi?.hasFavorite?.(product.id) || false;

  return `
    <button
      class="catalog-card__favorite ${isFavorite ? "is-active" : ""}"
      type="button"
      data-favorite-product="${escapeHtml(product.id)}"
      aria-label="${isFavorite ? "Убрать из избранного" : "Добавить в избранное"}"
      aria-pressed="${String(isFavorite)}"
    >
      ${renderFavoriteIcon()}
    </button>
  `;
};

const getPaginationItems = (totalPages, currentPage) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const visiblePages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 3) {
    visiblePages.add(2);
    visiblePages.add(3);
    visiblePages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    visiblePages.add(totalPages - 1);
    visiblePages.add(totalPages - 2);
    visiblePages.add(totalPages - 3);
  }

  const orderedPages = [...visiblePages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((first, second) => first - second);

  return orderedPages.reduce((items, page) => {
    const previous = items[items.length - 1];

    if (typeof previous === "number" && page - previous > 1) {
      items.push("ellipsis");
    }

    items.push(page);
    return items;
  }, []);
};

const getProducts = () => {
  const collections = catalogApi?.getHomeCollections?.() || {};
  return Array.isArray(collections[collectionKey]) ? collections[collectionKey] : [];
};

let categories = catalogApi?.getCategories?.() || [];

const refreshCatalogContext = () => {
  categories = catalogApi?.getCategories?.() || [];
};

const getGroupedSubcategories = (categoryKey) => {
  const products = catalogApi?.getProducts?.({ categoryKey }) || [];
  const map = new Map();

  products.forEach((product) => {
    const subKey = product.subKey || "all";
    const subTitle = product.subTitle || "Все товары";

    if (subKey === "all") {
      return;
    }

    if (!map.has(subKey)) {
      map.set(subKey, { key: subKey, title: subTitle });
    }
  });

  return [...map.values()];
};

const buildCategoryUrl = (categoryKey = "", subKey = "all") => {
  const params = new URLSearchParams();

  if (categoryKey) {
    params.set("page", categoryKey);
  }

  if (subKey && subKey !== "all") {
    params.set("sub", subKey);
  }

  const query = params.toString();
  return query ? `/catalog/?${query}` : "/catalog/";
};

const renderCatalogTree = (target) => {
  if (!target) {
    return;
  }

  target.innerHTML = `
    <div class="catalog-tree">
      <a class="catalog-tree__link" href="/catalog/">
        <span>Все товары</span>
      </a>
      ${categories
        .map((category) => {
          const subcategories = getGroupedSubcategories(category.key);

          if (!subcategories.length) {
            return `
              <a class="catalog-tree__link" href="${buildCategoryUrl(category.key)}">
                <span>${escapeHtml(category.title)}</span>
              </a>
            `;
          }

          return `
            <details class="catalog-tree__details">
              <summary class="catalog-tree__summary">
                <span>${escapeHtml(category.title)}</span>
              </summary>
              <ul class="catalog-tree__sublist">
                <li>
                  <a href="${buildCategoryUrl(category.key)}">
                    Все товары
                  </a>
                </li>
                ${subcategories
                  .map(
                    (subcategory) => `
                      <li>
                        <a href="${buildCategoryUrl(category.key, subcategory.key)}">
                          ${escapeHtml(subcategory.title)}
                        </a>
                      </li>
                    `,
                  )
                  .join("")}
              </ul>
            </details>
          `;
        })
        .join("")}
    </div>
  `;
};

const renderCatalogTrees = () => {
  renderCatalogTree(catalogTreeNode);
  renderCatalogTree(drawerTreeNode);
};

const renderProductCard = (product) => `
  <article class="catalog-card">
    ${renderFavoriteButton(product)}
    <a class="catalog-card__media" href="${buildProductHref(product)}">
      <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
    </a>
    <div class="catalog-card__topline">
      <span>${escapeHtml(product.subTitle || product.categoryTitle)}</span>
      <span>${escapeHtml(product.sizes.join(" · "))}</span>
    </div>
    <a href="${buildProductHref(product)}">
      <h3 class="catalog-card__title">${escapeHtml(product.title)}</h3>
    </a>
    <span class="catalog-card__price">${product.priceLabel}</span>
  </article>
`;

const renderPagination = (totalItems) => {
  if (!paginationNode) {
    return;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  if (currentPageNumber > totalPages) {
    currentPageNumber = totalPages;
    window.history.replaceState({}, "", buildCollectionUrl(currentPageNumber));
  }

  if (totalPages <= 1) {
    paginationNode.style.display = "none";
    paginationNode.innerHTML = "";
    return;
  }

  const items = getPaginationItems(totalPages, currentPageNumber);

  paginationNode.style.display = "flex";
  paginationNode.innerHTML = `
    <div class="catalog-pagination__list">
      ${items
        .map((item) => {
          if (item === "ellipsis") {
            return `<span class="catalog-pagination__ellipsis">...</span>`;
          }

          return `
            <a class="catalog-pagination__link ${item === currentPageNumber ? "is-active" : ""}" href="${buildCollectionUrl(item)}">
              ${item}
            </a>
          `;
        })
        .join("")}
    </div>
  `;
};

const renderProducts = () => {
  if (!productsNode || !emptyNode) {
    return;
  }

  const products = getProducts();
  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));

  if (currentPageNumber > totalPages) {
    currentPageNumber = totalPages;
  }

  const startIndex = (currentPageNumber - 1) * ITEMS_PER_PAGE;
  const visibleProducts = products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  productsNode.innerHTML = visibleProducts.map(renderProductCard).join("");
  emptyNode.style.display = products.length === 0 ? "block" : "none";
  renderPagination(products.length);
};

const syncFavoriteButton = (button, isFavorite) => {
  button.classList.toggle("is-active", isFavorite);
  button.setAttribute("aria-pressed", String(isFavorite));
  button.setAttribute("aria-label", isFavorite ? "Убрать из избранного" : "Добавить в избранное");
};

const initFavoriteButtons = () => {
  productsNode?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-favorite-product]");

    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const isFavorite = favoritesApi?.toggleFavorite?.(button.dataset.favoriteProduct) ?? false;
    syncFavoriteButton(button, isFavorite);
  });
};

const renderPageMeta = () => {
  if (pageTitleNode) {
    pageTitleNode.textContent = collectionTitle;
  }

  if (breadcrumbCurrentNode) {
    breadcrumbCurrentNode.textContent = collectionTitle;
  }

  if (pageMetaDescriptionNode) {
    pageMetaDescriptionNode.setAttribute("content", collectionDescription);
  }

  const ogTitleNode = document.querySelector('meta[property="og:title"]');
  const ogDescriptionNode = document.querySelector('meta[property="og:description"]');

  if (ogTitleNode) {
    ogTitleNode.setAttribute("content", `${collectionTitle} | EXCLUSIVE`);
  }

  if (ogDescriptionNode) {
    ogDescriptionNode.setAttribute("content", collectionDescription);
  }

  document.title = `${collectionTitle} | EXCLUSIVE`;
};

const closeDrawer = () => {
  if (!drawerNode || !overlayNode) {
    return;
  }

  drawerNode.classList.remove("is-open");
  drawerNode.setAttribute("aria-hidden", "true");
  overlayNode.hidden = true;
  document.body.classList.remove("drawer-open");
};

const openDrawer = () => {
  if (!drawerNode || !overlayNode) {
    return;
  }

  drawerNode.classList.add("is-open");
  drawerNode.setAttribute("aria-hidden", "false");
  overlayNode.hidden = false;
  document.body.classList.add("drawer-open");
};

const initDrawer = () => {
  if (!headerToggle || !drawerNode || !drawerClose || !overlayNode) {
    return;
  }

  headerToggle.addEventListener("click", () => {
    if (drawerNode.classList.contains("is-open")) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  drawerClose.addEventListener("click", closeDrawer);
  overlayNode.addEventListener("click", closeDrawer);

  drawerNode.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });
};

const mountFooter = () => {
  if (currentYearNode) {
    currentYearNode.textContent = String(new Date().getFullYear());
  }
};

const mountCollectionPage = () => {
  refreshCatalogContext();
  renderPageMeta();
  renderCatalogTrees();
  renderProducts();
};

mountCollectionPage();
initFavoriteButtons();
initDrawer();
mountFooter();
window.ExclusiveStore?.mountCartBadge(headerCartBadge);
window.ExclusiveAuth?.mountProfileLinks(profileLinks);
window.addEventListener(window.ExclusiveAuth?.AUTH_EVENT || "exclusive:authchange", () => {
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
});
catalogApi?.ready?.().then(mountCollectionPage);
window.addEventListener(window.ExclusiveCatalog?.CATALOG_EVENT || "exclusive:catalogchange", mountCollectionPage);
window.addEventListener(favoritesApi?.FAVORITES_EVENT || "exclusive:favoriteschange", () => {
  document.querySelectorAll("[data-favorite-product]").forEach((button) => {
    syncFavoriteButton(button, favoritesApi?.hasFavorite?.(button.dataset.favoriteProduct) || false);
  });
});
