const PRODUCT_PAGE_URL = "/product/";
const urlParams = new URLSearchParams(window.location.search);
const pageQueryKey = urlParams.get("page");
const ITEMS_PER_PAGE = 20;

const catalogApi = window.ExclusiveCatalog;

const breadcrumbCatalogLinkNode = document.getElementById("breadcrumb-catalog-link");
const breadcrumbCurrentSeparatorNode = document.getElementById("breadcrumb-current-separator");
const breadcrumbCurrentNode = document.getElementById("breadcrumb-current");
const pageTitleNode = document.getElementById("catalog-page-title");
const pageMetaDescriptionNode = document.getElementById("page-meta-description");
const catalogTreeNode = document.getElementById("catalog-tree");
const catalogDrawerTreeNode = document.getElementById("catalog-drawer-tree");
const catalogProductsNode = document.getElementById("catalog-products");
const catalogEmptyNode = document.getElementById("catalog-empty");
const catalogPaginationNode = document.getElementById("catalog-pagination");
const currentYearNode = document.getElementById("current-year");
const headerCartBadge = document.getElementById("header-cart-badge");
const profileLinks = document.querySelectorAll("[data-profile-link]");

const headerToggle = document.getElementById("catalog-header-toggle");
const drawerNode = document.getElementById("catalog-drawer");
const drawerClose = document.getElementById("catalog-drawer-close");
const overlayNode = document.getElementById("catalog-overlay");
let catalogRefreshHandled = false;

let activeFilter = urlParams.get("sub") || "all";
let currentPageNumber = Number.parseInt(urlParams.get("pageNum") || "1", 10);

