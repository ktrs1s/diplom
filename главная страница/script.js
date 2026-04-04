const createDataUriSvg = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const createProductPlaceholder = (label, palette, hint = "Замените на свое изображение") => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200">
      <defs>
        <linearGradient id="product-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="100%" stop-color="${palette[1]}"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1200" fill="url(#product-bg)"/>
      <circle cx="730" cy="180" r="130" fill="rgba(255,255,255,0.14)"/>
      <circle cx="120" cy="980" r="170" fill="rgba(255,255,255,0.12)"/>
      <text x="50%" y="48%" text-anchor="middle" fill="#202020" font-family="Arial, sans-serif" font-size="66" font-weight="400">${label}</text>
      <text x="50%" y="56%" text-anchor="middle" fill="#404040" font-family="Arial, sans-serif" font-size="28">${hint}</text>
    </svg>
  `;

  return createDataUriSvg(svg);
};

const createHeroPlaceholder = (label, palette, mobile = false) => {
  const viewBox = mobile ? "0 0 780 1680" : "0 0 1600 900";
  const width = mobile ? 780 : 1600;
  const height = mobile ? 1680 : 900;
  const circleOne = mobile
    ? '<circle cx="620" cy="250" r="140" fill="rgba(255,255,255,0.12)"/>'
    : '<circle cx="1280" cy="160" r="120" fill="rgba(255,255,255,0.12)"/>';
  const circleTwo = mobile
    ? '<circle cx="120" cy="1240" r="180" fill="rgba(255,255,255,0.1)"/>'
    : '<circle cx="250" cy="700" r="180" fill="rgba(255,255,255,0.1)"/>';
  const labelSize = mobile ? 66 : 72;
  const hintSize = mobile ? 28 : 30;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
      <defs>
        <linearGradient id="hero-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette[0]}"/>
          <stop offset="100%" stop-color="${palette[1]}"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#hero-bg)"/>
      ${circleOne}
      ${circleTwo}
      <text x="50%" y="50%" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="${labelSize}" font-weight="400">${label}</text>
      <text x="50%" y="57%" text-anchor="middle" fill="rgba(255,255,255,0.82)" font-family="Arial, sans-serif" font-size="${hintSize}">Замените на свое фото</text>
    </svg>
  `;

  return createDataUriSvg(svg);
};

const catalogHomeHref = "../каталог/index.html";
const productPageHref = "../страница товара/index.html";

const categoryPageLinks = {
  "Верхняя одежда": "../каталог/index.html?page=outerwear",
  "Джинсы": "../каталог/index.html?page=jeans",
  "Костюмы": "../каталог/index.html?page=suits",
  "Футболки, поло и лонгсливы": "../каталог/index.html?page=tops",
  "Брюки": "../каталог/index.html?page=trousers",
  "Джемперы и свитеры": "../каталог/index.html?page=knitwear",
  "Обувь": "../каталог/index.html?page=shoes",
  "Аксессуары": "../каталог/index.html?page=accessories",
};

// Чтобы вставить свои изображения, заменяйте desktopImage, mobileImage и image на путь к вашему файлу.
// Пример: "images/banner-01.jpg" или "images/catalog/look-01.webp"
const heroSlides = [
  {
    href: catalogHomeHref,
    desktopImage: createHeroPlaceholder("БАННЕР 01", ["#d9d0c9", "#8f847d"]),
    mobileImage: createHeroPlaceholder("БАННЕР 01", ["#d9d0c9", "#8f847d"], true),
  },
  {
    href: "#new-arrivals",
    desktopImage: createHeroPlaceholder("БАННЕР 02", ["#d5c7c3", "#9c8178"]),
    mobileImage: createHeroPlaceholder("БАННЕР 02", ["#d5c7c3", "#9c8178"], true),
  },
  {
    href: "#popular",
    desktopImage: createHeroPlaceholder("БАННЕР 03", ["#cfcbbf", "#787166"]),
    mobileImage: createHeroPlaceholder("БАННЕР 03", ["#cfcbbf", "#787166"], true),
  },
  {
    href: catalogHomeHref,
    desktopImage: createHeroPlaceholder("EXCLUSIVE", ["#c8c1bb", "#5d5956"]),
    mobileImage: createHeroPlaceholder("EXCLUSIVE", ["#c8c1bb", "#5d5956"], true),
    title: "Интернет-магазин женской одежды EXCLUSIVE",
  },
];

