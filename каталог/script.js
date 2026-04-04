const DEFAULT_TELEGRAM_URL = "https://t.me/";
const PRODUCT_PAGE_URL = "../страница товара/index.html";
const urlParams = new URLSearchParams(window.location.search);
const pageQueryKey = urlParams.get("page");
const ITEMS_PER_PAGE = 20;

const pageConfigs = {
  catalog: {
    title: "Каталог",
    description: "Каталог EXCLUSIVE: женская одежда, обувь и аксессуары.",
  },
  outerwear: {
    title: "Верхняя одежда",
    description: "Пальто, куртки, ветровки и джинсовые куртки EXCLUSIVE.",
    sectionKey: "outerwear",
  },
  jeans: {
    title: "Джинсы",
    description: "Женские джинсы EXCLUSIVE в базовой и современной посадке.",
    sectionKey: "jeans",
  },
  trousers: {
    title: "Брюки",
    description: "Брюки EXCLUSIVE для повседневных и более собранных образов.",
    sectionKey: "trousers",
  },
  suits: {
    title: "Костюмы",
    description: "Спортивные, классические и летние костюмы EXCLUSIVE.",
    sectionKey: "suits",
  },
  knitwear: {
    title: "Джемперы и свитеры",
    description: "Мягкий трикотаж EXCLUSIVE в спокойной сезонной палитре.",
    sectionKey: "knitwear",
  },
  tops: {
    title: "Футболки, поло и лонгсливы",
    description: "Базовый верх EXCLUSIVE для ежедневного гардероба.",
    sectionKey: "tops",
  },
  shoes: {
    title: "Обувь",
    description: "Летняя обувь, туфли, сапоги, ботильоны, кроссовки и кеды EXCLUSIVE.",
    sectionKey: "shoes",
  },
  accessories: {
    title: "Аксессуары",
    description: "Шапки, кепки, платки, сумки и шарфы EXCLUSIVE.",
    sectionKey: "accessories",
  },
};