if (!Number.isFinite(currentPageNumber) || currentPageNumber < 1) {
  currentPageNumber = 1;
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const categories = catalogApi?.getCategories() || [];
const categoriesMap = new Map(categories.map((category) => [category.key, category]));
const currentCategory = categoriesMap.get(pageQueryKey || "") || null;

const getCurrentProducts = () => {
  if (!catalogApi) {
    return [];
  }

  return currentCategory ? catalogApi.getProducts({ categoryKey: currentCategory.key }) : catalogApi.getProducts();
};

const getGroupedSubcategories = (categoryKey) => {
  const products = catalogApi?.getProducts({ categoryKey }) || [];
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

const buildProductHref = (product) => {
  const returnUrl = buildCategoryUrl(product.categoryKey, product.subKey || "all");
  return `${PRODUCT_PAGE_URL}?id=${encodeURIComponent(product.id)}&return=${encodeURIComponent(returnUrl)}`;
};

const normalizeFilter = (subcategories) => {
  if (!subcategories.length) {
    activeFilter = "all";
    return;
  }

  if (activeFilter === "all") {
    return;
  }

  const valid = subcategories.some((subcategory) => subcategory.key === activeFilter);
  if (!valid) {
    activeFilter = "all";
  }
};

const getFilteredProducts = () => {
  const products = getCurrentProducts();

  if (!currentCategory) {
    activeFilter = "all";
    return products;
  }

  const subcategories = getGroupedSubcategories(currentCategory.key);
  normalizeFilter(subcategories);

  if (activeFilter === "all") {
    return products;
  }

  return products.filter((product) => product.subKey === activeFilter);
};

const buildPageUrl = (pageNumber) => {
  const params = new URLSearchParams(window.location.search);

  if (pageNumber <= 1) {
    params.delete("pageNum");
  } else {
    params.set("pageNum", String(pageNumber));
  }

  const query = params.toString();
  return query ? `/catalog/?${query}` : "/catalog/";
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

const renderPagination = (totalItems) => {
  if (!catalogPaginationNode) {
    return;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  if (currentPageNumber > totalPages) {
    currentPageNumber = totalPages;
    window.history.replaceState({}, "", buildPageUrl(currentPageNumber));
  }

  if (totalPages <= 1) {
    catalogPaginationNode.style.display = "none";
    catalogPaginationNode.innerHTML = "";
    return;
  }

  const items = getPaginationItems(totalPages, currentPageNumber);

  catalogPaginationNode.style.display = "flex";
  catalogPaginationNode.innerHTML = `
    <div class="catalog-pagination__list">
      ${items
        .map((item) => {
          if (item === "ellipsis") {
            return `<span class="catalog-pagination__ellipsis">...</span>`;
          }

          return `
            <a class="catalog-pagination__link ${item === currentPageNumber ? "is-active" : ""}" href="${buildPageUrl(item)}">
              ${item}
            </a>
          `;
        })
        .join("")}
    </div>
  `;
};

const renderCatalogTree = (target) => {
  if (!target) {
    return;
  }

  target.innerHTML = `
    <div class="catalog-tree">
      <a class="catalog-tree__link ${!currentCategory ? "is-active" : ""}" href="/catalog/">
        <span>Все товары</span>
      </a>
      ${categories
        .map((category) => {
          const subcategories = getGroupedSubcategories(category.key);
          const isCurrentCategory = currentCategory?.key === category.key;

          if (!subcategories.length) {
            return `
              <a class="catalog-tree__link ${isCurrentCategory ? "is-active" : ""}" href="${buildCategoryUrl(category.key)}">
                <span>${escapeHtml(category.title)}</span>
              </a>
            `;
          }

          return `
            <details class="catalog-tree__details" ${isCurrentCategory ? "open" : ""}>
              <summary class="catalog-tree__summary ${isCurrentCategory ? "is-active" : ""}">
                <span>${escapeHtml(category.title)}</span>
              </summary>
              <ul class="catalog-tree__sublist">
                <li>
                  <a class="${isCurrentCategory && activeFilter === "all" ? "is-active" : ""}" href="${buildCategoryUrl(category.key)}">
                    Все товары
                  </a>
                </li>
                ${subcategories
                  .map(
                    (subcategory) => `
                      <li>
                        <a class="${isCurrentCategory && activeFilter === subcategory.key ? "is-active" : ""}" href="${buildCategoryUrl(category.key, subcategory.key)}">
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

const renderProductCard = (product) => `
  <article class="catalog-card">
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

const renderProducts = () => {
  if (!catalogProductsNode || !catalogEmptyNode) {
    return;
  }

  const products = getFilteredProducts();
  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));

  if (currentPageNumber > totalPages) {
    currentPageNumber = totalPages;
  }

  const startIndex = (currentPageNumber - 1) * ITEMS_PER_PAGE;
  const visibleProducts = products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  catalogProductsNode.innerHTML = visibleProducts.map(renderProductCard).join("");
  catalogEmptyNode.style.display = products.length === 0 ? "block" : "none";
  renderPagination(products.length);
};

const renderPageMeta = () => {
  const title = currentCategory?.title || "Каталог";
  const description = currentCategory?.description || "Каталог EXCLUSIVE: женская одежда, обувь и аксессуары.";

  if (pageTitleNode) {
    pageTitleNode.textContent = title;
  }

  if (pageMetaDescriptionNode) {
    pageMetaDescriptionNode.setAttribute("content", description);
  }

  const ogTitleNode = document.querySelector('meta[property="og:title"]');
  const ogDescriptionNode = document.querySelector('meta[property="og:description"]');

  if (ogTitleNode) {
    ogTitleNode.setAttribute("content", `${title} | EXCLUSIVE`);
  }

  if (ogDescriptionNode) {
    ogDescriptionNode.setAttribute("content", description);
  }

  document.title = `${title} | EXCLUSIVE`;

    if (breadcrumbCatalogLinkNode) {
      breadcrumbCatalogLinkNode.setAttribute("href", "/catalog/");
    }

  if (breadcrumbCurrentSeparatorNode && breadcrumbCurrentNode) {
    const hasCurrentCategory = Boolean(currentCategory);
    breadcrumbCurrentSeparatorNode.hidden = !hasCurrentCategory;
    breadcrumbCurrentNode.hidden = !hasCurrentCategory;
    breadcrumbCurrentNode.textContent = hasCurrentCategory ? currentCategory.title : "";
  }
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

  document.querySelectorAll("[data-telegram-link]").forEach((link) => {
    link.setAttribute("href", window.ExclusiveSiteConfig?.getTelegramBotUrl?.() || "https://t.me/");
  });
};

renderPageMeta();
renderCatalogTree(catalogTreeNode);
renderCatalogTree(catalogDrawerTreeNode);
renderProducts();
initDrawer();
mountFooter();
window.ExclusiveStore?.mountCartBadge(headerCartBadge);
window.ExclusiveAuth?.mountProfileLinks(profileLinks);
window.addEventListener(window.ExclusiveAuth?.AUTH_EVENT || "exclusive:authchange", () => {
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
});
window.addEventListener(window.ExclusiveCatalog?.CATALOG_EVENT || "exclusive:catalogchange", () => {
  if (catalogRefreshHandled) {
    return;
  }

  catalogRefreshHandled = true;
  window.location.reload();
});
