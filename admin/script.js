const catalogApi = window.ExclusiveCatalog;
const authApi = window.ExclusiveAuth;

const profileLinks = document.querySelectorAll("[data-profile-link]");
const headerCartBadge = document.getElementById("header-cart-badge");
const menuGroupsNode = document.getElementById("mobile-menu-groups");
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");
const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");

const adminGuard = document.getElementById("admin-guard");
const adminGuardTitle = document.getElementById("admin-guard-title");
const adminGuardText = document.getElementById("admin-guard-text");
const adminGuardPrimary = document.getElementById("admin-guard-primary");
const adminGuardSecondary = document.getElementById("admin-guard-secondary");
const adminBuilder = document.getElementById("admin-builder");
const adminOwnerNode = document.getElementById("admin-owner");
const adminLogoutButton = document.getElementById("admin-logout");
const adminNoticeNode = document.getElementById("admin-notice");

const categoryCountNode = document.getElementById("admin-category-count");
const productCountNode = document.getElementById("admin-product-count");
const newProductButton = document.getElementById("admin-new-product");
const newCategoryButton = document.getElementById("admin-new-category");
const productSearchNode = document.getElementById("admin-product-search");
const toolbarTitleNode = document.getElementById("admin-toolbar-title");
const toolbarMetaNode = document.getElementById("admin-toolbar-meta");
const categoryFilterNode = document.getElementById("admin-category-filter");
const productGridNode = document.getElementById("admin-product-grid");
const productEmptyNode = document.getElementById("admin-product-empty");

const productEditorTitleNode = document.getElementById("admin-product-editor-title");
const openProductLink = document.getElementById("admin-open-product-link");
const productForm = document.getElementById("admin-product-editor-form");
const productSaveButton = productForm?.querySelector('button[type="submit"]');
const productDeleteButton = document.getElementById("admin-product-delete");
const productResetButton = document.getElementById("admin-product-reset");
const productIdInput = document.getElementById("admin-product-id");
const productCategoryInput = document.getElementById("admin-product-category");
const productPriceInput = document.getElementById("admin-product-price");
const productTitleInput = document.getElementById("admin-product-title");
const productArticleInput = document.getElementById("admin-product-article");
const productLabelInput = document.getElementById("admin-product-label");
const productSizesInput = document.getElementById("admin-product-sizes");
const productColorsInput = document.getElementById("admin-product-colors");
const productImageInput = document.getElementById("admin-product-image");
const productImageFileInput = document.getElementById("admin-product-image-file");
const productImagePreviewBlock = document.getElementById("admin-product-image-preview-block");
const productImagePreview = document.getElementById("admin-product-image-preview");
const productImagePreviewCaption = document.getElementById("admin-product-image-preview-caption");
const productDescriptionInput = document.getElementById("admin-product-description");
const productCompositionInput = document.getElementById("admin-product-composition");
const productFeaturesInput = document.getElementById("admin-product-features");
const productCareInput = document.getElementById("admin-product-care");
const productPaletteStartInput = document.getElementById("admin-product-palette-start");
const productPaletteEndInput = document.getElementById("admin-product-palette-end");

const categoryEditorTitleNode = document.getElementById("admin-category-editor-title");
const categoryForm = document.getElementById("admin-category-editor-form");
const categoryDeleteButton = document.getElementById("admin-category-delete");
const categoryResetButton = document.getElementById("admin-category-reset");
const categoryKeyInput = document.getElementById("admin-category-key");
const categoryKeyVisibleInput = document.getElementById("admin-category-key-visible");
const categoryTitleInput = document.getElementById("admin-category-title");
const categoryDescriptionInput = document.getElementById("admin-category-description");
const categoryPaletteStartInput = document.getElementById("admin-category-palette-start");
const categoryPaletteEndInput = document.getElementById("admin-category-palette-end");

const DEFAULT_START = "#f4eee6";
const DEFAULT_END = "#ccb39d";
const IMAGE_FILE_PATTERN = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const NOTICE_TIMEOUT_MS = 2400;