const sections = [
  {
    key: "outerwear",
    title: "Верхняя одежда",
    href: "index.html?page=outerwear",
    palette: ["#efe3d8", "#c7ac95"],
    subcategories: [
      { key: "palto", title: "Пальто", itemLabel: "Пальто", count: 5, basePrice: 6990, step: 420, sizes: ["S", "M", "L"], swatch: "#d2b49c", palette: ["#f4e9df", "#ccb29c"] },
      { key: "kurtki", title: "Куртки", itemLabel: "Куртка", count: 15, basePrice: 4590, step: 320, sizes: ["S", "M", "L"], swatch: "#8b5f49", palette: ["#d8c1b1", "#8b5f49"] },
      { key: "vetrovki", title: "Ветровки", itemLabel: "Ветровка", count: 7, basePrice: 3490, step: 260, sizes: ["S", "M", "L"], swatch: "#c7b099", palette: ["#f0e4d6", "#c7b099"] },
      { key: "denim-jackets", title: "Джинсовые куртки", itemLabel: "Джинсовая куртка", count: 3, basePrice: 3990, step: 340, sizes: ["S", "M"], swatch: "#7f9db9", palette: ["#dbe7ef", "#7f9db9"] },
    ],
  },
  {
    key: "jeans",
    title: "Джинсы",
    href: "index.html?page=jeans",
    palette: ["#dce8ef", "#7c9db6"],
    subcategories: [
      { key: "all", title: "Все товары", itemLabel: "Джинсы", count: 20, basePrice: 2990, step: 250, sizes: ["25", "26", "27", "28", "29"], swatch: "#7798b4", palette: ["#dce8ef", "#7c9db6"] },
    ],
  },
  {
    key: "trousers",
    title: "Брюки",
    href: "index.html?page=trousers",
    palette: ["#efe7da", "#b2a088"],
    subcategories: [
      { key: "all", title: "Все товары", itemLabel: "Брюки", count: 12, basePrice: 2690, step: 240, sizes: ["S", "M", "L"], swatch: "#9f9f9f", palette: ["#efede8", "#b6b6b6"] },
    ],
  },
  {
    key: "suits",
    title: "Костюмы",
    href: "index.html?page=suits",
    palette: ["#e3e8d1", "#9daa70"],
    subcategories: [
      { key: "sport", title: "Спортивные костюмы", itemLabel: "Спортивный костюм", count: 4, basePrice: 3990, step: 300, sizes: ["S", "M", "L"], swatch: "#87936b", palette: ["#e5ead6", "#97a36d"] },
      { key: "classic", title: "Классические костюмы", itemLabel: "Классический костюм", count: 4, basePrice: 4990, step: 360, sizes: ["S", "M", "L"], swatch: "#786157", palette: ["#e4d8d2", "#8d6f64"] },
      { key: "summer", title: "Летние костюмы", itemLabel: "Летний костюм", count: 4, basePrice: 3790, step: 260, sizes: ["S", "M"], swatch: "#d3c0a2", palette: ["#f3ead8", "#ccb18e"] },
    ],
  },
  {
    key: "knitwear",
    title: "Джемперы и свитеры",
    href: "index.html?page=knitwear",
    palette: ["#f4e7eb", "#caabb5"],
    subcategories: [
      { key: "all", title: "Все товары", itemLabel: "Джемпер", count: 12, basePrice: 2490, step: 220, sizes: ["ONE SIZE"], swatch: "#d7b4be", palette: ["#f6ecef", "#d8b3bf"] },
    ],
  },
  {
    key: "tops",
    title: "Футболки, поло и лонгсливы",
    href: "index.html?page=tops",
    palette: ["#efe4da", "#bc9b87"],
    subcategories: [
      { key: "all", title: "Все товары", itemLabel: "Лонгслив", count: 12, basePrice: 1490, step: 130, sizes: ["S", "M", "L"], swatch: "#c39b84", palette: ["#f4e7df", "#c7a08c"] },
    ],
  },
  {
    key: "shoes",
    title: "Обувь",
    href: "index.html?page=shoes",
    palette: ["#ece9e4", "#8b7c73"],
    subcategories: [
      { key: "summer-2026", title: "Лето 2026", itemLabel: "Летняя обувь", count: 28, basePrice: 2490, step: 160, sizes: ["36", "37", "38", "39", "40"], swatch: "#d0c0a8", palette: ["#f5eee3", "#d4c1a4"] },
      { key: "heels", title: "Туфли", itemLabel: "Туфли", count: 35, basePrice: 4290, step: 200, sizes: ["36", "37", "38", "39", "40"], swatch: "#503f3a", palette: ["#e8ddd8", "#6e5b56"] },
      { key: "boots", title: "Сапоги и ботильоны", itemLabel: "Сапоги", count: 30, basePrice: 4990, step: 240, sizes: ["36", "37", "38", "39", "40"], swatch: "#2f2f2f", palette: ["#e0dfdf", "#444444"] },
      { key: "sneakers", title: "Кроссовки и кеды", itemLabel: "Кроссовки", count: 19, basePrice: 2890, step: 170, sizes: ["36", "37", "38", "39", "40"], swatch: "#f5f5f5", palette: ["#ffffff", "#dadada"] },
    ],
  },
  {
    key: "accessories",
    title: "Аксессуары",
    href: "index.html?page=accessories",
    palette: ["#f0ebe4", "#a7927e"],
    subcategories: [
      { key: "hats", title: "Шапки", itemLabel: "Шапка", count: 10, basePrice: 1190, step: 100, sizes: ["ONE SIZE"], swatch: "#b6a08c", palette: ["#eee8dd", "#c4af99"] },
      { key: "caps", title: "Кепки", itemLabel: "Кепка", count: 6, basePrice: 1390, step: 100, sizes: ["ONE SIZE"], swatch: "#9a8d83", palette: ["#ebe6df", "#b1a39a"] },
      { key: "scarves-light", title: "Платки", itemLabel: "Платок", count: 7, basePrice: 1490, step: 110, sizes: ["ONE SIZE"], swatch: "#d0b6bf", palette: ["#f7edf1", "#d5b7c1"] },
      { key: "bags", title: "Сумки", itemLabel: "Сумка", count: 18, basePrice: 2390, step: 180, sizes: ["ONE SIZE"], swatch: "#8f6e5a", palette: ["#ead8cc", "#9a775f"] },
      { key: "scarves", title: "Шарфы", itemLabel: "Шарф", count: 11, basePrice: 1290, step: 100, sizes: ["ONE SIZE"], swatch: "#cabba5", palette: ["#f3eddf", "#c7b28e"] },
    ],
  },
];

