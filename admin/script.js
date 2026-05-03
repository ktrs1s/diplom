const catalogApi = window.ExclusiveCatalog;
const authApi = window.ExclusiveAuth;

const adminGuard = document.getElementById("admin-guard");
const adminGuardTitle = document.getElementById("admin-guard-title");
const adminGuardText = document.getElementById("admin-guard-text");
const adminGuardPrimary = document.getElementById("admin-guard-primary");
const adminGuardSecondary = document.getElementById("admin-guard-secondary");
const adminBuilder = document.getElementById("admin-builder");
const adminOwnerNode = document.getElementById("admin-owner");
const adminLogoutButton = document.getElementById("admin-logout");

const categoryCountNode = document.getElementById("admin-category-count");
const productCountNode = document.getElementById("admin-product-count");
const newProductButton = document.getElementById("admin-new-product");
const newCategoryButton = document.getElementById("admin-new-category");
const productSearchNode = document.getElementById("admin-product-search");
const toolbarTitleNode = document.getElementById("admin-toolbar-title");
const toolbarMetaNode = document.getElementById("admin-toolbar-meta");
const categoryFilterNode = document.getElementById("admin-category-filter");
const categoryEditorListNode = document.getElementById("admin-category-editor-list");
const productGridNode = document.getElementById("admin-product-grid");
const productEmptyNode = document.getElementById("admin-product-empty");

const productModeButton = document.getElementById("admin-mode-product");
const categoryModeButton = document.getElementById("admin-mode-category");
const productSectionNode = document.getElementById("admin-product-section");
const categorySectionNode = document.getElementById("admin-category-section");

const productEditorTitleNode = document.getElementById("admin-product-editor-title");
const openProductLink = document.getElementById("admin-open-product-link");
const productForm = document.getElementById("admin-product-editor-form");
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
const productDescriptionInput = document.getElementById("admin-product-description");
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

const state = {
  currentUser: null,
  editorMode: "product",
  filterCategoryKey: "all",
  selectedProductId: "",
  selectedCategoryKey: "",
  search: "",
};

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

const getCategories = () => catalogApi?.getCategories() || [];
const getProducts = () => catalogApi?.getProducts() || [];

const getVisibleProducts = () => {
  const filters = {};

  if (state.filterCategoryKey !== "all") {
    filters.categoryKey = state.filterCategoryKey;
  }

  if (state.search) {
    filters.search = state.search;
  }

  return catalogApi?.getProducts(filters) || [];
};

const buildProductHref = (product) =>
  `../страница товара/index.html?id=${encodeURIComponent(product.id)}&return=${encodeURIComponent(`../каталог/index.html?page=${product.categoryKey}`)}`;

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

const setEditorMode = (mode) => {
  state.editorMode = mode === "category" ? "category" : "product";
  const isProduct = state.editorMode === "product";
  productModeButton.classList.toggle("is-active", isProduct);
  categoryModeButton.classList.toggle("is-active", !isProduct);
  productSectionNode.hidden = !isProduct;
  categorySectionNode.hidden = isProduct;
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
  const currentCategory =
    state.filterCategoryKey === "all"
      ? null
      : getCategories().find((category) => category.key === state.filterCategoryKey) || null;
  const visibleProducts = getVisibleProducts();

  toolbarTitleNode.textContent = currentCategory ? currentCategory.title : "Все товары";
  toolbarMetaNode.textContent = `${visibleProducts.length} позиций`;
};

const renderCategoryFilter = () => {
  const categories = getCategories();
  const products = getProducts();
  const counts = products.reduce((map, product) => {
    map.set(product.categoryKey, (map.get(product.categoryKey) || 0) + 1);
    return map;
  }, new Map());

  categoryFilterNode.innerHTML = [
    `
      <button class="admin-filter ${state.filterCategoryKey === "all" ? "is-active" : ""}" type="button" data-filter-key="all">
        <span>Все</span>
        <strong>${products.length}</strong>
      </button>
    `,
    ...categories.map(
      (category) => `
        <button class="admin-filter ${state.filterCategoryKey === category.key ? "is-active" : ""}" type="button" data-filter-key="${category.key}">
          <span>${escapeHtml(category.title)}</span>
          <strong>${counts.get(category.key) || 0}</strong>
        </button>
      `,
    ),
  ].join("");
};

