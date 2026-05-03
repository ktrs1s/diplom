(function initExclusiveAuth() {
  const config = window.ExclusiveSiteConfig || {};
  const ACCOUNTS_STORAGE_KEY = "exclusive-accounts-v1";
  const SESSION_STORAGE_KEY = "exclusive-session-v1";
  const LOCAL_ORDERS_STORAGE_KEY = "exclusive-orders-v1";
  const AUTH_EVENT = "exclusive:authchange";

  const buildAuthPageUrl = () => new URL("../auth/index.html", window.location.href);
  const buildAccountPageUrl = () => new URL("../account/index.html", window.location.href);

  const sanitizeText = (value, fallback = "") => {
    if (typeof value !== "string") {
      return fallback;
    }

    const trimmed = value.trim();
    return trimmed || fallback;
  };

  const normalizePhone = (value) => {
    const digits = String(value || "").replace(/[^\d]/g, "");

    if (!digits) {
      return "";
    }

    if (digits.length < 10) {
      return "";
    }

    if (digits.length === 10) {
      return `+7${digits}`;
    }

    if (digits.length === 11 && digits.startsWith("8")) {
      return `+7${digits.slice(1)}`;
    }

    if (digits.length === 11 && digits.startsWith("7")) {
      return `+${digits}`;
    }

    return `+${digits}`;
  };

  const formatPhone = (value) => {
    const normalized = normalizePhone(value);
    const digits = normalized.replace(/[^\d]/g, "");

    if (digits.length === 11 && digits.startsWith("7")) {
      return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
    }

    return normalized;
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const buildDemoUser = () => ({
    id: "demo-user",
    firstName: "Demo",
    lastName: "Client",
    phone: normalizePhone(config.demoPhone || "+79999999999"),
    createdAt: Date.now(),
  });

  const readJson = (key, fallback) => {
    try {
      const rawValue = window.localStorage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const writeJson = (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      return;
    }
  };

  const getStoredAccounts = () => {
    const storedValue = readJson(ACCOUNTS_STORAGE_KEY, []);
    const stored = Array.isArray(storedValue) ? storedValue : [];
    const normalized = stored
      .map((entry) => ({
        id: sanitizeText(entry?.id, `user-${Date.now()}`),
        firstName: sanitizeText(entry?.firstName),
        lastName: sanitizeText(entry?.lastName),
        phone: normalizePhone(entry?.phone),
        createdAt: Number(entry?.createdAt) || Date.now(),
      }))
      .filter((entry) => entry.firstName && entry.lastName && entry.phone);

    if (!normalized.some((entry) => entry.phone === normalizePhone(config.demoPhone || "+79999999999"))) {
      normalized.unshift(buildDemoUser());
      writeJson(ACCOUNTS_STORAGE_KEY, normalized);
    }

    return normalized;
  };

  const saveAccounts = (accounts) => {
    writeJson(ACCOUNTS_STORAGE_KEY, accounts);
    return accounts;
  };

  const updateStoredUser = (userId, changes) => {
    const accounts = getStoredAccounts();
    const nextAccounts = accounts.map((account) => {
      if (account.id !== userId) {
        return account;
      }

      return {
        ...account,
        ...changes,
        phone: normalizePhone(changes.phone ?? account.phone),
      };
    });

    saveAccounts(nextAccounts);
    return nextAccounts.find((account) => account.id === userId) || null;
  };

  const upsertAccount = (user) => {
    const accounts = getStoredAccounts();
    const normalizedPhone = normalizePhone(user?.phone);
    const nextUser = {
      id: sanitizeText(user?.id, `user-${Date.now()}`),
      firstName: sanitizeText(user?.firstName),
      lastName: sanitizeText(user?.lastName),
      phone: normalizedPhone,
      createdAt: Date.now(),
    };
    const existingIndex = accounts.findIndex((entry) => entry.phone === normalizedPhone);

    if (existingIndex >= 0) {
      accounts[existingIndex] = {
        ...accounts[existingIndex],
        ...nextUser,
      };
    } else {
      accounts.unshift(nextUser);
    }

    saveAccounts(accounts);
  };

  const getSession = () => {
    const session = readJson(SESSION_STORAGE_KEY, null);

    if (!session || typeof session !== "object") {
      return null;
    }

    if (!session.user || !session.user.phone) {
      return null;
    }

    return {
      sessionToken: sanitizeText(session.sessionToken),
      user: {
        id: sanitizeText(session.user.id),
        firstName: sanitizeText(session.user.firstName),
        lastName: sanitizeText(session.user.lastName),
        phone: normalizePhone(session.user.phone),
      },
    };
  };

  const emitAuthChange = () => {
    window.dispatchEvent(
      new CustomEvent(AUTH_EVENT, {
        detail: {
          user: getCurrentUser(),
        },
      }),
    );
  };

  const saveSession = ({ user, sessionToken = "" }) => {
    writeJson(SESSION_STORAGE_KEY, {
      sessionToken: sanitizeText(sessionToken),
      user: {
        id: sanitizeText(user?.id),
        firstName: sanitizeText(user?.firstName),
        lastName: sanitizeText(user?.lastName),
        phone: normalizePhone(user?.phone),
      },
    });
    emitAuthChange();
  };

  const clearSession = () => {
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      return;
    }

    emitAuthChange();
  };

  const updateSessionUser = (user) => {
    const currentSession = getSession();

    if (!currentSession) {
      return;
    }

    saveSession({
      sessionToken: currentSession.sessionToken,
      user,
    });
  };

  const getCurrentUser = () => getSession()?.user || null;
  const getSessionToken = () => getSession()?.sessionToken || "";
  const isAuthenticated = () => Boolean(getCurrentUser());
  const isAdminUser = (user = getCurrentUser()) => Boolean(user?.phone && config.isAdminPhone?.(normalizePhone(user.phone)));

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
      const nextError = new Error(data.error || "Не удалось выполнить запрос.");
      nextError.isApiResponse = true;
      throw nextError;
    }

    return data;
  };

  const login = async (phone) => {
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      throw new Error("Введите номер телефона.");
    }

    try {
      const data = await requestJson("auth/login", { phone: normalizedPhone });
      upsertAccount(data.user);
      saveSession({
        user: data.user,
        sessionToken: data.sessionToken,
      });
      return data.user;
    } catch (error) {
      if (error?.isApiResponse) {
        throw error;
      }

      const account = getStoredAccounts().find((entry) => entry.phone === normalizedPhone);

      if (!account) {
        throw new Error("Аккаунт с таким номером не найден.");
      }

      saveSession({
        user: account,
        sessionToken: "",
      });
      return account;
    }
  };

  const register = async ({ firstName, lastName, phone }) => {
    const normalizedFirstName = sanitizeText(firstName);
    const normalizedLastName = sanitizeText(lastName);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedFirstName || !normalizedLastName || !normalizedPhone) {
      throw new Error("Заполните имя, фамилию и телефон.");
    }

    try {
      const data = await requestJson("auth/register", {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        phone: normalizedPhone,
      });

      upsertAccount(data.user);
      saveSession({
        user: data.user,
        sessionToken: data.sessionToken,
      });

      return data.user;
    } catch (error) {
      if (error?.isApiResponse) {
        throw error;
      }

      const accounts = getStoredAccounts();

      if (accounts.some((entry) => entry.phone === normalizedPhone)) {
        throw new Error("Аккаунт с таким номером уже существует.");
      }

      const user = {
        id: `user-${Date.now()}`,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        phone: normalizedPhone,
        createdAt: Date.now(),
      };

      accounts.unshift(user);
      saveAccounts(accounts);
      saveSession({
        user,
        sessionToken: "",
      });
      return user;
    }
  };

  const logout = async () => {
    clearSession();
  };

  const getLocalOrders = () => {
    const storedOrders = readJson(LOCAL_ORDERS_STORAGE_KEY, []);
    return Array.isArray(storedOrders) ? storedOrders : [];
  };

  const getLocalAccountData = () => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      throw new Error("Сессия не найдена.");
    }

    const orders = getLocalOrders().filter((order) => normalizePhone(order?.customer?.phone) === currentUser.phone);

    return {
      user: currentUser,
      orders,
    };
  };

  const getAccountData = async () => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      throw new Error("Сессия не найдена.");
    }

    try {
      const data = await requestJson("account", {
        sessionToken: getSessionToken(),
      });

      upsertAccount(data.user);
      updateSessionUser(data.user);

      return {
        user: data.user,
        orders: Array.isArray(data.orders) ? data.orders : [],
      };
    } catch (error) {
      if (error?.isApiResponse) {
        throw error;
      }

      return getLocalAccountData();
    }
  };

  const updateProfile = async ({ firstName, lastName, phone }) => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      throw new Error("Сессия не найдена.");
    }

    const payload = {
      firstName: sanitizeText(firstName),
      lastName: sanitizeText(lastName),
      phone: normalizePhone(phone),
    };

    if (!payload.firstName || !payload.lastName || !payload.phone) {
      throw new Error("Заполните имя, фамилию и телефон.");
    }

    try {
      const data = await requestJson("account/update", {
        sessionToken: getSessionToken(),
        ...payload,
      });

      upsertAccount(data.user);
      updateSessionUser(data.user);
      return data.user;
    } catch (error) {
      if (error?.isApiResponse) {
        throw error;
      }

      const previousPhone = currentUser.phone;
      const nextUser = updateStoredUser(currentUser.id, payload) || {
        ...currentUser,
        ...payload,
      };

      updateSessionUser(nextUser);

      const nextOrders = getLocalOrders().map((order) => {
        if (normalizePhone(order?.customer?.phone) !== previousPhone) {
          return order;
        }

        return {
          ...order,
          customer: {
            ...order.customer,
            firstName: nextUser.firstName,
            lastName: nextUser.lastName,
            phone: nextUser.phone,
          },
        };
      });

      writeJson(LOCAL_ORDERS_STORAGE_KEY, nextOrders);
      return nextUser;
    }
  };

  const getAuthUrl = ({ mode = "login", redirect = "", intent = "" } = {}) => {
    const url = buildAuthPageUrl();

    if (mode) {
      url.searchParams.set("mode", mode);
    }

    if (redirect) {
      url.searchParams.set("redirect", redirect);
    }

    if (intent) {
      url.searchParams.set("intent", intent);
    }

    return url.toString();
  };

  const getAccountUrl = ({ redirect = "" } = {}) => {
    const url = buildAccountPageUrl();

    if (redirect) {
      url.searchParams.set("redirect", redirect);
    }

    return url.toString();
  };

  const mountProfileLinks = (nodes) => {
    const links = Array.from(nodes || []);
    const currentUser = getCurrentUser();

    links.forEach((link) => {
      if (!(link instanceof HTMLElement)) {
        return;
      }

      link.setAttribute("href", currentUser ? getAccountUrl() : getAuthUrl({ mode: "login" }));
      link.dataset.authState = currentUser ? "authorized" : "guest";

      if (currentUser) {
        const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
        link.setAttribute("aria-label", `Аккаунт ${fullName}`);
        link.setAttribute("title", `${fullName} · ${formatPhone(currentUser.phone)}`);
      } else {
        link.setAttribute("aria-label", "Войти или зарегистрироваться");
        link.setAttribute("title", "Войти или зарегистрироваться");
      }
    });
  };

  getStoredAccounts();

  window.ExclusiveAuth = {
    AUTH_EVENT,
    buildAccountPageUrl,
    buildAuthPageUrl,
    escapeHtml,
    getAccountData,
    getAccountUrl,
    formatPhone,
    getAuthUrl,
    getCurrentUser,
    getSessionToken,
    isAdminUser,
    isAuthenticated,
    login,
    logout,
    mountProfileLinks,
    normalizePhone,
    register,
    updateProfile,
  };
})();