const titleSuffixes = [
  "из коллекции весна 2026",
  "для базового гардероба",
  "в мягком силуэте",
  "в новой палитре сезона",
];

const sectionsMap = Object.fromEntries(sections.map((section) => [section.key, section]));
const pageKey = pageQueryKey || document.body.dataset.page || "catalog";
const pageConfig = pageConfigs[pageKey] || pageConfigs.catalog;

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

const headerToggle = document.getElementById("catalog-header-toggle");
const drawerNode = document.getElementById("catalog-drawer");
const drawerClose = document.getElementById("catalog-drawer-close");
const overlayNode = document.getElementById("catalog-overlay");

let activeFilter = urlParams.get("sub") || "all";
let currentPageNumber = Number.parseInt(urlParams.get("pageNum") || "1", 10);

if (!Number.isFinite(currentPageNumber) || currentPageNumber < 1) {
  currentPageNumber = 1;
}

const moneyFormatter = new Intl.NumberFormat("ru-RU");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const createDataUriSvg = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const createProductPlaceholder = (label, palette) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200">
      <defs>
        <linearGradient id="catalog-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="100%" stop-color="${palette[1]}"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1200" fill="url(#catalog-bg)"/>
      <circle cx="738" cy="170" r="124" fill="rgba(255,255,255,0.16)"/>
      <circle cx="110" cy="1010" r="170" fill="rgba(255,255,255,0.1)"/>
      <text x="50%" y="48%" text-anchor="middle" fill="#242424" font-family="Arial, sans-serif" font-size="62" font-weight="400">${label}</text>
      <text x="50%" y="56%" text-anchor="middle" fill="#414141" font-family="Arial, sans-serif" font-size="28">замените на свое изображение</text>
    </svg>
  `;

  return createDataUriSvg(svg);
};

const formatPrice = (value) => `${moneyFormatter.format(value)} ₽`;
const getSectionTotal = (section) => section.subcategories.reduce((sum, subcategory) => sum + subcategory.count, 0);
const hasNestedCategories = (section) => section.subcategories.length > 1;

const allProductsCache = new Map();

const buildSectionLink = (section, subcategoryKey = "all") => {
  if (!subcategoryKey || subcategoryKey === "all") {
    return section.href;
  }

  return `${section.href}&sub=${subcategoryKey}`;
};

const buildProductLink = (section, subcategoryKey = "all") => {
  const returnUrl = `../каталог/${buildSectionLink(section, subcategoryKey)}`;
  return `${PRODUCT_PAGE_URL}?return=${encodeURIComponent(returnUrl)}`;
};

const getSectionProducts = (section) => {
  if (allProductsCache.has(section.key)) {
    return allProductsCache.get(section.key);
  }

  const products = section.subcategories.flatMap((subcategory) => {
    const image = createProductPlaceholder(subcategory.itemLabel.toUpperCase(), subcategory.palette || section.palette);

    return Array.from({ length: subcategory.count }, (_, index) => {
      const number = String(index + 1).padStart(2, "0");
      const suffix = titleSuffixes[index % titleSuffixes.length];

      return {
        id: `${section.key}-${subcategory.key}-${number}`,
        sectionKey: section.key,
        sectionTitle: section.title,
        subKey: subcategory.key,
        subTitle: subcategory.title,
        title: `${subcategory.itemLabel} EXCLUSIVE ${number} ${suffix}`,
        price: formatPrice(subcategory.basePrice + (index % 5) * subcategory.step),
        sizes: subcategory.sizes.join(" · "),
        swatch: subcategory.swatch,
        image,
        href: buildProductLink(section, hasNestedCategories(section) ? subcategory.key : "all"),
      };
    });
  });

  allProductsCache.set(section.key, products);
  return products;
};

const allCatalogProducts = sections.flatMap((section) => getSectionProducts(section));
const getCurrentSection = () => (pageConfig.sectionKey ? sectionsMap[pageConfig.sectionKey] : null);
const getCurrentSectionTitle = () => getCurrentSection()?.title || "";

const normalizeFilter = (section) => {
  if (!section || !hasNestedCategories(section)) {
    activeFilter = "all";
    return;
  }

  const hasFilter = section.subcategories.some((subcategory) => subcategory.key === activeFilter);
  if (!hasFilter) {
    activeFilter = "all";
  }
};

const getFilteredProducts = () => {
  const section = getCurrentSection();

  if (!section) {
    activeFilter = "all";
    return allCatalogProducts;
  }

  normalizeFilter(section);
  const products = getSectionProducts(section);

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
  return query ? `index.html?${query}` : "index.html";
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

  const currentSection = getCurrentSection();

  target.innerHTML = `
    <div class="catalog-tree">
      ${sections
        .map((section) => {
          const isCurrentSection = currentSection?.key === section.key;

          if (!hasNestedCategories(section)) {
            return `
              <a class="catalog-tree__link ${isCurrentSection ? "is-active" : ""}" href="${section.href}">
                <span>${escapeHtml(section.title)}</span>
              </a>
            `;
          }

          return `
            <details class="catalog-tree__details" ${isCurrentSection ? "open" : ""}>
              <summary class="catalog-tree__summary ${isCurrentSection ? "is-active" : ""}">
                <span>${escapeHtml(section.title)}</span>
              </summary>
              <ul class="catalog-tree__sublist">
                <li>
                  <a class="${isCurrentSection && activeFilter === "all" ? "is-active" : ""}" href="${section.href}">
                    Все товары
                  </a>
                </li>
                ${section.subcategories
                  .map((subcategory) => {
                    const isCurrentSub = isCurrentSection && activeFilter === subcategory.key;

                    return `
                      <li>
                        <a class="${isCurrentSub ? "is-active" : ""}" href="${buildSectionLink(section, subcategory.key)}">
                          ${escapeHtml(subcategory.title)}
                        </a>
                      </li>
                    `;
                  })
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
    <a class="catalog-card__media" href="${product.href}">
      <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
    </a>
    <div class="catalog-card__topline">
      <span>${escapeHtml(product.subTitle)}</span>
      <span>${escapeHtml(product.sizes)}</span>
    </div>
    <a href="${product.href}">
      <h3 class="catalog-card__title">${escapeHtml(product.title)}</h3>
    </a>
    <div class="catalog-card__footer">
      <span class="catalog-card__price">${product.price}</span>
      <span class="catalog-card__swatch" style="--swatch: ${product.swatch};" aria-hidden="true"></span>
    </div>
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
  const title = pageConfig.title;
  const description = pageConfig.description;
  const currentSectionTitle = getCurrentSectionTitle();

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

  if (breadcrumbCatalogLinkNode) {
    breadcrumbCatalogLinkNode.setAttribute("href", "index.html");
  }

  if (breadcrumbCurrentSeparatorNode && breadcrumbCurrentNode) {
    const hasCurrentSection = Boolean(currentSectionTitle);
    breadcrumbCurrentSeparatorNode.hidden = !hasCurrentSection;
    breadcrumbCurrentNode.hidden = !hasCurrentSection;
    breadcrumbCurrentNode.textContent = hasCurrentSection ? currentSectionTitle : "";
  }

  document.title = `${title} | EXCLUSIVE`;
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
  renderPageMeta();
  renderCatalogTree(catalogTreeNode);
  renderCatalogTree(catalogDrawerTreeNode);
  renderProducts();
  initDrawer();

  if (currentYearNode) {
    currentYearNode.textContent = String(new Date().getFullYear());
  }

  document.querySelectorAll("[data-telegram-link]").forEach((link) => {
    link.setAttribute("href", DEFAULT_TELEGRAM_URL);
  });
};

initPage();
