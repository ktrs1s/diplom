const createDataUriSvg = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

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

const catalogHomeHref = "/catalog/";
const productPageHref = "/product/";
const catalogApi = window.ExclusiveCatalog;

const fallbackHeroSlides = [
  {
    href: catalogHomeHref,
    desktopImage: createHeroPlaceholder("БАННЕР 01", ["#d9d0c9", "#8f847d"]),
    mobileImage: createHeroPlaceholder("БАННЕР 01", ["#d9d0c9", "#8f847d"], true),
  },
  {
    href: "/new/",
    desktopImage: createHeroPlaceholder("БАННЕР 02", ["#d5c7c3", "#9c8178"]),
    mobileImage: createHeroPlaceholder("БАННЕР 02", ["#d5c7c3", "#9c8178"], true),
  },
  {
    href: "/hit/",
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
let heroSlides = [];

const heroTrack = document.getElementById("hero-track");
const heroDots = document.getElementById("hero-dots");
const categoriesTrack = document.getElementById("categories-track");
const newTrack = document.getElementById("new-track");
const popularTrack = document.getElementById("popular-track");
const shoesTrack = document.getElementById("shoes-track");
const catalogGrid = document.getElementById("catalog-grid");
const menuGroupsNode = document.getElementById("mobile-menu-groups");
const currentYearNode = document.getElementById("current-year");
const headerCartBadge = document.getElementById("header-cart-badge");
const profileLinks = document.querySelectorAll("[data-profile-link]");

const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");
const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");
const siteHeader = document.getElementById("site-header");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const buildCategoryHref = (category) => `/catalog/?page=${encodeURIComponent(category.key)}`;

const buildProductHref = (product) => {
  const returnUrl = `/catalog/?page=${encodeURIComponent(product.categoryKey)}`;
  return `${productPageHref}?id=${encodeURIComponent(product.id)}&return=${encodeURIComponent(returnUrl)}`;
};

const resolveHomeData = () => {
  if (!catalogApi) {
    return {
      categories: [],
      newArrivals: [],
      popular: [],
      shoes: [],
      catalogPreview: [],
    };
  }

  return catalogApi.getHomeCollections();
};

const resolveHeroSlides = () => {
  const slides = catalogApi?.getHeroSlides?.() || catalogApi?.getBanners?.() || [];
  return Array.isArray(slides) && slides.length ? slides : fallbackHeroSlides;
};

const renderHeroSlides = () => {
  if (!heroTrack || !heroDots) {
    return;
  }

  heroSlides = resolveHeroSlides();
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
      <a class="category-card__link" href="${buildCategoryHref(category)}" aria-label="${escapeHtml(category.title)}"></a>
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
      <a class="product-card__media" href="${buildProductHref(product)}" aria-label="${escapeHtml(product.title)}">
        <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
      </a>
      <a href="${buildProductHref(product)}">
        <h3 class="product-card__title">${escapeHtml(product.title)}</h3>
      </a>
      <span class="product-card__price">${product.priceLabel || product.price || ""}</span>
    </article>
  </div>
`;

const renderGridProductCard = (product) => `
  <article class="product-card">
    <a class="product-card__media" href="${buildProductHref(product)}" aria-label="${escapeHtml(product.title)}">
      <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
    </a>
    <a href="${buildProductHref(product)}">
      <h3 class="product-card__title">${escapeHtml(product.title)}</h3>
    </a>
    <span class="product-card__price">${product.priceLabel || product.price || ""}</span>
  </article>
`;

const mountContent = () => {
  const homeData = resolveHomeData();

  renderHeroSlides();
  window.dispatchEvent(new CustomEvent("exclusive:heroslideschange"));

  if (categoriesTrack) {
    categoriesTrack.innerHTML = homeData.categories.map(renderCategoryCard).join("");
  }

  if (newTrack) {
    newTrack.innerHTML = homeData.newArrivals.map(renderProductCard).join("");
  }

  if (popularTrack) {
    popularTrack.innerHTML = homeData.popular.map(renderProductCard).join("");
  }

  if (shoesTrack) {
    shoesTrack.innerHTML = homeData.shoes.map(renderProductCard).join("");
  }

  if (catalogGrid) {
    catalogGrid.innerHTML = homeData.catalogPreview.map(renderGridProductCard).join("");
  }

  if (menuGroupsNode && catalogApi) {
    menuGroupsNode.innerHTML = catalogApi
      .getMenuGroups()
      .map((group) => `<a class="mobile-menu__group-link" href="${group.href}">${escapeHtml(group.title)}</a>`)
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

  const getDots = () => Array.from(heroDots.querySelectorAll("[data-hero-dot]"));
  let currentIndex = 0;
  let autoTimer = null;

  const updateHero = (index) => {
    if (!heroSlides.length) {
      return;
    }

    currentIndex = (index + heroSlides.length) % heroSlides.length;
    heroTrack.style.transform = `translateX(-${currentIndex * 100}%)`;

    getDots().forEach((dot, dotIndex) => {
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

  heroDots.addEventListener("click", (event) => {
    const dot = event.target.closest("[data-hero-dot]");

    if (!dot) {
      return;
    }

    updateHero(Number(dot.dataset.heroDot));
    startAuto();
  });

  slider.addEventListener("mouseenter", () => window.clearInterval(autoTimer));
  slider.addEventListener("mouseleave", startAuto);
  window.addEventListener("exclusive:heroslideschange", () => {
    updateHero(0);
    startAuto();
  });

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
    const maxIndex = isLooping ? baseCount * 2 - 1 : Math.max(0, items.length - visibleItems);

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
      currentIndex += delta < 0 ? 1 : -1;
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
window.ExclusiveStore?.mountCartBadge(headerCartBadge);
window.ExclusiveAuth?.mountProfileLinks(profileLinks);
window.addEventListener(window.ExclusiveAuth?.AUTH_EVENT || "exclusive:authchange", () => {
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
});
catalogApi?.ready?.().then(() => {
  mountContent();
  carouselControllers.forEach((controller) => controller.update());
});
window.addEventListener(window.ExclusiveCatalog?.CATALOG_EVENT || "exclusive:catalogchange", () => {
  mountContent();
  carouselControllers.forEach((controller) => controller.update());
});
