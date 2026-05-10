(function initExclusiveAuth() {
  const config = window.ExclusiveSiteConfig || {};
  const ACCOUNTS_STORAGE_KEY = "exclusive-accounts-v1";
  const SESSION_STORAGE_KEY = "exclusive-session-v1";
  const LOCAL_ORDERS_STORAGE_KEY = "exclusive-orders-v1";
  const AUTH_EVENT = "exclusive:authchange";
  const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;

  const buildAuthPageUrl = () => new URL("/auth/", window.location.origin);
  const buildAccountPageUrl = () => new URL("/account/", window.location.origin);

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

  const normalizeEmail = (value) => {
    const email = sanitizeText(String(value || "").toLowerCase());
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : "";
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
    city: "",
    email: "",
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

  const removeSessionValue = () => {
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
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
        city: sanitizeText(entry?.city),
        phone: normalizePhone(entry?.phone),
        email: normalizeEmail(entry?.email),
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
        email: normalizeEmail(changes.email ?? account.email),
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
      city: sanitizeText(user?.city),
      phone: normalizedPhone,
      email: normalizeEmail(user?.email),
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
      removeSessionValue();
      return null;
    }

    const lastSeenAt = Number(session.lastSeenAt) || 0;

    if (!lastSeenAt || Date.now() - lastSeenAt > SESSION_TTL_MS) {
      removeSessionValue();
      return null;
    }

    if (Date.now() - lastSeenAt > 10_000) {
      writeJson(SESSION_STORAGE_KEY, {
        ...session,
        lastSeenAt: Date.now(),
      });
    }

    return {
      sessionToken: sanitizeText(session.sessionToken),
      lastSeenAt,
      user: {
        id: sanitizeText(session.user.id),
        firstName: sanitizeText(session.user.firstName),
        lastName: sanitizeText(session.user.lastName),
        city: sanitizeText(session.user.city),
        phone: normalizePhone(session.user.phone),
        email: normalizeEmail(session.user.email),
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
      lastSeenAt: Date.now(),
      user: {
        id: sanitizeText(user?.id),
        firstName: sanitizeText(user?.firstName),
        lastName: sanitizeText(user?.lastName),
        city: sanitizeText(user?.city),
        phone: normalizePhone(user?.phone),
        email: normalizeEmail(user?.email),
      },
    });
    emitAuthChange();
  };

  const clearSession = () => {
    removeSessionValue();

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
  const wait = (delay) => new Promise((resolve) => window.setTimeout(resolve, delay));
  const isTemporaryApiErrorMessage = (message) =>
    /api proxy|urlopen|connection refused|connection reset|failed to fetch|networkerror|bad gateway|gateway timeout|upstream/i.test(
      String(message || ""),
    );

  const requestJson = async (path, payload, attempt = 0) => {
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
      if (attempt < 3) {
        await wait(600 + attempt * 700);
        return requestJson(path, payload, attempt + 1);
      }

      const nextError = new Error("API unavailable");
      nextError.isApiResponse = false;
      throw nextError;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      const rawError = data.error || "Не удалось выполнить запрос.";
      const isSessionError = /сессия/i.test(String(rawError));
      const isTemporaryApiError = isTemporaryApiErrorMessage(rawError);

      if (isTemporaryApiError && attempt < 3) {
        await wait(600 + attempt * 700);
        return requestJson(path, payload, attempt + 1);
      }

      if (isSessionError) {
        clearSession();
      }

      const nextError = new Error(
        isSessionError
          ? "Сессия истекла. Войди снова."
          : isTemporaryApiError
            ? "Сервер авторизации временно недоступен. Попробуй еще раз через несколько секунд."
            : rawError,
      );
      nextError.isApiResponse = true;
      throw nextError;
    }

    return data;
  };

  const normalizeLogin = (value) => {
    const trimmed = sanitizeText(value);
    return normalizeEmail(trimmed) || normalizePhone(trimmed);
  };

  const login = async ({ login: loginValue, password }) => {
    const normalizedLogin = normalizeLogin(loginValue);
    const normalizedPassword = String(password || "");

    if (!normalizedLogin || !normalizedPassword) {
      throw new Error("Введите номер телефона или адрес электронной почты и пароль.");
    }

    const data = await requestJson("auth/login", {
      login: normalizedLogin,
      password: normalizedPassword,
    });

    if (data.user && data.sessionToken) {
      upsertAccount(data.user);
      saveSession({
        user: data.user,
        sessionToken: data.sessionToken,
      });

      return data.user;
    }

    return data;
  };

  const register = async ({ firstName, lastName, city, phone, email, password }) => {
    const normalizedFirstName = sanitizeText(firstName);
    const normalizedLastName = sanitizeText(lastName);
    const normalizedCity = sanitizeText(city);
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = String(password || "");

    if (!normalizedFirstName || !normalizedLastName || !normalizedCity || !normalizedPhone || !normalizedEmail) {
      throw new Error("Заполните имя, фамилию, город, телефон и почту.");
    }

    if (normalizedPassword.length < 6) {
      throw new Error("Пароль должен быть не короче 6 символов.");
    }

    const data = await requestJson("auth/register", {
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      city: normalizedCity,
      phone: normalizedPhone,
      email: normalizedEmail,
      password: normalizedPassword,
    });

    if (data.user && data.sessionToken) {
      upsertAccount(data.user);
      saveSession({
        user: data.user,
        sessionToken: data.sessionToken,
      });

      return data.user;
    }

    return data;
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

  const updateProfile = async ({ firstName, lastName, city, phone, email }) => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      throw new Error("Сессия не найдена.");
    }

    const payload = {
      firstName: sanitizeText(firstName),
      lastName: sanitizeText(lastName),
      city: sanitizeText(city),
      phone: normalizePhone(phone),
      email: normalizeEmail(email),
    };

    if (!payload.firstName || !payload.lastName || !payload.city || !payload.phone || !payload.email) {
      throw new Error("Заполните имя, фамилию, город, телефон и почту.");
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
            email: nextUser.email,
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
    normalizeEmail,
    normalizePhone,
    register,
    updateProfile,
  };
})();
