(function initExclusiveFavorites() {
  const FAVORITES_STORAGE_KEY = "exclusive-favorites-v1";
  const FAVORITES_EVENT = "exclusive:favoriteschange";

  const sanitizeId = (value) => String(value || "").trim();

  const redirectToAuth = () => {
    const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const authUrl = window.ExclusiveAuth?.getAuthUrl?.({ mode: "login", redirect: returnUrl }) || `/auth/?mode=login&redirect=${encodeURIComponent(returnUrl)}`;
    window.location.href = authUrl;
  };

  const requireAuth = () => {
    if (window.ExclusiveAuth?.isAuthenticated?.()) {
      return true;
    }

    redirectToAuth();
    return false;
  };

  const readJson = (key, fallback) => {
    try {
      const rawValue = window.localStorage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : fallback;
    } catch {
      return fallback;
    }
  };

  const writeJson = (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  };

  const normalizeIds = (value) => {
    const source = Array.isArray(value) ? value : [];
    return [...new Set(source.map(sanitizeId).filter(Boolean))];
  };

  const getFavoriteIds = () => normalizeIds(readJson(FAVORITES_STORAGE_KEY, []));

  const emitChange = (ids) => {
    window.dispatchEvent(
      new CustomEvent(FAVORITES_EVENT, {
        detail: {
          ids: normalizeIds(ids),
        },
      }),
    );
  };

  const saveFavoriteIds = (ids) => {
    const normalized = normalizeIds(ids);
    writeJson(FAVORITES_STORAGE_KEY, normalized);
    emitChange(normalized);
    return normalized;
  };

  const hasFavorite = (productId) => getFavoriteIds().includes(sanitizeId(productId));

  const addFavorite = (productId) => {
    if (!requireAuth()) {
      return getFavoriteIds();
    }

    const id = sanitizeId(productId);

    if (!id) {
      return getFavoriteIds();
    }

    return saveFavoriteIds([...getFavoriteIds(), id]);
  };

  const removeFavorite = (productId) => {
    const id = sanitizeId(productId);
    return saveFavoriteIds(getFavoriteIds().filter((favoriteId) => favoriteId !== id));
  };

  const toggleFavorite = (productId) => {
    if (!requireAuth()) {
      return hasFavorite(productId);
    }

    const id = sanitizeId(productId);

    if (!id) {
      return false;
    }

    if (hasFavorite(id)) {
      removeFavorite(id);
      return false;
    }

    addFavorite(id);
    return true;
  };

  const getFavoriteProducts = () => {
    const catalogApi = window.ExclusiveCatalog;
    const ids = getFavoriteIds();

    if (!catalogApi?.getProductById) {
      return [];
    }

    return ids.map((id) => catalogApi.getProductById(id)).filter(Boolean);
  };

  const count = () => getFavoriteIds().length;

  window.ExclusiveFavorites = {
    FAVORITES_EVENT,
    addFavorite,
    count,
    getFavoriteIds,
    getFavoriteProducts,
    hasFavorite,
    removeFavorite,
    toggleFavorite,
  };
})();