const state = {
  currentUser: null,
  selectedCategoryKey: "",
  selectedProductId: "",
  search: "",
  productEditorImageValue: "",
};

let noticeTimer = 0;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const splitCommaValues = (value) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const splitLineValues = (value) =>
  String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const parseFeatureLines = (value) =>
  splitLineValues(value).map((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      return [line, ""];
    }

    return [
      line.slice(0, separatorIndex).trim(),
      line.slice(separatorIndex + 1).trim(),
    ];
  });

const featureLinesToText = (features) =>
  (Array.isArray(features) ? features : [])
    .map((feature) => {
      if (Array.isArray(feature)) {
        const name = String(feature[0] ?? "").trim();
        const value = String(feature[1] ?? "").trim();
        return value ? `${name}: ${value}` : name;
      }

      return String(feature ?? "").trim();
    })
    .filter(Boolean)
    .join("\n");

const normalizeImageSource = (value) => {
  const raw = String(value ?? "").trim().replaceAll("\\", "/");

  if (!raw) {
    return "";
  }

  if (raw.startsWith("data:") || /^https?:\/\//i.test(raw) || raw.startsWith("//")) {
    return raw;
  }

  const uploadsPathIndex = raw.indexOf("/uploads/");
  if (uploadsPathIndex >= 0) {
    return raw.slice(uploadsPathIndex);
  }

  const photoPathIndex = raw.indexOf("/фото/");
  if (photoPathIndex >= 0) {
    return raw.slice(photoPathIndex);
  }

  if (raw.startsWith("uploads/") || raw.startsWith("фото/")) {
    return `/${raw}`;
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  if (IMAGE_FILE_PATTERN.test(raw)) {
    return `/uploads/products/${raw}`;
  }

  return raw;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Не удалось прочитать изображение."));
    reader.readAsDataURL(file);
  });

const setNotice = (message, type = "") => {
  if (!adminNoticeNode) {
    return;
  }

  if (noticeTimer) {
    window.clearTimeout(noticeTimer);
    noticeTimer = 0;
  }

  if (!message) {
    adminNoticeNode.hidden = true;
    adminNoticeNode.textContent = "";
    adminNoticeNode.classList.remove("is-error");
    return;
  }

  adminNoticeNode.hidden = false;
  adminNoticeNode.textContent = message;
  adminNoticeNode.classList.toggle("is-error", type === "error");

  if (type !== "error") {
    noticeTimer = window.setTimeout(() => {
      setNotice("");
    }, NOTICE_TIMEOUT_MS);
  }
};

const getCategories = () => catalogApi?.getCategories?.() || [];
const getProducts = () => catalogApi?.getProducts?.() || [];

const getVisibleProducts = () => {
  if (!state.selectedCategoryKey) {
    return [];
  }

  return catalogApi?.getProducts?.({
    categoryKey: state.selectedCategoryKey,
    search: state.search,
  }) || [];
};

const buildProductHref = (product) =>
  `/product/?id=${encodeURIComponent(product.id)}&return=${encodeURIComponent(`/catalog/?page=${product.categoryKey}`)}`;

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

const renderProductImagePreview = () => {
  const value = state.productEditorImageValue || "";

  if (!productImagePreviewBlock || !productImagePreview || !productImagePreviewCaption) {
    return;
  }

  if (!value) {
    productImagePreviewBlock.hidden = true;
    productImagePreview.removeAttribute("src");
    productImagePreviewCaption.textContent = "";
    return;
  }

  productImagePreviewBlock.hidden = false;
  productImagePreview.src = value;
  productImagePreviewCaption.textContent = value.startsWith("data:")
    ? "Файл выбран и будет сохранён в карточке товара."
    : value;
};

const fillProductCategoryOptions = (selectedKey = "") => {
  const categories = getCategories();
  const hasSelected = Boolean(selectedKey && categories.some((category) => category.key === selectedKey));
  const options = [];

  if (!hasSelected) {
    options.push('<option value="" selected disabled>Сначала выбери категорию</option>');
  }

  options.push(
    ...categories.map(
      (category) => `
        <option value="${category.key}" ${hasSelected && selectedKey === category.key ? "selected" : ""}>
          ${escapeHtml(category.title)}
        </option>
      `,
    ),
  );

  productCategoryInput.innerHTML = options.join("");
};

