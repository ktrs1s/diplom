(function initExclusiveCheckout() {
  const config = window.ExclusiveSiteConfig || {};
  const LOCAL_ORDERS_STORAGE_KEY = "exclusive-orders-v1";
  const POST_AUTH_INTENT_STORAGE_KEY = "exclusive-post-auth-intent-v1";

  const sanitizeText = (value, fallback = "") => {
    if (typeof value !== "string") {
      return fallback;
    }

    const trimmed = value.trim();
    return trimmed || fallback;
  };

  const readOrders = () => {
    try {
      const rawValue = window.localStorage.getItem(LOCAL_ORDERS_STORAGE_KEY);
      return rawValue ? JSON.parse(rawValue) : [];
    } catch (error) {
      return [];
    }
  };

  const saveOrders = (orders) => {
    try {
      window.localStorage.setItem(LOCAL_ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (error) {
      return;
    }
  };

  const getDeliveryPrice = (subtotal) => {
    if (!window.ExclusiveStore) {
      return 0;
    }

    if (subtotal === 0 || subtotal >= window.ExclusiveStore.FREE_SHIPPING_THRESHOLD) {
      return 0;
    }

    return 490;
  };

  const buildOrderDraft = (items, user) => {
    const subtotal = window.ExclusiveStore?.getSubtotal(items) || 0;
    const delivery = getDeliveryPrice(subtotal);
    const total = subtotal + delivery;
    const orderId = `EX-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Date.now().toString(36).toUpperCase()}`;

    return {
      id: orderId,
      status: "draft",
      createdAt: new Date().toISOString(),
      customer: {
        firstName: sanitizeText(user?.firstName),
        lastName: sanitizeText(user?.lastName),
        phone: sanitizeText(user?.phone),
      },
      items: items.map((item) => ({
        lineId: item.lineId,
        productId: item.productId,
        title: item.title,
        article: item.article,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        priceValue: item.priceValue,
        priceLabel: item.priceLabel,
      })),
      subtotal,
      delivery,
      total,
      sourceUrl: `${window.location.pathname}${window.location.search}`,
    };
  };

  const requestJson = async (path, payload) => {
    if (typeof window.fetch !== "function" || !config.apiBaseUrl) {
      throw new Error("API unavailable");
    }

    let response;

    try {
      response = await window.fetch(config.getApiUrl(path), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      const nextError = new Error("API unavailable");
      nextError.isApiResponse = false;
      throw nextError;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      const nextError = new Error(data.error || "Не удалось продолжить оформление.");
      nextError.isApiResponse = true;
      throw nextError;
    }

    return data;
  };

  const createLocalOrder = (order) => {
    const orders = readOrders();
    orders.unshift(order);
    saveOrders(orders);

    return {
      order,
      botUrl: config.getTelegramBotUrl(`order_${order.id}`),
      botReady: Boolean(config.telegramBotUsername),
      source: "local",
    };
  };

  const createRemoteOrder = async (order) => {
    const sessionToken = window.ExclusiveAuth?.getSessionToken?.() || "";
    const data = await requestJson("orders", {
      sessionToken,
      customer: order.customer,
      items: order.items,
      subtotal: order.subtotal,
      delivery: order.delivery,
      total: order.total,
      sourceUrl: order.sourceUrl,
    });

    return {
      order: data.order,
      botUrl: sanitizeText(data.botUrl, config.getTelegramBotUrl(`order_${order.id}`)),
      botReady: Boolean(data.botReady),
      source: "api",
    };
  };

  const redirectToAuth = (returnUrl) => {
    try {
      window.sessionStorage.setItem(POST_AUTH_INTENT_STORAGE_KEY, "checkout");
    } catch (error) {
      return;
    }

    const authUrl = window.ExclusiveAuth?.getAuthUrl({
      mode: "login",
      redirect: returnUrl,
      intent: "checkout",
    });

    window.location.href = authUrl || "../auth/index.html";
  };

  const consumePendingIntent = () => {
    try {
      const intent = window.sessionStorage.getItem(POST_AUTH_INTENT_STORAGE_KEY);

      if (!intent) {
        return "";
      }

      window.sessionStorage.removeItem(POST_AUTH_INTENT_STORAGE_KEY);
      return intent;
    } catch (error) {
      return "";
    }
  };

  const beginCheckout = async ({ items, returnUrl = `${window.location.pathname}${window.location.search}` } = {}) => {
    const nextItems = Array.isArray(items) ? items : window.ExclusiveStore?.getCart?.() || [];

    if (!nextItems.length) {
      throw new Error("Добавьте товары в корзину.");
    }

    const currentUser = window.ExclusiveAuth?.getCurrentUser?.();

    if (!currentUser) {
      redirectToAuth(returnUrl);
      return {
        redirected: true,
      };
    }

    const draft = buildOrderDraft(nextItems, currentUser);

    try {
      const result = await createRemoteOrder(draft);
      window.location.href = result.botUrl;
      return result;
    } catch (error) {
      if (error?.isApiResponse) {
        throw error;
      }

      const fallback = createLocalOrder(draft);
      window.location.href = fallback.botUrl;
      return fallback;
    }
  };

  window.ExclusiveCheckout = {
    POST_AUTH_INTENT_STORAGE_KEY,
    beginCheckout,
    consumePendingIntent,
    readOrders,
  };
})();