const categories = [
  {
    title: "Верхняя одежда",
    href: "../каталог/index.html?page=outerwear",
    image: createProductPlaceholder("ВЕРХНЯЯ ОДЕЖДА", ["#e5dacb", "#baa18a"]),
  },
  {
    title: "Джинсы",
    href: "../каталог/index.html?page=jeans",
    image: createProductPlaceholder("ДЖИНСЫ", ["#dbe4ec", "#84a0bd"]),
  },
  {
    title: "Костюмы",
    href: "../каталог/index.html?page=suits",
    image: createProductPlaceholder("КОСТЮМЫ", ["#d7e0af", "#9aad62"]),
  },
  {
    title: "Футболки и лонгсливы",
    href: "../каталог/index.html?page=tops",
    image: createProductPlaceholder("ТОПЫ", ["#eadfd5", "#b3927e"]),
  },
  {
    title: "Брюки",
    href: "../каталог/index.html?page=trousers",
    image: createProductPlaceholder("БРЮКИ", ["#f0e6d4", "#cfb089"]),
  },
  {
    title: "Джемперы и свитеры",
    href: "../каталог/index.html?page=knitwear",
    image: createProductPlaceholder("ТРИКОТАЖ", ["#f5e3e8", "#d1a3b1"]),
  },
  {
    title: "Обувь",
    href: "../каталог/index.html?page=shoes",
    image: createProductPlaceholder("ОБУВЬ", ["#eceaea", "#a2a2a2"]),
  },
];

const newArrivals = [
  {
    title: "Бежевый удлиненный классический тренч из хлопка",
    price: "5 999 ₽",
    swatch: "#f3ead9",
    sizes: ["S", "M"],
    image: createProductPlaceholder("ТРЕНЧ", ["#f1e7d4", "#ccb18f"]),
  },
  {
    title: "Коричневый свободный женский костюм со свитшотом и широкими брюками",
    price: "4 399 ₽",
    swatch: "#8a5731",
    sizes: ["S", "M"],
    image: createProductPlaceholder("КОСТЮМ", ["#a48877", "#5e3c34"]),
  },
  {
    title: "Бежевый классический женский кардиган с поясом",
    price: "3 999 ₽",
    swatch: "#f0ead5",
    sizes: ["ONE SIZE"],
    image: createProductPlaceholder("КАРДИГАН", ["#f4eee7", "#c9b79e"]),
  },
  {
    title: "Коричневая демисезонная женская куртка на пуговицах",
    price: "4 999 ₽",
    swatch: "#ab6406",
    sizes: ["S", "M"],
    image: createProductPlaceholder("КУРТКА", ["#c7b3a4", "#755444"]),
  },
  {
    title: "Молочная объемная женская куртка с капюшоном",
    price: "4 999 ₽",
    swatch: "#f3eee6",
    sizes: ["S", "M"],
    image: createProductPlaceholder("ПУХОВИК", ["#fbf6ef", "#d8cec2"]),
  },
  {
    title: "Розовый свободный женский свитшот с вышивкой",
    price: "1 999 ₽",
    swatch: "#f4a3bf",
    sizes: ["ONE SIZE"],
    image: createProductPlaceholder("СВИТШОТ", ["#fde8ef", "#e5a8bb"]),
  },
];