const resetProductEditor = ({ preserveCategory = true } = {}) => {
  const defaultCategoryKey = preserveCategory
    ? state.selectedCategoryKey || ""
    : "";

  state.selectedProductId = "";
  state.productEditorImageValue = "";
  productEditorTitleNode.textContent = defaultCategoryKey ? "Новый товар" : "Сначала выбери категорию";
  productIdInput.value = "";
  fillProductCategoryOptions(defaultCategoryKey);
  productPriceInput.value = "";
  productTitleInput.value = "";
  productArticleInput.value = "";
  productLabelInput.value = "";
  productSizesInput.value = "";
  productColorsInput.value = "";
  productImageInput.value = "";
  productDescriptionInput.value = "";
  productCompositionInput.value = "";
  productFeaturesInput.value = "";
  productCareInput.value = "";
  productPaletteStartInput.value = DEFAULT_START;
  productPaletteEndInput.value = DEFAULT_END;
  if (productImageFileInput) {
    productImageFileInput.value = "";
  }
  openProductLink.hidden = true;
  if (productSaveButton) {
    productSaveButton.disabled = !defaultCategoryKey;
  }
  productDeleteButton.disabled = true;
  renderProductImagePreview();
};

const renderProductEditor = () => {
  const product = state.selectedProductId ? getProducts().find((item) => item.id === state.selectedProductId) : null;

  if (!product) {
    resetProductEditor();
    return;
  }

  productEditorTitleNode.textContent = product.title || "Товар";
  productIdInput.value = product.id;
  fillProductCategoryOptions(product.categoryKey);
  productPriceInput.value = String(product.priceValue || "");
  productTitleInput.value = product.title || "";
  productArticleInput.value = product.article || "";
  productLabelInput.value = product.label || "";
  productSizesInput.value = (product.sizes || []).join(", ");
  productColorsInput.value = (product.colors || []).map((color) => color.name || color).join(", ");
  state.productEditorImageValue = product.image || "";
  productImageInput.value = String(product.image || "").startsWith("data:") ? "" : product.image || "";
  if (productImageFileInput) {
    productImageFileInput.value = "";
  }
  productDescriptionInput.value = product.description || "";
  productCompositionInput.value = product.composition || "";
  productFeaturesInput.value = featureLinesToText(product.features);
  productCareInput.value = Array.isArray(product.care) ? product.care.join("\n") : "";
  productPaletteStartInput.value = product.palette?.[0] || DEFAULT_START;
  productPaletteEndInput.value = product.palette?.[1] || DEFAULT_END;
  openProductLink.href = buildProductHref(product);
  openProductLink.hidden = false;
  if (productSaveButton) {
    productSaveButton.disabled = false;
  }
  productDeleteButton.disabled = false;
  renderProductImagePreview();
};

const resetCategoryEditor = () => {
  const category = state.selectedCategoryKey ? getCategories().find((item) => item.key === state.selectedCategoryKey) : null;

  if (!category) {
    categoryEditorTitleNode.textContent = "Новая категория";
    categoryKeyInput.value = "";
    categoryKeyVisibleInput.value = "";
    categoryTitleInput.value = "";
    categoryDescriptionInput.value = "";
    categoryPaletteStartInput.value = DEFAULT_START;
    categoryPaletteEndInput.value = DEFAULT_END;
    categoryDeleteButton.disabled = true;
    return;
  }

  categoryEditorTitleNode.textContent = category.title;
  categoryKeyInput.value = category.key;
  categoryKeyVisibleInput.value = category.key;
  categoryTitleInput.value = category.title || "";
  categoryDescriptionInput.value = category.description || "";
  categoryPaletteStartInput.value = category.palette?.[0] || DEFAULT_START;
  categoryPaletteEndInput.value = category.palette?.[1] || DEFAULT_END;
  categoryDeleteButton.disabled = false;
};

