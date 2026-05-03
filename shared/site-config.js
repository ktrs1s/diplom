(function initExclusiveSiteConfig() {
  const API_BASE_URL = "/api";
  const TELEGRAM_BOT_USERNAME = "exclusive_order_bot";
  const DEMO_PHONE = "+79999999999";
  const ADMIN_PHONES = ["+79953980243"];

  const buildTelegramUrl = (username, payload = "") => {
    const trimmed = String(username || "").trim().replace(/^@/, "");

    if (!trimmed) {
      return "https://t.me/";
    }

    const url = new URL(`https://t.me/${trimmed}`);

    if (payload) {
      url.searchParams.set("start", payload);
    }

    return url.toString();
  };

  window.ExclusiveSiteConfig = {
    apiBaseUrl: API_BASE_URL,
    adminPhones: ADMIN_PHONES,
    demoPhone: DEMO_PHONE,
    telegramBotUsername: TELEGRAM_BOT_USERNAME,
    getApiUrl(path = "") {
      const cleanPath = String(path || "").replace(/^\/+/, "");
      return cleanPath ? `${API_BASE_URL}/${cleanPath}` : API_BASE_URL;
    },
    getTelegramBotUrl(payload = "") {
      return buildTelegramUrl(TELEGRAM_BOT_USERNAME, payload);
    },
    isAdminPhone(phone = "") {
      return ADMIN_PHONES.includes(String(phone || "").trim());
    },
  };
})();
