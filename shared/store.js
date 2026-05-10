(function initExclusiveStore() {
  const CART_STORAGE_KEY = "exclusive-cart-v1";
  const CART_EVENT = "exclusive:cartchange";
  const FREE_SHIPPING_THRESHOLD = 12000;
  const moneyFormatter = new Intl.NumberFormat("ru-RU");
  const inMemoryFallback = [];

  const sanitizeText = (value, fallback = "") => {
    if (typeof value !== "string") {
      return fallback;
    }

    const trimmed = value.trim();
    return trimmed || fallback;
  };

  const formatPrice = (value) => `${moneyFormatter.format(Math.max(0, Math.round(Number(value) || 0)))} ₽`;

  const normalizePrice = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.round(value));
    }

    const digits = String(value ?? "").replace(/[^\d]/g, "");
    return digits ? Number.parseInt(digits, 10) : 0;
  };

  const createLineId = ({ productId, size, color }) =>
    [sanitizeText(productId, "exclusive-item"), sanitizeText(size, "one-size"), sanitizeText(color, "base")]
      .map((part) => encodeURIComponent(part.toLowerCase()))
      .join("__");

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

  const normalizeCartItem = (item) => {
    const productId = sanitizeText(item?.productId, "exclusive-item");
    const size = sanitizeText(item?.size, "ONE SIZE");
    const color = sanitizeText(item?.color, "Базовый");
    const priceValue = normalizePrice(item?.priceValue ?? item?.priceLabel);
    const quantity = Math.max(1, Number.parseInt(String(item?.quantity ?? "1"), 10) || 1);

    return {
      lineId: sanitizeText(item?.lineId, createLineId({ productId, size, color })),
      productId,
      title: sanitizeText(item?.title, "Товар EXCLUSIVE"),
      article: sanitizeText(item?.article, ""),
      size,
      color,
      image: sanitizeText(item?.image, ""),
      href: sanitizeText(item?.href, "/"),
      priceValue,
      priceLabel: sanitizeText(item?.priceLabel, formatPrice(priceValue)),
      quantity,
    };
  };

  const normalizeCart = (items) => (Array.isArray(items) ? items.map(normalizeCartItem) : []);

  const getStorageCandidates = () => {
    const candidates = [];

    if (typeof window.localStorage !== "undefined") {
      candidates.push(window.localStorage);
    }

    if (typeof window.sessionStorage !== "undefined") {
      candidates.push(window.sessionStorage);
    }

    return candidates;
  };

  const readFromStorage = (storage) => {
    try {
      return storage.getItem(CART_STORAGE_KEY);
    } catch (error) {
      return null;
    }
  };

  const writeToStorage = (storage, value) => {
    try {
      storage.setItem(CART_STORAGE_KEY, value);
      return true;
    } catch (error) {
      return false;
    }
  };

  const removeFromStorage = (storage) => {
    try {
      storage.removeItem(CART_STORAGE_KEY);
    } catch (error) {
      return;
    }
  };

  const readCart = () => {
    let firstValidCart = null;

    for (const storage of getStorageCandidates()) {
      const rawValue = readFromStorage(storage);

      if (!rawValue) {
        continue;
      }

      try {
        const parsedCart = normalizeCart(JSON.parse(rawValue));

        if (!firstValidCart) {
          firstValidCart = parsedCart;
        }

        if (parsedCart.length > 0) {
          return parsedCart;
        }
      } catch (error) {
        continue;
      }
    }

    if (firstValidCart) {
      return firstValidCart;
    }

    return normalizeCart(inMemoryFallback);
  };

  const getCartCount = (items = readCart()) => items.reduce((sum, item) => sum + item.quantity, 0);
  const getSubtotal = (items = readCart()) => items.reduce((sum, item) => sum + item.priceValue * item.quantity, 0);

  const emitCartChange = (items = readCart()) => {
    window.dispatchEvent(
      new CustomEvent(CART_EVENT, {
        detail: {
          items,
          count: getCartCount(items),
          subtotal: getSubtotal(items),
        },
      }),
    );
  };

  const saveCart = (items) => {
    const normalized = normalizeCart(items);
    const serialized = JSON.stringify(normalized);
    let persisted = false;

    inMemoryFallback.length = 0;
    inMemoryFallback.push(...normalized);

    for (const storage of getStorageCandidates()) {
      const isWritten = writeToStorage(storage, serialized);
      persisted = isWritten || persisted;

      if (isWritten) {
        continue;
      }

      removeFromStorage(storage);
    }

    if (!persisted) {
      emitCartChange(normalized);
      return normalized;
    }

    emitCartChange(normalized);
    return normalized;
  };

  const addToCart = (item) => {
    if (!requireAuth()) {
      return null;
    }

    const cart = readCart();
    const normalized = normalizeCartItem(item);
    const existingItem = cart.find((entry) => entry.lineId === normalized.lineId);

    if (existingItem) {
      existingItem.quantity += normalized.quantity;
    } else {
      cart.push(normalized);
    }

    saveCart(cart);
    return normalized;
  };

  const updateQuantity = (lineId, quantity) => {
    const cart = readCart();
    const nextQuantity = Math.max(0, Number.parseInt(String(quantity ?? "0"), 10) || 0);
    const item = cart.find((entry) => entry.lineId === lineId);

    if (!item) {
      return cart;
    }

    if (nextQuantity === 0) {
      return saveCart(cart.filter((entry) => entry.lineId !== lineId));
    }

    item.quantity = nextQuantity;
    return saveCart(cart);
  };

  const removeFromCart = (lineId) => saveCart(readCart().filter((item) => item.lineId !== lineId));
  const clearCart = () => saveCart([]);

  const hasCartItem = (descriptor) => {
    const lineId =
      typeof descriptor === "string"
        ? descriptor
        : createLineId({
            productId: descriptor?.productId,
            size: descriptor?.size,
            color: descriptor?.color,
          });

    return readCart().some((item) => item.lineId === lineId);
  };

  const mountCartBadge = (node) => {
    if (!node) {
      return () => {};
    }

    const render = (items = readCart()) => {
      const count = getCartCount(items);
      node.hidden = count < 1;
      node.textContent = count > 99 ? "99+" : String(count);
    };

    const handleCartChange = (event) => {
      render(event.detail?.items);
    };

    render();
    window.addEventListener(CART_EVENT, handleCartChange);

    return () => {
      window.removeEventListener(CART_EVENT, handleCartChange);
    };
  };

  window.addEventListener("storage", (event) => {
    if (event.key === CART_STORAGE_KEY) {
      emitCartChange(readCart());
    }
  });

  window.ExclusiveStore = {
    CART_EVENT,
    FREE_SHIPPING_THRESHOLD,
    addToCart,
    clearCart,
    createLineId,
    formatPrice,
    getCart: readCart,
    getCartCount,
    getSubtotal,
    hasCartItem,
    mountCartBadge,
    normalizePrice,
    removeFromCart,
    updateQuantity,
  };
})();