const popularProducts = [
  {
    title: "Черный приталенный женский жакет с расклешенными рукавами",
    price: "3 499 ₽",
    swatch: "#111111",
    sizes: ["S", "M"],
    image: createProductPlaceholder("ЖАКЕТ", ["#494450", "#111111"]),
  },
  {
    title: "Молочная женская куртка с капюшоном и объемным силуэтом",
    price: "4 999 ₽",
    swatch: "#f4eee4",
    sizes: ["S", "M"],
    image: createProductPlaceholder("КУРТКА", ["#fdf9ef", "#d6ccb7"]),
  },
  {
    title: "Розовый комфортный свитшот в расслабленном стиле",
    price: "1 999 ₽",
    swatch: "#f8a2c1",
    sizes: ["ONE SIZE"],
    image: createProductPlaceholder("СВИТШОТ", ["#fce7ef", "#e3a7bc"]),
  },
  {
    title: "Серый повседневный комплект с рубашкой и юбкой",
    price: "2 499 ₽",
    swatch: "#c7c7c7",
    sizes: ["ONE SIZE"],
    image: createProductPlaceholder("КОМПЛЕКТ", ["#eaebef", "#b5b8c2"]),
  },
  {
    title: "Коричневый удлиненный классический тренч из хлопка",
    price: "5 999 ₽",
    swatch: "#8a5b39",
    sizes: ["S", "M"],
    image: createProductPlaceholder("ТРЕНЧ", ["#d9cec4", "#916750"]),
  },
  {
    title: "Белый классический приталенный женский пиджак",
    price: "3 499 ₽",
    swatch: "#f5f4ef",
    sizes: ["S", "M"],
    image: createProductPlaceholder("ПИДЖАК", ["#f6f4ef", "#d7d3cb"]),
  },
];

const shoesProducts = [
  {
    title: "Чёрные классические демисезонные женские ботинки из экокожи",
    price: "4 999 ₽",
    swatch: "#111111",
    sizes: ["36", "37", "38", "39", "40"],
    image: createProductPlaceholder("БОТИНКИ", ["#dedede", "#404040"]),
  },
  {
    title: "Белые повседневные женские кроссовки",
    price: "2 499 ₽",
    swatch: "#ffffff",
    sizes: ["37", "38", "39", "40"],
    image: createProductPlaceholder("КРОССОВКИ", ["#ffffff", "#d7d7d7"]),
  },
  {
    title: "Коричневые классические женские сапоги на каблуке",
    price: "4 499 ₽",
    swatch: "#ab6406",
    sizes: ["36", "37", "38", "39", "40"],
    image: createProductPlaceholder("САПОГИ", ["#e7d9ce", "#6e4c40"]),
  },
  {
    title: "Чёрные высокие женские сапоги на устойчивом каблуке",
    price: "5 299 ₽",
    swatch: "#151515",
    sizes: ["36", "37", "38", "39", "40"],
    image: createProductPlaceholder("САПОГИ", ["#d7d7d7", "#2f2f2f"]),
  },
];

const catalogProducts = [
  {
    title: "Коричневая свободная женская футболка из хлопка",
    price: "999 ₽",
    swatch: "#866552",
    sizes: ["ONE SIZE"],
    image: createProductPlaceholder("ФУТБОЛКА", ["#efe3da", "#bc9a84"]),
  },
  {
    title: "Молочное трикотажное женское платье-поло из вискозы",
    price: "2 299 ₽",
    swatch: "#f2e9d9",
    sizes: ["ONE SIZE"],
    image: createProductPlaceholder("ПЛАТЬЕ", ["#f8f3ea", "#d7c4a7"]),
  },
  {
    title: "Коричневый повседневный женский костюм с лонгсливом и брюками",
    price: "3 299 ₽",
    swatch: "#7e5847",
    sizes: ["ONE SIZE"],
    image: createProductPlaceholder("КОСТЮМ", ["#cbb6ab", "#7c5f53"]),
  },
  {
    title: "Бежевый удлинённый классический тренч с поясом",
    price: "5 999 ₽",
    swatch: "#cfb596",
    sizes: ["S", "M"],
    image: createProductPlaceholder("ТРЕНЧ", ["#efe4d3", "#c3a581"]),
  },
  {
    title: "Светлый женский свитер свободного силуэта",
    price: "2 799 ₽",
    swatch: "#efe6d6",
    sizes: ["ONE SIZE"],
    image: createProductPlaceholder("СВИТЕР", ["#faf5ea", "#dbc8aa"]),
  },
  {
    title: "Серые широкие женские брюки на каждый день",
    price: "2 499 ₽",
    swatch: "#bdbdbd",
    sizes: ["S", "M"],
    image: createProductPlaceholder("БРЮКИ", ["#ededed", "#b5b5b5"]),
  },
  {
    title: "Черное женское платье-миди с аккуратным силуэтом",
    price: "3 799 ₽",
    swatch: "#222222",
    sizes: ["S", "M"],
    image: createProductPlaceholder("ПЛАТЬЕ", ["#d9d2d0", "#4b4342"]),
  },
  {
    title: "Молочная базовая блуза с длинными рукавами",
    price: "1 899 ₽",
    swatch: "#f5efe7",
    sizes: ["ONE SIZE"],
    image: createProductPlaceholder("БЛУЗА", ["#faf4ee", "#d7c5b1"]),
  },
];