const renderCategoryEditorList = () => {
  const categories = getCategories();

  categoryEditorListNode.innerHTML = categories
    .map((category) => {
      const selected = state.selectedCategoryKey === category.key;
      return `
        <button class="admin-category-row ${selected ? "is-selected" : ""}" type="button" data-category-key="${category.key}">
          <span class="admin-category-row__swatch" style="--category-start:${category.palette[0]}; --category-end:${category.palette[1]};"></span>
          <span class="admin-category-row__copy">
            <strong>${escapeHtml(category.title)}</strong>
            <small>${escapeHtml(category.key)}</small>
          </span>
        </button>
      `;
    })
    .join("");
};

const renderProductGrid = () => {
  const visibleProducts = getVisibleProducts();

  productEmptyNode.hidden = visibleProducts.length > 0;
  productGridNode.hidden = visibleProducts.length === 0;

  if (!visibleProducts.length) {
    productGridNode.innerHTML = "";
    return;
  }

  productGridNode.innerHTML = visibleProducts
    .map((product) => {
      const selected = state.selectedProductId === product.id;
      const image = product.image || "";
      return `
        <article class="admin-product-card ${selected ? "is-selected" : ""}" data-product-id="${product.id}">
          <button class="admin-product-card__hit" type="button" data-product-id="${product.id}" aria-label="${escapeHtml(product.title)}"></button>
          <div class="admin-product-card__media">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" loading="lazy">
          </div>
          <div class="admin-product-card__meta">
            <div class="admin-product-card__topline">
              <span>${escapeHtml(product.categoryTitle)}</span>
              <span>${escapeHtml(product.sizes.join(" · "))}</span>
            </div>
            <h3 class="admin-product-card__title">${escapeHtml(product.title)}</h3>
            <div class="admin-product-card__bottomline">
              <strong>${escapeHtml(product.priceLabel)}</strong>
              <span>${escapeHtml(product.article)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
};

const fillProductCategoryOptions = (selectedKey = "") => {
  const categories = getCategories();
  productCategoryInput.innerHTML = categories
    .map(
      (category) => `
        <option value="${category.key}" ${selectedKey === category.key ? "selected" : ""}>
          ${escapeHtml(category.title)}
        </option>
      `,
    )
    .join("");
};

const resetProductEditor = () => {
  const defaultCategoryKey = getCategories()[0]?.key || "";

  state.selectedProductId = "";
  productEditorTitleNode.textContent = "Новый товар";
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
  productPaletteStartInput.value = DEFAULT_START;
  productPaletteEndInput.value = DEFAULT_END;
  openProductLink.hidden = true;
  productDeleteButton.disabled = true;
};

const renderProductEditor = () => {
  const product = state.selectedProductId ? getProducts().find((item) => item.id === state.selectedProductId) : null;

  if (!product) {
    resetProductEditor();
    return;
  }

  productEditorTitleNode.textContent = product.title;
  productIdInput.value = product.id;
  fillProductCategoryOptions(product.categoryKey);
  productPriceInput.value = String(product.priceValue || "");
  productTitleInput.value = product.title || "";
  productArticleInput.value = product.article || "";
  productLabelInput.value = product.label || "";
  productSizesInput.value = (product.sizes || []).join(", ");
  productColorsInput.value = (product.colors || []).map((color) => color.name).join(", ");
  productImageInput.value = String(product.image || "").startsWith("data:") ? "" : product.image || "";
  productDescriptionInput.value = product.description || "";
  productPaletteStartInput.value = product.palette?.[0] || DEFAULT_START;
  productPaletteEndInput.value = product.palette?.[1] || DEFAULT_END;
  openProductLink.href = buildProductHref(product);
  openProductLink.hidden = false;
  productDeleteButton.disabled = false;
};

const resetCategoryEditor = () => {
  state.selectedCategoryKey = "";
  categoryEditorTitleNode.textContent = "Новая категория";
  categoryKeyInput.value = "";
  categoryKeyVisibleInput.value = "";
  categoryTitleInput.value = "";
  categoryDescriptionInput.value = "";
  categoryPaletteStartInput.value = DEFAULT_START;
  categoryPaletteEndInput.value = DEFAULT_END;
  categoryDeleteButton.disabled = true;
};

const renderCategoryEditor = () => {
  const category = state.selectedCategoryKey ? getCategories().find((item) => item.key === state.selectedCategoryKey) : null;

  if (!category) {
    resetCategoryEditor();
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

const rerender = () => {
  renderStats();
  renderToolbar();
  renderCategoryFilter();
  renderCategoryEditorList();
  renderProductGrid();
  renderProductEditor();
  renderCategoryEditor();
};

const syncOwner = () => {
  const user = state.currentUser;
  if (!user) {
    adminOwnerNode.textContent = "Владелец";
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
  image: productImageInput.value,
  description: productDescriptionInput.value,
  paletteStart: productPaletteStartInput.value,
  paletteEnd: productPaletteEndInput.value,
});

const createCategoryPayload = () => ({
  title: categoryTitleInput.value,
  description: categoryDescriptionInput.value,
  paletteStart: categoryPaletteStartInput.value,
  paletteEnd: categoryPaletteEndInput.value,
});

const selectProduct = (productId) => {
  state.selectedProductId = productId;
  state.editorMode = "product";
  setEditorMode("product");
  renderProductGrid();
  renderProductEditor();
};

const selectCategory = (categoryKey, { focusEditor = false } = {}) => {
  state.selectedCategoryKey = categoryKey;

  if (focusEditor) {
    state.editorMode = "category";
    setEditorMode("category");
  }

  renderCategoryEditorList();
  renderCategoryEditor();
};

const initEditorActions = () => {
  newProductButton?.addEventListener("click", () => {
    setEditorMode("product");
    resetProductEditor();
    renderProductGrid();
  });

  newCategoryButton?.addEventListener("click", () => {
    setEditorMode("category");
    resetCategoryEditor();
    renderCategoryEditorList();
  });

  productModeButton?.addEventListener("click", () => setEditorMode("product"));
  categoryModeButton?.addEventListener("click", () => setEditorMode("category"));

  productSearchNode?.addEventListener("input", () => {
    state.search = productSearchNode.value.trim();
    renderToolbar();
    renderProductGrid();
  });

  categoryFilterNode?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-key]");
    if (!button) {
      return;
    }

    state.filterCategoryKey = button.dataset.filterKey || "all";
    renderToolbar();
    renderCategoryFilter();
    renderProductGrid();
  });

  categoryEditorListNode?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category-key]");
    if (!button) {
      return;
    }

    const categoryKey = button.dataset.categoryKey || "";
    state.filterCategoryKey = categoryKey;
    selectCategory(categoryKey, { focusEditor: true });
    renderCategoryFilter();
    renderToolbar();
    renderProductGrid();
  });

  productGridNode?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-id]");
    if (!button) {
      return;
    }

    selectProduct(button.dataset.productId || "");
  });

  productResetButton?.addEventListener("click", () => {
    resetProductEditor();
    renderProductGrid();
  });

  categoryResetButton?.addEventListener("click", () => {
    resetCategoryEditor();
  });

  productDeleteButton?.addEventListener("click", () => {
    const productId = productIdInput.value;

    if (!productId) {
      return;
    }

    const confirmed = window.confirm("Удалить этот товар из каталога?");
    if (!confirmed) {
      return;
    }

    catalogApi.deleteProduct(productId);
    resetProductEditor();
    rerender();
  });

  categoryDeleteButton?.addEventListener("click", () => {
    const categoryKey = categoryKeyInput.value;

    if (!categoryKey) {
      return;
    }

    const confirmed = window.confirm("Удалить категорию и все товары внутри неё?");
    if (!confirmed) {
      return;
    }

    catalogApi.deleteCategory(categoryKey);
    if (state.filterCategoryKey === categoryKey) {
      state.filterCategoryKey = "all";
    }
    resetCategoryEditor();
    rerender();
  });

  productForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const beforeIds = new Set(getProducts().map((product) => product.id));
    const productId = productIdInput.value;
    const payload = createProductPayload();

    if (productId) {
      catalogApi.updateProduct(productId, payload);
      state.selectedProductId = productId;
    } else {
      catalogApi.addProduct(payload);
      const created = getProducts().find((product) => !beforeIds.has(product.id)) || null;
      state.selectedProductId = created?.id || "";
    }

    state.filterCategoryKey = payload.categoryKey || state.filterCategoryKey;
    state.editorMode = "product";
    rerender();
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

    if (state.selectedCategoryKey) {
      state.filterCategoryKey = state.selectedCategoryKey;
    }

    state.editorMode = "category";
    rerender();
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
  syncOwner();

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
      text: "Конструктор витрины открыт только для владельца магазина. Зайди под своим номером телефона, и мы откроем редактирование.",
      primaryHref: "../account/index.html",
      primaryLabel: "В личный кабинет",
      secondaryHref: "../главная страница/index.html",
      secondaryLabel: "На главную",
    });
    return false;
  }

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

  await catalogApi.ready?.();
  fillProductCategoryOptions(getCategories()[0]?.key || "");
  resetProductEditor();
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

    syncOwner();
  });
};

initAdmin();