const renderStats = () => {
  if (categoryCountNode) {
    categoryCountNode.textContent = String(getCategories().length);
  }

  if (productCountNode) {
    productCountNode.textContent = String(getProducts().length);
  }
};

const renderToolbar = () => {
  if (!toolbarTitleNode || !toolbarMetaNode) {
    return;
  }

  if (!state.selectedCategoryKey) {
    toolbarTitleNode.textContent = "Сначала выбери категорию";
    toolbarMetaNode.textContent = "После выбора категории здесь появятся товары для редактирования.";
    return;
  }

  const category = catalogApi.getCategoryByKey(state.selectedCategoryKey);
  const visibleProducts = getVisibleProducts();
  toolbarTitleNode.textContent = category?.title || "Категория";
  toolbarMetaNode.textContent = state.search
    ? `${visibleProducts.length} товаров по запросу`
    : `${visibleProducts.length} товаров в категории`;
};

const renderCategoryFilter = () => {
  const categories = getCategories();
  const products = getProducts();
  const counts = products.reduce((map, product) => {
    map.set(product.categoryKey, (map.get(product.categoryKey) || 0) + 1);
    return map;
  }, new Map());

  categoryFilterNode.innerHTML = categories
    .map((category) => {
      const isActive = state.selectedCategoryKey === category.key;
      return `
        <button class="admin-filter ${isActive ? "is-active" : ""}" type="button" data-category-key="${category.key}">
          <span class="admin-filter__title">${escapeHtml(category.title)}</span>
          <span class="admin-filter__meta">${counts.get(category.key) || 0} товаров</span>
        </button>
      `;
    })
    .join("");
};