const menuGroups = [
  {
    title: "Верхняя одежда",
    items: ["Пальто", "Куртки", "Ветровки", "Джинсовые куртки"],
  },
  {
    title: "Джинсы",
    items: [],
  },
  {
    title: "Брюки",
    items: [],
  },
  {
    title: "Костюмы",
    items: ["Спортивные костюмы", "Классические костюмы", "Летние костюмы"],
  },
  {
    title: "Джемперы и свитеры",
    items: [],
  },
  {
    title: "Футболки, поло и лонгсливы",
    items: [],
  },
  {
    title: "Обувь",
    items: ["Лето 2026", "Туфли", "Сапоги и ботильоны", "Кроссовки и кеды"],
  },
  {
    title: "Аксессуары",
    items: ["Шапки", "Кепки", "Платки", "Сумки", "Шарфы"],
  },
];

const heroTrack = document.getElementById("hero-track");
const heroDots = document.getElementById("hero-dots");
const categoriesTrack = document.getElementById("categories-track");
const newTrack = document.getElementById("new-track");
const popularTrack = document.getElementById("popular-track");
const shoesTrack = document.getElementById("shoes-track");
const catalogGrid = document.getElementById("catalog-grid");
const menuGroupsNode = document.getElementById("mobile-menu-groups");
const currentYearNode = document.getElementById("current-year");

const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");
const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");
const siteHeader = document.getElementById("site-header");

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const renderHeroSlides = () => {
  if (!heroTrack || !heroDots) {
    return;
  }

  heroTrack.innerHTML = heroSlides
    .map((slide, index) => {
      const titleMarkup = slide.title ? `<h1 class="hero-slide__title">${escapeHtml(slide.title)}</h1>` : "";
      const textMarkup = slide.text ? `<p class="hero-slide__text">${escapeHtml(slide.text)}</p>` : "";
      const buttonMarkup = slide.button
        ? `
          <div class="hero-slide__actions">
            <span class="hero-slide__button">${escapeHtml(slide.button)}</span>
          </div>
        `
        : "";

      return `
        <article class="hero-slide" data-hero-slide="${index}">
          <a class="hero-slide__link" href="${slide.href}" aria-label="Открыть слайд ${index + 1}"></a>
          <div class="hero-slide__media">
            <img class="hero-slide__image hero-slide__image--desktop" src="${slide.desktopImage}" alt="Баннер EXCLUSIVE ${index + 1}" loading="${index === 0 ? "eager" : "lazy"}">
            <img class="hero-slide__image hero-slide__image--mobile" src="${slide.mobileImage}" alt="Баннер EXCLUSIVE ${index + 1}" loading="${index === 0 ? "eager" : "lazy"}">
          </div>
          ${(titleMarkup || textMarkup || buttonMarkup)
            ? `
              <div class="hero-slide__content">
                ${titleMarkup}
                ${textMarkup}
                ${buttonMarkup}
              </div>
            `
            : ""}
        </article>
      `;
    })
    .join("");

  heroDots.innerHTML = heroSlides
    .map(
      (_, index) => `
        <button
          class="hero-slider__dot ${index === 0 ? "is-active" : ""}"
          type="button"
          data-hero-dot="${index}"
          aria-label="Перейти к слайду ${index + 1}"
        ></button>
      `,
    )
    .join("");
};

const renderCategoryCard = (category) => `
  <div class="section-carousel__item">
    <article class="category-card">
      <a class="category-card__link" href="${category.href || catalogHomeHref}" aria-label="${escapeHtml(category.title)}"></a>
      <div class="category-card__media">
        <img src="${category.image}" alt="${escapeHtml(category.title)}" loading="lazy">
      </div>
      <h3 class="category-card__title">${escapeHtml(category.title)}</h3>
    </article>
  </div>
`;

