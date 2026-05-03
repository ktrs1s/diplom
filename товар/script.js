const CART_PAGE_URL = "../cart/index.html";
const DEFAULT_TELEGRAM_URL = "https://t.me/";
const FALLBACK_RETURN_URL = "../каталог/index.html?page=outerwear";
const params = new URLSearchParams(window.location.search);

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

const createDataUriSvg = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const createStudioPhoto = ({ coatColor, accentColor, background, crop = "full", hairColor = "#3d2b21" }) => {
  const cropMap = {
    full: { tx: 0, ty: 0, scale: 1 },
    collar: { tx: -160, ty: -180, scale: 1.26 },
    belt: { tx: -180, ty: -360, scale: 1.36 },
    side: { tx: 50, ty: -20, scale: 1.08 },
  };

  const view = cropMap[crop] || cropMap.full;
  const poseRotation = crop === "side" ? -4 : 0;
  const sleeveShift = crop === "side" ? 16 : 0;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500">
      <defs>
        <linearGradient id="photo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${background[0]}"/>
          <stop offset="100%" stop-color="${background[1]}"/>
        </linearGradient>
        <linearGradient id="coat-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${accentColor}"/>
          <stop offset="100%" stop-color="${coatColor}"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="rgba(0,0,0,0.18)"/>
        </filter>
      </defs>
      <rect width="1200" height="1500" fill="url(#photo-bg)"/>
      <circle cx="985" cy="210" r="145" fill="rgba(255,255,255,0.18)"/>
      <circle cx="160" cy="1245" r="170" fill="rgba(255,255,255,0.14)"/>
      <ellipse cx="610" cy="1320" rx="260" ry="46" fill="rgba(0,0,0,0.08)"/>
      <g transform="translate(${view.tx} ${view.ty}) scale(${view.scale}) rotate(${poseRotation} 600 720)" filter="url(#shadow)">
        <path d="M515 162C552 120 649 116 685 162C720 206 728 273 713 335H487C472 272 481 205 515 162Z" fill="${hairColor}"/>
        <circle cx="600" cy="254" r="82" fill="#e8c9b7"/>
        <path d="M558 312H642V390H558Z" fill="#e8c9b7"/>
        <path d="M418 430C467 369 529 345 600 345C671 345 734 369 782 430L830 1200H370L418 430Z" fill="url(#coat-shine)"/>
        <path d="M495 390L566 520L520 1200H410L435 560C441 479 461 430 495 390Z" fill="${coatColor}"/>
        <path d="M705 390L634 520L680 1200H790L765 560C759 479 739 430 705 390Z" fill="${coatColor}"/>
        <path d="M548 370L594 500L520 1200H430L470 560C476 470 500 412 548 370Z" fill="#151515"/>
        <path d="M652 370L606 500L680 1200H770L730 560C724 470 700 412 652 370Z" fill="#1d1d1d"/>
        <path d="M470 540L600 640L730 540L748 610L600 704L452 610Z" fill="${accentColor}"/>
        <path d="M468 560H732V616H468Z" fill="${accentColor}"/>
        <rect x="${396 + sleeveShift}" y="455" width="88" height="434" rx="44" transform="rotate(12 440 672)" fill="${coatColor}"/>
        <rect x="${716 + sleeveShift}" y="438" width="88" height="434" rx="44" transform="rotate(-12 760 655)" fill="${coatColor}"/>
        <path d="M420 1210C500 1168 567 1148 600 1148C632 1148 702 1168 780 1210V1310H420Z" fill="#151515"/>
        <path d="M510 405H690L640 336H560Z" fill="#202020"/>
        <path d="M468 1202C512 1184 560 1174 600 1174C640 1174 688 1184 732 1202" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="5"/>
      </g>
    </svg>
  `;

  return createDataUriSvg(svg);
};

const productData = {
  productId: "exclusive-trench-cropped-black",
  title: "Черный укороченный женский тренч с поясом и акцентным воротником",
  article: "EX-TR-2604-113",
  price: "6 990 ₽",
  returnUrl: params.get("return") || FALLBACK_RETURN_URL,
  images: [
    {
      alt: "Черный тренч EXCLUSIVE, основной ракурс",
      src: createStudioPhoto({
        coatColor: "#171717",
        accentColor: "#2d2d2d",
        background: ["#f7f2eb", "#e4d8ca"],
        crop: "full",
      }),
    },
    {
      alt: "Черный тренч EXCLUSIVE, деталь воротника",
      src: createStudioPhoto({
        coatColor: "#171717",
        accentColor: "#353535",
        background: ["#f8f3ec", "#e3d9ce"],
        crop: "collar",
      }),
    },
    {
      alt: "Черный тренч EXCLUSIVE, деталь пояса",
      src: createStudioPhoto({
        coatColor: "#171717",
        accentColor: "#444444",
        background: ["#f6f0e7", "#dfd3c6"],
        crop: "belt",
      }),
    },
    {
      alt: "Черный тренч EXCLUSIVE, боковой ракурс",
      src: createStudioPhoto({
        coatColor: "#171717",
        accentColor: "#2f2f2f",
        background: ["#f5efe7", "#dfd5c8"],
        crop: "side",
      }),
    },
  ],
  sizes: ["XS", "S", "M", "L"],
  colors: [
    { name: "Черный", swatch: "#141414" },
    { name: "Графит", swatch: "#5a5a5a" },
    { name: "Бежевый", swatch: "#ccbba6" },
  ],
  sizeTable: [
    ["XS", "42", "84", "64", "92"],
    ["S", "44", "88", "68", "96"],
    ["M", "46", "92", "72", "100"],
    ["L", "48", "96", "76", "104"],
  ],
  sections: [
    {
      title: "Характеристики",
      type: "features",
      open: true,
      items: [
        ["Силуэт", "Полуприлегающий"],
        ["Стиль", "Городская классика"],
        ["Воротник", "Отложной с широкими лацканами"],
        ["Застежка", "Пуговицы и пояс"],
        ["Сезон", "Весна и демисезон"],
        ["Длина", "Укороченная"],
      ],
    },
    {
      title: "Уход",
      type: "list",
      items: [
        "Деликатная стирка при температуре до 30°C.",
        "Сушить на широких плечиках без прямого солнца.",
        "Отпаривать с изнаночной стороны через ткань.",
        "Не использовать агрессивные отбеливатели.",
      ],
    },
    {
      title: "Состав",
      type: "text",
      items: "55% полиэстер, 35% вискоза, 10% эластан. Подкладка: 100% вискоза.",
    },
  ],
  similarProducts: [
    {
      title: "Молочный тренч свободного силуэта с поясом",
      price: "6 790 ₽",
      image: createStudioPhoto({
        coatColor: "#efe8de",
        accentColor: "#c8b59f",
        background: ["#faf6f0", "#ece2d5"],
        crop: "full",
        hairColor: "#4a3529",
      }),
    },
    {
      title: "Графитовый тренч с мягкой линией плеча",
      price: "7 190 ₽",
      image: createStudioPhoto({
        coatColor: "#606060",
        accentColor: "#757575",
        background: ["#f2efe9", "#ddd6cc"],
        crop: "full",
        hairColor: "#33251f",
      }),
    },
    {
      title: "Песочный тренч на пуговицах с поясом",
      price: "6 590 ₽",
      image: createStudioPhoto({
        coatColor: "#c7af95",
        accentColor: "#d5c2aa",
        background: ["#fbf5ec", "#e8dccb"],
        crop: "full",
        hairColor: "#52372a",
      }),
    },
    {
      title: "Черный плащ миди с акцентным воротником",
      price: "7 490 ₽",
      image: createStudioPhoto({
        coatColor: "#1d1d1d",
        accentColor: "#3c3c3c",
        background: ["#f7f1e8", "#e4d9cb"],
        crop: "full",
        hairColor: "#38261e",
      }),
    },
  ],
};

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

const productBackNode = document.getElementById("product-back");
const favoriteButton = document.getElementById("toggle-favorite");
const addToCartButton = document.getElementById("add-to-cart");
const headerCartBadge = document.getElementById("header-cart-badge");
const headerCartLink = document.getElementById("header-cart-link");

const sizeGuideOpenButton = document.getElementById("size-guide-open");
const sizeModal = document.getElementById("size-modal");
const sizeModalBackdrop = document.getElementById("size-modal-backdrop");
const sizeModalCloseButton = document.getElementById("size-modal-close");
const sizeTableBody = document.querySelector("#size-table tbody");

const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");
const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");

let activeImageIndex = 0;
let activeSize = "S";
let activeColor = "Черный";

const breadcrumbSectionTitles = {
  outerwear: "Верхняя одежда",
  jeans: "Джинсы",
  trousers: "Брюки",
  suits: "Костюмы",
  knitwear: "Джемперы и свитеры",
  tops: "Футболки, поло и лонгсливы",
  shoes: "Обувь",
  accessories: "Аксессуары",
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const renderBreadcrumbs = () => {
  if (!breadcrumbSectionNode || !breadcrumbSectionSeparatorNode) {
    return;
  }

  let sectionTitle = "";
  let sectionHref = "";

  try {
    const returnUrl = new URL(productData.returnUrl || FALLBACK_RETURN_URL, window.location.href);
    const pageKey = returnUrl.searchParams.get("page") || "";

    if (breadcrumbSectionTitles[pageKey]) {
      sectionTitle = breadcrumbSectionTitles[pageKey];
      sectionHref = productData.returnUrl || FALLBACK_RETURN_URL;
    }
  } catch {
    sectionTitle = "";
  }

  const hasSection = Boolean(sectionTitle);
  breadcrumbSectionSeparatorNode.hidden = !hasSection;
  breadcrumbSectionNode.hidden = !hasSection;

  if (hasSection) {
    breadcrumbSectionNode.textContent = sectionTitle;
    breadcrumbSectionNode.setAttribute("href", sectionHref);
  }
};

const getCurrentProductHref = () => `../товар/index.html${window.location.search || ""}`;

const getCurrentLineDescriptor = () => ({
  productId: productData.productId,
  size: activeSize,
  color: activeColor,
});

const syncCartState = () => {
  const itemInCart = window.ExclusiveStore?.hasCartItem(getCurrentLineDescriptor()) || false;

  if (addToCartButton) {
    addToCartButton.textContent = itemInCart ? "ДОБАВЛЕНО В КОРЗИНУ" : "ДОБАВИТЬ В КОРЗИНУ";
    addToCartButton.setAttribute("aria-pressed", String(itemInCart));
    addToCartButton.classList.toggle("is-added", itemInCart);
  }
};

const renderMenuGroups = () => {
  if (!menuGroupsNode) {
    return;
  }

  menuGroupsNode.innerHTML = menuGroups
    .map((group) => {
      if (!group.items.length) {
        return `<a class="mobile-menu__group-link" href="${group.href}">${escapeHtml(group.title)}</a>`;
      }

      return `
        <details class="mobile-menu__group">
          <summary class="mobile-menu__summary">${escapeHtml(group.title)}</summary>
          <ul class="mobile-menu__list">
            ${group.items.map((item) => `<li><a href="${group.href}">${escapeHtml(item)}</a></li>`).join("")}
          </ul>
        </details>
      `;
    })
    .join("");
};

const updateMainImage = () => {
  const current = productData.images[activeImageIndex];

  if (!mainImageNode || !current) {
    return;
  }

  mainImageNode.src = current.src;
  mainImageNode.alt = current.alt;
};

const renderThumbs = () => {
  if (!thumbsNode) {
    return;
  }

  thumbsNode.innerHTML = productData.images
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
  if (!sizesNode) {
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
  if (!colorsNode) {
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

  metaNode.innerHTML = productData.sections
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
  if (!similarProductsNode) {
    return;
  }

  similarProductsNode.innerHTML = productData.similarProducts
    .map(
      (product) => `
        <article class="similar-product">
          <a class="similar-product__media" href="index.html">
            <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
          </a>
          <a href="index.html">
            <h3 class="similar-product__title">${escapeHtml(product.title)}</h3>
          </a>
          <span class="similar-product__price">${product.price}</span>
        </article>
      `,
    )
    .join("");
};

const renderSizeTable = () => {
  if (!sizeTableBody) {
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
    priceNode.textContent = productData.price;
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
  syncCartState();

  document.querySelectorAll("[data-telegram-link]").forEach((link) => {
    link.setAttribute("href", DEFAULT_TELEGRAM_URL);
  });
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

  if (!window.ExclusiveStore) {
    return;
  }

  if (window.ExclusiveStore.hasCartItem(getCurrentLineDescriptor())) {
    syncCartState();
    return;
  }

  const lineId = window.ExclusiveStore.createLineId(getCurrentLineDescriptor());

  window.ExclusiveStore.addToCart({
    lineId,
    productId: productData.productId,
    title: productData.title,
    article: productData.article,
    image: productData.images[0]?.src || "",
    href: getCurrentProductHref(),
    size: activeSize,
    color: activeColor,
    priceValue: window.ExclusiveStore.normalizePrice(productData.price),
    priceLabel: productData.price,
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
    favoriteButton.classList.toggle("is-active");
  });

  addToCartButton?.addEventListener("click", handleAddToCartClick, { capture: true });

  productBackNode?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = productData.returnUrl || FALLBACK_RETURN_URL;
  });

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