const renderProductGrid = () => {
  if (!productGridNode || !productEmptyNode) {
    return;
  }

  const visibleProducts = getVisibleProducts();

  if (!state.selectedCategoryKey) {
    productGridNode.hidden = true;
    productGridNode.innerHTML = "";
    productEmptyNode.hidden = false;
    productEmptyNode.textContent = "Выбери категорию слева, потом выбери товар для редактирования.";
    return;
  }

  if (!visibleProducts.length) {
    productGridNode.hidden = true;
    productGridNode.innerHTML = "";
    productEmptyNode.hidden = false;
    productEmptyNode.textContent = state.search
      ? "По этому запросу в выбранной категории ничего не найдено."
      : "В этой категории пока нет товаров.";
    return;
  }

  productEmptyNode.hidden = true;
  productGridNode.hidden = false;
  productGridNode.innerHTML = visibleProducts
    .map((product) => {
      const selected = state.selectedProductId === product.id;
      return `
        <article class="admin-product-card ${selected ? "is-selected" : ""}">
          <button class="admin-product-card__hit" type="button" data-product-id="${product.id}" aria-label="${escapeHtml(product.title)}"></button>
          <div class="admin-product-card__media">
            <img src="${escapeHtml(product.image || "")}" alt="${escapeHtml(product.title)}" loading="lazy">
          </div>
          <div class="admin-product-card__meta">
            <p class="admin-product-card__eyebrow">${escapeHtml(product.categoryTitle || "Каталог")}</p>
            <h3 class="admin-product-card__title">${escapeHtml(product.title)}</h3>
            <div class="admin-product-card__footer">
              <strong>${escapeHtml(product.priceLabel)}</strong>
              <span>${escapeHtml(product.article || "")}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
};

const syncOwner = () => {
  const user = state.currentUser;

  if (!user || !adminOwnerNode) {
    return;
  }

  adminOwnerNode.textContent = `${user.firstName} ${user.lastName} · ${authApi.formatPhone(user.phone)}`;
};

const createProductPayload = () => ({
  categoryKey: productCategoryInput.value,
  title: productTitleInput.value,
  article: productArticleInput.value,
  label: productLabelInput.value,
  priceValue: productPriceInput.value,
  sizes: splitCommaValues(productSizesInput.value),
  colors: splitCommaValues(productColorsInput.value),
  image: state.productEditorImageValue,
  description: productDescriptionInput.value,
  composition: productCompositionInput.value,
  features: parseFeatureLines(productFeaturesInput.value),
  care: splitLineValues(productCareInput.value),
  paletteStart: productPaletteStartInput.value,
  paletteEnd: productPaletteEndInput.value,
});

const createCategoryPayload = () => ({
  title: categoryTitleInput.value,
  description: categoryDescriptionInput.value,
  paletteStart: categoryPaletteStartInput.value,
  paletteEnd: categoryPaletteEndInput.value,
});

const rerender = () => {
  renderStats();
  renderToolbar();
  renderCategoryFilter();
  renderProductGrid();
  renderProductEditor();
  resetCategoryEditor();
};

const setGuard = ({ title, text, primaryHref, primaryLabel, secondaryHref, secondaryLabel }) => {
  adminGuard.hidden = false;
  adminBuilder.hidden = true;
  adminGuardTitle.textContent = title;
  adminGuardText.textContent = text;
  adminGuardPrimary.href = primaryHref;
  adminGuardPrimary.textContent = primaryLabel;
  adminGuardSecondary.href = secondaryHref;
  adminGuardSecondary.textContent = secondaryLabel;
};

const showBuilder = () => {
  adminGuard.hidden = true;
  adminBuilder.hidden = false;
};

const selectCategory = (categoryKey) => {
  state.selectedCategoryKey = categoryKey;
  state.selectedProductId = "";
  state.search = "";
  if (productSearchNode) {
    productSearchNode.value = "";
  }
  rerender();
};

const selectProduct = (productId) => {
  const product = getProducts().find((item) => item.id === productId);
  if (!product) {
    return;
  }

  state.selectedProductId = productId;
  state.selectedCategoryKey = product.categoryKey;
  renderCategoryFilter();
  renderToolbar();
  renderProductGrid();
  renderProductEditor();
  resetCategoryEditor();
};

const initEditorActions = () => {
  newCategoryButton?.addEventListener("click", () => {
    state.selectedCategoryKey = "";
    categoryEditorTitleNode.textContent = "Новая категория";
    categoryKeyInput.value = "";
    categoryKeyVisibleInput.value = "";
    categoryTitleInput.value = "";
    categoryDescriptionInput.value = "";
    categoryPaletteStartInput.value = DEFAULT_START;
    categoryPaletteEndInput.value = DEFAULT_END;
    categoryDeleteButton.disabled = true;
    setNotice("");
    renderCategoryFilter();
    renderToolbar();
    renderProductGrid();
  });

  newProductButton?.addEventListener("click", () => {
    if (!state.selectedCategoryKey) {
      setNotice("Сначала выбери категорию, потом добавляй товар.", "error");
      return;
    }

    resetProductEditor({ preserveCategory: true });
    setNotice("");
  });

  productSearchNode?.addEventListener("input", () => {
    state.search = productSearchNode.value.trim();
    renderToolbar();
    renderProductGrid();
  });

  categoryFilterNode?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category-key]");
    if (!button) {
      return;
    }

    selectCategory(button.dataset.categoryKey || "");
  });

  productGridNode?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-id]");
    if (!button) {
      return;
    }

    selectProduct(button.dataset.productId || "");
  });

  productResetButton?.addEventListener("click", () => {
    resetProductEditor({ preserveCategory: true });
  });

  productImageInput?.addEventListener("input", () => {
    state.productEditorImageValue = normalizeImageSource(productImageInput.value);
    renderProductImagePreview();
  });

  productImageFileInput?.addEventListener("change", async () => {
    const file = productImageFileInput.files?.[0];

    if (!file) {
      return;
    }

    try {
      state.productEditorImageValue = await readFileAsDataUrl(file);
      productImageInput.value = file.name || "";
      renderProductImagePreview();
    } catch (error) {
      setNotice("Не удалось прочитать изображение. Попробуй выбрать файл ещё раз.", "error");
    }
  });

  categoryResetButton?.addEventListener("click", () => {
    if (state.selectedCategoryKey) {
      resetCategoryEditor();
      return;
    }

    categoryTitleInput.value = "";
    categoryDescriptionInput.value = "";
  });

  productDeleteButton?.addEventListener("click", () => {
    const productId = productIdInput.value;

    if (!productId) {
      return;
    }

    if (!window.confirm("Удалить этот товар из каталога?")) {
      return;
    }

    catalogApi.deleteProduct(productId);
    resetProductEditor({ preserveCategory: true });
    rerender();
    setNotice("Успешно.");
  });

  categoryDeleteButton?.addEventListener("click", () => {
    const categoryKey = categoryKeyInput.value;

    if (!categoryKey) {
      return;
    }

    if (!window.confirm("Удалить категорию и все товары внутри неё?")) {
      return;
    }

    catalogApi.deleteCategory(categoryKey);
    state.selectedCategoryKey = "";
    state.selectedProductId = "";
    categoryTitleInput.value = "";
    categoryDescriptionInput.value = "";
    rerender();
    setNotice("Успешно.");
  });

  productForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const beforeIds = new Set(getProducts().map((product) => product.id));
    const productId = productIdInput.value;
    const payload = createProductPayload();

    if (!productId && !payload.categoryKey) {
      setNotice("Сначала выбери категорию для нового товара.", "error");
      return;
    }

    if (productId) {
      catalogApi.updateProduct(productId, payload);
      state.selectedProductId = productId;
    } else {
      catalogApi.addProduct(payload);
      const created = getProducts().find((product) => !beforeIds.has(product.id)) || null;
      state.selectedProductId = created?.id || "";
    }

    state.selectedCategoryKey = payload.categoryKey || state.selectedCategoryKey;
    rerender();
    setNotice("Успешно.");
  });

  categoryForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const beforeKeys = new Set(getCategories().map((category) => category.key));
    const categoryKey = categoryKeyInput.value;
    const payload = createCategoryPayload();

    if (categoryKey) {
      catalogApi.updateCategory(categoryKey, payload);
      state.selectedCategoryKey = categoryKey;
    } else {
      catalogApi.addCategory(payload);
      const created = getCategories().find((category) => !beforeKeys.has(category.key)) || null;
      state.selectedCategoryKey = created?.key || "";
    }

    rerender();
    setNotice("Успешно.");
  });

  adminLogoutButton?.addEventListener("click", async () => {
    await authApi.logout();
    window.location.href = authApi.getAuthUrl({
      mode: "login",
      redirect: `${window.location.pathname}${window.location.search}`,
    });
  });
};

const ensureAccess = () => {
  state.currentUser = authApi?.getCurrentUser?.() || null;

  if (!state.currentUser) {
    window.location.href = authApi.getAuthUrl({
      mode: "login",
      redirect: `${window.location.pathname}${window.location.search}`,
    });
    return false;
  }

  if (!authApi.isAdminUser(state.currentUser)) {
    setGuard({
      title: "Доступ закрыт",
      text: "Эта админка открывается только под твоим номером телефона владельца.",
      primaryHref: "/account/",
      primaryLabel: "В личный кабинет",
      secondaryHref: "/",
      secondaryLabel: "На главную",
    });
    return false;
  }

  syncOwner();
  showBuilder();
  return true;
};

const initAdmin = async () => {
  if (!catalogApi || !authApi) {
    return;
  }

  if (!ensureAccess()) {
    return;
  }

  window.ExclusiveStore?.mountCartBadge(headerCartBadge);
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
  await catalogApi.ready?.();
  renderMenuGroups();
  initMobileMenu();

  fillProductCategoryOptions(getCategories()[0]?.key || "");
  resetProductEditor({ preserveCategory: true });
  resetCategoryEditor();
  initEditorActions();
  rerender();

  window.addEventListener(catalogApi.CATALOG_EVENT || "exclusive:catalogchange", () => {
    rerender();
  });

  window.addEventListener(authApi.AUTH_EVENT || "exclusive:authchange", () => {
    if (!ensureAccess()) {
      return;
    }

    window.ExclusiveAuth?.mountProfileLinks(profileLinks);
    syncOwner();
  });
};

initAdmin();