const renderProductCard = (product) => `
  <div class="section-carousel__item">
    <article class="product-card">
      <a class="product-card__media" href="${product.href || productPageHref}" aria-label="${escapeHtml(product.title)}">
        <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
      </a>
      <a href="${product.href || productPageHref}">
        <h3 class="product-card__title">${escapeHtml(product.title)}</h3>
      </a>
      <span class="product-card__price">${product.price}</span>
      <div class="product-card__footer">
        <span class="product-card__swatch" aria-label="Цвет товара" style="--swatch: ${product.swatch};"></span>
      </div>
    </article>
  </div>
`;

const renderGridProductCard = (product) => `
  <article class="product-card">
    <a class="product-card__media" href="${product.href || productPageHref}" aria-label="${escapeHtml(product.title)}">
      <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
    </a>
    <a href="${product.href || productPageHref}">
      <h3 class="product-card__title">${escapeHtml(product.title)}</h3>
    </a>
    <span class="product-card__price">${product.price}</span>
    <div class="product-card__footer">
      <span class="product-card__swatch" aria-label="Цвет товара" style="--swatch: ${product.swatch};"></span>
    </div>
  </article>
`;

const mountContent = () => {
  renderHeroSlides();

  if (categoriesTrack) {
    categoriesTrack.innerHTML = categories.map(renderCategoryCard).join("");
  }

  if (newTrack) {
    newTrack.innerHTML = newArrivals.map(renderProductCard).join("");
  }

  if (popularTrack) {
    popularTrack.innerHTML = popularProducts.map(renderProductCard).join("");
  }

  if (shoesTrack) {
    shoesTrack.innerHTML = shoesProducts.map(renderProductCard).join("");
  }

  if (catalogGrid) {
    catalogGrid.innerHTML = catalogProducts.map(renderGridProductCard).join("");
  }

  if (menuGroupsNode) {
    menuGroupsNode.innerHTML = menuGroups
      .map(
        (group) => {
          if (!group.items.length) {
            return `<a class="mobile-menu__group-link" href="${categoryPageLinks[group.title] || catalogHomeHref}">${escapeHtml(group.title)}</a>`;
          }

          return `
            <details class="mobile-menu__group">
              <summary class="mobile-menu__summary">${escapeHtml(group.title)}</summary>
              <ul class="mobile-menu__list">
                ${group.items.map((item) => `<li><a href="${categoryPageLinks[group.title] || catalogHomeHref}">${escapeHtml(item)}</a></li>`).join("")}
              </ul>
            </details>
          `;
        },
      )
      .join("");
  }

  if (currentYearNode) {
    currentYearNode.textContent = String(new Date().getFullYear());
  }
};

const initHeroSlider = () => {
  const slider = document.getElementById("hero-slider");
  const prevButton = document.getElementById("hero-prev");
  const nextButton = document.getElementById("hero-next");

  if (!slider || !heroTrack || !heroDots || !prevButton || !nextButton) {
    return;
  }

  const dots = Array.from(heroDots.querySelectorAll("[data-hero-dot]"));
  let currentIndex = 0;
  let autoTimer = null;

  const updateHero = (index) => {
    currentIndex = (index + heroSlides.length) % heroSlides.length;
    heroTrack.style.transform = `translateX(-${currentIndex * 100}%)`;

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === currentIndex);
    });
  };

  const startAuto = () => {
    window.clearInterval(autoTimer);
    autoTimer = window.setInterval(() => updateHero(currentIndex + 1), 5500);
  };

  prevButton.addEventListener("click", () => {
    updateHero(currentIndex - 1);
    startAuto();
  });

  nextButton.addEventListener("click", () => {
    updateHero(currentIndex + 1);
    startAuto();
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      updateHero(Number(dot.dataset.heroDot));
      startAuto();
    });
  });

  slider.addEventListener("mouseenter", () => window.clearInterval(autoTimer));
  slider.addEventListener("mouseleave", startAuto);

  updateHero(0);
  startAuto();
};

const initCarousel = (carousel) => {
  const viewport = carousel.querySelector(".section-carousel__viewport");
  const track = carousel.querySelector(".section-carousel__track");
  const prevButton = carousel.querySelector(".prev-btn");
  const nextButton = carousel.querySelector(".next-btn");
  const baseItems = Array.from(track?.children ?? []);
  const isLooping = carousel.classList.contains("section-carousel--categories");

  if (!viewport || !track || !prevButton || !nextButton || baseItems.length === 0) {
    return { update: () => {} };
  }

  let currentIndex = 0;
  let pointerStart = 0;
  let isDragging = false;
  let baseCount = baseItems.length;
  let isResetting = false;

  const rebuildLoopTrack = () => {
    if (!isLooping) {
      return;
    }

    const markup = baseItems.map((item) => item.outerHTML).join("");
    track.innerHTML = `${markup}${markup}${markup}`;
    baseCount = baseItems.length;
    currentIndex = baseCount;
    track.style.transition = "none";
  };

  const getMetrics = () => {
    const items = Array.from(track.children);
    const firstItem = items[0];
    const gap = Number.parseFloat(window.getComputedStyle(track).gap) || 0;
    const itemWidth = firstItem.getBoundingClientRect().width;
    const viewportWidth = viewport.getBoundingClientRect().width;
    const visibleItems = Math.max(1, Math.floor((viewportWidth + gap) / (itemWidth + gap)));
    const maxIndex = isLooping
      ? baseCount * 2 - 1
      : Math.max(0, items.length - visibleItems);

    return { gap, itemWidth, maxIndex };
  };

  const update = () => {
    const { gap, itemWidth, maxIndex } = getMetrics();
    if (isLooping && maxIndex > 0) {
      if (currentIndex < 0) {
        currentIndex = baseCount - 1;
      } else if (currentIndex > maxIndex) {
        currentIndex = baseCount * 2;
      }
    } else {
      currentIndex = Math.min(Math.max(0, currentIndex), maxIndex);
    }

    if (!isResetting) {
      track.style.transition = "";
    }
    track.style.transform = `translateX(-${currentIndex * (itemWidth + gap)}px)`;
    prevButton.disabled = !isLooping && currentIndex === 0;
    nextButton.disabled = !isLooping && currentIndex >= maxIndex;
    carousel.classList.toggle("is-static", maxIndex === 0);
  };

  prevButton.addEventListener("click", () => {
    currentIndex -= 1;
    update();
  });

  nextButton.addEventListener("click", () => {
    currentIndex += 1;
    update();
  });

  viewport.addEventListener("pointerdown", (event) => {
    pointerStart = event.clientX;
    isDragging = true;
  });

  viewport.addEventListener("pointerup", (event) => {
    if (!isDragging) {
      return;
    }

    const delta = event.clientX - pointerStart;

    if (Math.abs(delta) > 40) {
      if (delta < 0) {
        currentIndex += 1;
      } else {
        currentIndex -= 1;
      }
    }

    isDragging = false;
    update();
  });

  viewport.addEventListener("pointerleave", () => {
    isDragging = false;
  });

  if (isLooping) {
    rebuildLoopTrack();

    track.addEventListener("transitionend", () => {
      const { gap, itemWidth } = getMetrics();

      if (currentIndex >= baseCount * 2) {
        isResetting = true;
        currentIndex -= baseCount;
        track.style.transition = "none";
        track.style.transform = `translateX(-${currentIndex * (itemWidth + gap)}px)`;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isResetting = false;
            track.style.transition = "";
          });
        });
      } else if (currentIndex < baseCount) {
        isResetting = true;
        currentIndex += baseCount;
        track.style.transition = "none";
        track.style.transform = `translateX(-${currentIndex * (itemWidth + gap)}px)`;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isResetting = false;
            track.style.transition = "";
          });
        });
      }
    });
  }

  update();
  return {
    update: () => {
      if (isLooping) {
        rebuildLoopTrack();
      }
      update();
    },
  };
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
    syncHeaderState();
  };

  const openMenu = () => {
    document.body.classList.add("menu-open");
    mobileMenu.classList.add("is-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    mobileMenuBackdrop.hidden = false;
    syncHeaderState();
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

const syncHeaderState = () => {
  if (!siteHeader) {
    return;
  }

  const shouldSolid = window.scrollY > 24 || document.body.classList.contains("menu-open");
  siteHeader.classList.toggle("is-solid", shouldSolid);
};

mountContent();
initHeroSlider();
initMobileMenu();

const carouselControllers = Array.from(document.querySelectorAll("[data-carousel]")).map(initCarousel);

window.addEventListener("resize", () => {
  carouselControllers.forEach((controller) => controller.update());
});

window.addEventListener("scroll", syncHeaderState, { passive: true });
syncHeaderState();
