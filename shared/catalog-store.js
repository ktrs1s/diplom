(function initExclusiveCatalog() {
  const STORAGE_KEY = "exclusive-catalog-v2";
  const CATALOG_EVENT = "exclusive:catalogchange";
  const DEFAULT_PALETTE = ["#f4eee6", "#ccb39d"];
  const moneyFormatter = new Intl.NumberFormat("ru-RU");
  const inMemoryFallback = { categories: [], products: [], banners: [] };
  const config = window.ExclusiveSiteConfig || {};
  let readyPromise = null;

  const BUILTIN_SECTIONS = [
    {
      key: "outerwear",
      title: "Верхняя одежда",
      description: "Пальто, куртки, ветровки и джинсовые куртки EXCLUSIVE.",
      palette: ["#efe3d8", "#c7ac95"],
      showOnHome: true,
      subcategories: [
        { key: "palto", title: "Пальто", itemLabel: "Пальто", count: 5, basePrice: 6990, step: 420, sizes: ["S", "M", "L"], swatch: "#d2b49c", palette: ["#f4e9df", "#ccb29c"] },
        { key: "kurtki", title: "Куртки", itemLabel: "Куртка", count: 15, basePrice: 4590, step: 320, sizes: ["S", "M", "L"], swatch: "#8b5f49", palette: ["#d8c1b1", "#8b5f49"] },
        { key: "vetrovki", title: "Ветровки", itemLabel: "Ветровка", count: 7, basePrice: 3490, step: 260, sizes: ["S", "M", "L"], swatch: "#c7b099", palette: ["#f0e4d6", "#c7b099"] },
        { key: "denim-jackets", title: "Джинсовые куртки", itemLabel: "Джинсовая куртка", count: 3, basePrice: 3990, step: 340, sizes: ["S", "M"], swatch: "#7f9db9", palette: ["#dbe7ef", "#7f9db9"] },
      ],
    },
    {
      key: "jeans",
      title: "Джинсы",
      description: "Женские джинсы EXCLUSIVE в базовой и современной посадке.",
      palette: ["#dce8ef", "#7c9db6"],
      showOnHome: true,
      subcategories: [{ key: "all", title: "Все товары", itemLabel: "Джинсы", count: 20, basePrice: 2990, step: 250, sizes: ["25", "26", "27", "28", "29"], swatch: "#7798b4", palette: ["#dce8ef", "#7c9db6"] }],
    },
    {
      key: "trousers",
      title: "Брюки",
      description: "Брюки EXCLUSIVE для повседневных и более собранных образов.",
      palette: ["#efe7da", "#b2a088"],
      showOnHome: true,
      subcategories: [{ key: "all", title: "Все товары", itemLabel: "Брюки", count: 12, basePrice: 2690, step: 240, sizes: ["S", "M", "L"], swatch: "#9f9f9f", palette: ["#efede8", "#b6b6b6"] }],
    },
    {
      key: "suits",
      title: "Костюмы",
      description: "Спортивные, классические и летние костюмы EXCLUSIVE.",
      palette: ["#e3e8d1", "#9daa70"],
      showOnHome: true,
      subcategories: [
        { key: "sport", title: "Спортивные костюмы", itemLabel: "Спортивный костюм", count: 4, basePrice: 3990, step: 300, sizes: ["S", "M", "L"], swatch: "#87936b", palette: ["#e5ead6", "#97a36d"] },
        { key: "classic", title: "Классические костюмы", itemLabel: "Классический костюм", count: 4, basePrice: 4990, step: 360, sizes: ["S", "M", "L"], swatch: "#786157", palette: ["#e4d8d2", "#8d6f64"] },
        { key: "summer", title: "Летние костюмы", itemLabel: "Летний костюм", count: 4, basePrice: 3790, step: 260, sizes: ["S", "M"], swatch: "#d3c0a2", palette: ["#f3ead8", "#ccb18e"] },
      ],
    },
    {
      key: "knitwear",
      title: "Джемперы и свитеры",
      description: "Мягкий трикотаж EXCLUSIVE в спокойной сезонной палитре.",
      palette: ["#f4e7eb", "#caabb5"],
      showOnHome: true,
      subcategories: [{ key: "all", title: "Все товары", itemLabel: "Джемпер", count: 12, basePrice: 2490, step: 220, sizes: ["ONE SIZE"], swatch: "#d7b4be", palette: ["#f6ecef", "#d8b3bf"] }],
    },
    {
      key: "tops",
      title: "Футболки, поло и лонгсливы",
      description: "Базовый верх EXCLUSIVE для ежедневного гардероба.",
      palette: ["#efe4da", "#bc9b87"],
      showOnHome: true,
      subcategories: [{ key: "all", title: "Все товары", itemLabel: "Лонгслив", count: 12, basePrice: 1490, step: 130, sizes: ["S", "M", "L"], swatch: "#c39b84", palette: ["#f4e7df", "#c7a08c"] }],
    },
    {
      key: "shoes",
      title: "Обувь",
      description: "Летняя обувь, туфли, сапоги, ботильоны, кроссовки и кеды EXCLUSIVE.",
      palette: ["#ece9e4", "#8b7c73"],
      showOnHome: true,
      subcategories: [
        { key: "summer-2026", title: "Лето 2026", itemLabel: "Летняя обувь", count: 28, basePrice: 2490, step: 160, sizes: ["36", "37", "38", "39", "40"], swatch: "#d0c0a8", palette: ["#f5eee3", "#d4c1a4"] },
        { key: "heels", title: "Туфли", itemLabel: "Туфли", count: 35, basePrice: 4290, step: 200, sizes: ["36", "37", "38", "39", "40"], swatch: "#503f3a", palette: ["#e8ddd8", "#6e5b56"] },
        { key: "boots", title: "Сапоги и ботильоны", itemLabel: "Сапоги", count: 30, basePrice: 4990, step: 240, sizes: ["36", "37", "38", "39", "40"], swatch: "#2f2f2f", palette: ["#e0dfdf", "#444444"] },
        { key: "sneakers", title: "Кроссовки и кеды", itemLabel: "Кроссовки", count: 19, basePrice: 2890, step: 170, sizes: ["36", "37", "38", "39", "40"], swatch: "#f5f5f5", palette: ["#ffffff", "#dadada"] },
      ],
    },
    {
      key: "accessories",
      title: "Аксессуары",
      description: "Шапки, кепки, платки, сумки и шарфы EXCLUSIVE.",
      palette: ["#f0ebe4", "#a7927e"],
      showOnHome: false,
      subcategories: [
        { key: "hats", title: "Шапки", itemLabel: "Шапка", count: 10, basePrice: 1190, step: 100, sizes: ["ONE SIZE"], swatch: "#b6a08c", palette: ["#eee8dd", "#c4af99"] },
        { key: "caps", title: "Кепки", itemLabel: "Кепка", count: 6, basePrice: 1390, step: 100, sizes: ["ONE SIZE"], swatch: "#9a8d83", palette: ["#ebe6df", "#b1a39a"] },
        { key: "scarves-light", title: "Платки", itemLabel: "Платок", count: 7, basePrice: 1490, step: 110, sizes: ["ONE SIZE"], swatch: "#d0b6bf", palette: ["#f7edf1", "#d5b7c1"] },
        { key: "bags", title: "Сумки", itemLabel: "Сумка", count: 18, basePrice: 2390, step: 180, sizes: ["ONE SIZE"], swatch: "#8f6e5a", palette: ["#ead8cc", "#9a775f"] },
        { key: "scarves", title: "Шарфы", itemLabel: "Шарф", count: 11, basePrice: 1290, step: 100, sizes: ["ONE SIZE"], swatch: "#cabba5", palette: ["#f3eddf", "#c7b28e"] },
      ],
    },
  ];

  const TITLE_SUFFIXES = [
    "из коллекции весна 2026",
    "для базового гардероба",
    "в мягком силуэте",
    "в новой палитре сезона",
  ];

  const FEATURED_PRODUCT_SEEDS = [
    { id: "home-new-trench-beige", categoryKey: "outerwear", title: "Бежевый удлиненный классический тренч из хлопка", priceValue: 5999, sizes: ["S", "M"], colors: ["Бежевый"], palette: ["#f1e7d4", "#ccb18f"], label: "ТРЕНЧ" },
    { id: "home-new-suit-brown", categoryKey: "suits", title: "Коричневый свободный женский костюм со свитшотом и широкими брюками", priceValue: 4399, sizes: ["S", "M"], colors: ["Коричневый"], palette: ["#a48877", "#5e3c34"], label: "КОСТЮМ" },
    { id: "home-new-cardigan-beige", categoryKey: "knitwear", title: "Бежевый классический женский кардиган с поясом", priceValue: 3999, sizes: ["ONE SIZE"], colors: ["Бежевый"], palette: ["#f4eee7", "#c9b79e"], label: "КАРДИГАН" },
    { id: "home-new-jacket-brown", categoryKey: "outerwear", title: "Коричневая демисезонная женская куртка на пуговицах", priceValue: 4999, sizes: ["S", "M"], colors: ["Коричневый"], palette: ["#c7b3a4", "#755444"], label: "КУРТКА" },
    { id: "home-new-puffer-milk", categoryKey: "outerwear", title: "Молочная объемная женская куртка с капюшоном", priceValue: 4999, sizes: ["S", "M"], colors: ["Молочный"], palette: ["#fbf6ef", "#d8cec2"], label: "ПУХОВИК" },
    { id: "home-new-sweatshirt-pink", categoryKey: "tops", title: "Розовый свободный женский свитшот с вышивкой", priceValue: 1999, sizes: ["ONE SIZE"], colors: ["Розовый"], palette: ["#fde8ef", "#e5a8bb"], label: "СВИТШОТ" },

    { id: "home-popular-jacket-black", categoryKey: "outerwear", title: "Черный приталенный женский жакет с расклешенными рукавами", priceValue: 3499, sizes: ["S", "M"], colors: ["Черный"], palette: ["#494450", "#111111"], label: "ЖАКЕТ" },
    { id: "home-popular-jacket-milk", categoryKey: "outerwear", title: "Молочная женская куртка с капюшоном и объемным силуэтом", priceValue: 4999, sizes: ["S", "M"], colors: ["Молочный"], palette: ["#fdf9ef", "#d6ccb7"], label: "КУРТКА" },
    { id: "home-popular-sweatshirt-pink", categoryKey: "tops", title: "Розовый комфортный свитшот в расслабленном стиле", priceValue: 1999, sizes: ["ONE SIZE"], colors: ["Розовый"], palette: ["#fce7ef", "#e3a7bc"], label: "СВИТШОТ" },
    { id: "home-popular-set-gray", categoryKey: "suits", title: "Серый повседневный комплект с рубашкой и юбкой", priceValue: 2499, sizes: ["ONE SIZE"], colors: ["Серый"], palette: ["#eaebef", "#b5b8c2"], label: "КОМПЛЕКТ" },
    { id: "home-popular-trench-brown", categoryKey: "outerwear", title: "Коричневый удлиненный классический тренч из хлопка", priceValue: 5999, sizes: ["S", "M"], colors: ["Коричневый"], palette: ["#d9cec4", "#916750"], label: "ТРЕНЧ" },
    { id: "home-popular-blazer-white", categoryKey: "outerwear", title: "Белый классический приталенный женский пиджак", priceValue: 3499, sizes: ["S", "M"], colors: ["Белый"], palette: ["#f6f4ef", "#d7d3cb"], label: "ПИДЖАК" },

    { id: "home-shoes-boots-black", categoryKey: "shoes", title: "Чёрные классические демисезонные женские ботинки из экокожи", priceValue: 4999, sizes: ["36", "37", "38", "39", "40"], colors: ["Черный"], palette: ["#dedede", "#404040"], label: "БОТИНКИ" },
    { id: "home-shoes-sneakers-white", categoryKey: "shoes", title: "Белые повседневные женские кроссовки", priceValue: 2499, sizes: ["37", "38", "39", "40"], colors: ["Белый"], palette: ["#ffffff", "#d7d7d7"], label: "КРОССОВКИ" },
    { id: "home-shoes-boots-brown", categoryKey: "shoes", title: "Коричневые классические женские сапоги на каблуке", priceValue: 4499, sizes: ["36", "37", "38", "39", "40"], colors: ["Коричневый"], palette: ["#e7d9ce", "#6e4c40"], label: "САПОГИ" },
    { id: "home-shoes-boots-high-black", categoryKey: "shoes", title: "Чёрные высокие женские сапоги на устойчивом каблуке", priceValue: 5299, sizes: ["36", "37", "38", "39", "40"], colors: ["Черный"], palette: ["#d7d7d7", "#2f2f2f"], label: "САПОГИ" },

    { id: "home-catalog-tee-brown", categoryKey: "tops", title: "Коричневая свободная женская футболка из хлопка", priceValue: 999, sizes: ["ONE SIZE"], colors: ["Коричневый"], palette: ["#efe3da", "#bc9a84"], label: "ФУТБОЛКА" },
    { id: "home-catalog-dress-polo-milk", categoryKey: "knitwear", title: "Молочное трикотажное женское платье-поло из вискозы", priceValue: 2299, sizes: ["ONE SIZE"], colors: ["Молочный"], palette: ["#f8f3ea", "#d7c4a7"], label: "ПЛАТЬЕ" },
    { id: "home-catalog-suit-brown", categoryKey: "suits", title: "Коричневый повседневный женский костюм с лонгсливом и брюками", priceValue: 3299, sizes: ["ONE SIZE"], colors: ["Коричневый"], palette: ["#cbb6ab", "#7c5f53"], label: "КОСТЮМ" },
    { id: "home-catalog-trench-beige", categoryKey: "outerwear", title: "Бежевый удлинённый классический тренч с поясом", priceValue: 5999, sizes: ["S", "M"], colors: ["Бежевый"], palette: ["#efe4d3", "#c3a581"], label: "ТРЕНЧ" },
    { id: "home-catalog-sweater-light", categoryKey: "knitwear", title: "Светлый женский свитер свободного силуэта", priceValue: 2799, sizes: ["ONE SIZE"], colors: ["Кремовый"], palette: ["#faf5ea", "#dbc8aa"], label: "СВИТЕР" },
    { id: "home-catalog-trousers-gray", categoryKey: "trousers", title: "Серые широкие женские брюки на каждый день", priceValue: 2499, sizes: ["S", "M"], colors: ["Серый"], palette: ["#ededed", "#b5b5b5"], label: "БРЮКИ" },
    { id: "home-catalog-dress-black", categoryKey: "knitwear", title: "Черное женское платье-миди с аккуратным силуэтом", priceValue: 3799, sizes: ["S", "M"], colors: ["Черный"], palette: ["#d9d2d0", "#4b4342"], label: "ПЛАТЬЕ" },
    { id: "home-catalog-blouse-milk", categoryKey: "tops", title: "Молочная базовая блуза с длинными рукавами", priceValue: 1899, sizes: ["ONE SIZE"], colors: ["Молочный"], palette: ["#faf4ee", "#d7c5b1"], label: "БЛУЗА" },
  ];

  const HOME_COLLECTION_IDS = {
    newArrivals: [
      "home-new-trench-beige",
      "home-new-suit-brown",
      "home-new-cardigan-beige",
      "home-new-jacket-brown",
      "home-new-puffer-milk",
      "home-new-sweatshirt-pink",
    ],
    popular: [
      "home-popular-jacket-black",
      "home-popular-jacket-milk",
      "home-popular-sweatshirt-pink",
      "home-popular-set-gray",
      "home-popular-trench-brown",
      "home-popular-blazer-white",
    ],
    shoes: [
      "home-shoes-boots-black",
      "home-shoes-sneakers-white",
      "home-shoes-boots-brown",
      "home-shoes-boots-high-black",
    ],
    catalogPreview: [
      "home-catalog-tee-brown",
      "home-catalog-dress-polo-milk",
      "home-catalog-suit-brown",
      "home-catalog-trench-beige",
      "home-catalog-sweater-light",
      "home-catalog-trousers-gray",
      "home-catalog-dress-black",
      "home-catalog-blouse-milk",
    ],
  };

  const IMAGE_FILE_PATTERN = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

  const DETAIL_PRODUCT_SEED = {
    id: "exclusive-trench-cropped-black",
    categoryKey: "outerwear",
    subKey: "palto",
    subTitle: "Пальто",
    title: "Черный укороченный женский тренч с поясом и акцентным воротником",
    article: "EX-TR-2604-113",
    priceValue: 6990,
    sizes: ["XS", "S", "M", "L"],
    colors: ["Черный", "Графит", "Бежевый"],
    palette: ["#f7f2eb", "#e4d8ca"],
    sizeTable: [
      ["XS", "42", "84", "64", "92"],
      ["S", "44", "88", "68", "96"],
      ["M", "46", "92", "72", "100"],
      ["L", "48", "96", "76", "104"],
    ],
    features: [
      ["Силуэт", "Полуприлегающий"],
      ["Стиль", "Городская классика"],
      ["Воротник", "Отложной с широкими лацканами"],
      ["Застежка", "Пуговицы и пояс"],
      ["Сезон", "Весна и демисезон"],
      ["Длина", "Укороченная"],
    ],
    care: [
      "Деликатная стирка при температуре до 30°C.",
      "Сушить на широких плечиках без прямого солнца.",
      "Отпаривать с изнаночной стороны через ткань.",
      "Не использовать агрессивные отбеливатели.",
    ],
    composition: "55% полиэстер, 35% вискоза, 10% эластан. Подкладка: 100% вискоза.",
    gallery: [
      { alt: "Черный тренч EXCLUSIVE, основной ракурс", crop: "full", background: ["#f7f2eb", "#e4d8ca"], coatColor: "#171717", accentColor: "#2d2d2d" },
      { alt: "Черный тренч EXCLUSIVE, деталь воротника", crop: "collar", background: ["#f8f3ec", "#e3d9ce"], coatColor: "#171717", accentColor: "#353535" },
      { alt: "Черный тренч EXCLUSIVE, деталь пояса", crop: "belt", background: ["#f6f0e7", "#dfd3c6"], coatColor: "#171717", accentColor: "#444444" },
      { alt: "Черный тренч EXCLUSIVE, боковой ракурс", crop: "side", background: ["#f5efe7", "#dfd5c8"], coatColor: "#171717", accentColor: "#2f2f2f" },
    ],
    label: "ТРЕНЧ",
  };

  const KNOWN_COLOR_SWATCHES = {
    "базовый": "#2a2a2a",
    "бежевый": "#ccbba6",
    "белый": "#f5f5f1",
    "бордовый": "#6e2434",
    "графит": "#5a5a5a",
    "голубой": "#8aacc7",
    "зеленый": "#6d7c56",
    "зелёный": "#6d7c56",
    "карамель": "#b48660",
    "коричневый": "#7c5f53",
    "кремовый": "#efe6d6",
    "молочный": "#f4efe7",
    "песочный": "#d9c2a4",
    "розовый": "#dba4b3",
    "серый": "#b7b7b7",
    "синий": "#7798b4",
    "темно-серый": "#4f4f4f",
    "тёмно-серый": "#4f4f4f",
    "хаки": "#8f9975",
    "черный": "#141414",
    "чёрный": "#141414",
  };

  const SIZE_GUIDE = {
    XS: ["XS", "42", "84", "64", "92"],
    S: ["S", "44", "88", "68", "96"],
    M: ["M", "46", "92", "72", "100"],
    L: ["L", "48", "96", "76", "104"],
    XL: ["XL", "50", "100", "82", "108"],
    "ONE SIZE": ["ONE SIZE", "42-48", "88-100", "68-82", "94-108"],
  };

  const translitMap = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };

  const sanitizeText = (value, fallback = "") => {
    if (typeof value !== "string") {
      return fallback;
    }

    const trimmed = value.trim();
    return trimmed || fallback;
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const isRemoteAvailable = () => typeof window.fetch === "function" && Boolean(config.apiBaseUrl);

  const requestCatalog = async (path, payload = null) => {
    if (!isRemoteAvailable()) {
      throw new Error("Catalog API unavailable");
    }

    const hasPayload = payload !== null;
    const response = await window.fetch(config.getApiUrl(path), {
      method: hasPayload ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: hasPayload ? JSON.stringify(payload) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "Не удалось синхронизировать каталог.");
    }

    return {
      categories: Array.isArray(data.categories) ? data.categories : [],
      products: Array.isArray(data.products) ? data.products : [],
      banners: Array.isArray(data.banners) ? data.banners : [],
    };
  };

  const createDataUriSvg = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  const createHeroPlaceholder = (label, palette, mobile = false) => {
    const colors = normalizePalette(palette);
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
    const safeLabel = sanitizeText(label, "EXCLUSIVE")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
        <defs>
          <linearGradient id="hero-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colors[0]}"/>
            <stop offset="100%" stop-color="${colors[1]}"/>
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#hero-bg)"/>
        ${circleOne}
        ${circleTwo}
        <text x="50%" y="50%" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="${labelSize}" font-weight="400">${safeLabel}</text>
        <text x="50%" y="57%" text-anchor="middle" fill="rgba(255,255,255,0.82)" font-family="Arial, sans-serif" font-size="${hintSize}">Замените на свое фото</text>
      </svg>
    `;

    return createDataUriSvg(svg);
  };
  const formatPrice = (value) => `${moneyFormatter.format(Math.max(0, Math.round(Number(value) || 0)))} ₽`;

  const normalizePrice = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.round(value));
    }

    const digits = String(value ?? "").replace(/[^\d]/g, "");
    return digits ? Number.parseInt(digits, 10) : 0;
  };

  const normalizeHexColor = (value, fallback) => {
    const normalized = sanitizeText(value, fallback).toLowerCase();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized) ? normalized : fallback;
  };

  const normalizePalette = (palette, fallback = DEFAULT_PALETTE) => {
    if (!Array.isArray(palette) || palette.length < 2) {
      return [...fallback];
    }

    return [normalizeHexColor(palette[0], fallback[0]), normalizeHexColor(palette[1], fallback[1])];
  };

  const slugify = (value, fallback = "exclusive") => {
    const source = String(value ?? "")
      .trim()
      .toLowerCase()
      .split("")
      .map((character) => translitMap[character] ?? character)
      .join("");

    const slug = source
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

    return slug || fallback;
  };

  const ensureUniqueKey = (key, existingKeys) => {
    if (!existingKeys.has(key)) {
      return key;
    }

    let index = 2;
    let nextKey = `${key}-${index}`;

    while (existingKeys.has(nextKey)) {
      index += 1;
      nextKey = `${key}-${index}`;
    }

    return nextKey;
  };

  const makeLabel = (value, fallback = "EXCLUSIVE") => {
    const words = sanitizeText(value, fallback).split(/\s+/).slice(0, 2);
    return words.join(" ").toUpperCase();
  };

  const createProductPlaceholder = (label, palette, hint = "Замените на свое изображение") => {
    const colors = normalizePalette(palette);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200">
        <defs>
          <linearGradient id="catalog-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${colors[0]}"/>
            <stop offset="100%" stop-color="${colors[1]}"/>
          </linearGradient>
        </defs>
        <rect width="900" height="1200" fill="url(#catalog-bg)"/>
        <circle cx="738" cy="170" r="124" fill="rgba(255,255,255,0.16)"/>
        <circle cx="110" cy="1010" r="170" fill="rgba(255,255,255,0.1)"/>
        <text x="50%" y="48%" text-anchor="middle" fill="#242424" font-family="Arial, sans-serif" font-size="62" font-weight="400">${label}</text>
        <text x="50%" y="56%" text-anchor="middle" fill="#414141" font-family="Arial, sans-serif" font-size="28">${hint}</text>
      </svg>
    `;

    return createDataUriSvg(svg);
  };

  const DEFAULT_BANNERS = [
    {
      id: "hero-01",
      href: "/catalog/",
      desktopImage: createHeroPlaceholder("БАННЕР 01", ["#d9d0c9", "#8f847d"]),
      mobileImage: createHeroPlaceholder("БАННЕР 01", ["#d9d0c9", "#8f847d"], true),
      createdAt: 1,
      orderIndex: 0,
    },
    {
      id: "hero-02",
      href: "/new/",
      desktopImage: createHeroPlaceholder("БАННЕР 02", ["#d5c7c3", "#9c8178"]),
      mobileImage: createHeroPlaceholder("БАННЕР 02", ["#d5c7c3", "#9c8178"], true),
      createdAt: 2,
      orderIndex: 1,
    },
    {
      id: "hero-03",
      href: "/hit/",
      desktopImage: createHeroPlaceholder("БАННЕР 03", ["#cfcbbf", "#787166"]),
      mobileImage: createHeroPlaceholder("БАННЕР 03", ["#cfcbbf", "#787166"], true),
      createdAt: 3,
      orderIndex: 2,
    },
    {
      id: "hero-04",
      title: "Интернет-магазин женской одежды EXCLUSIVE",
      href: "/catalog/",
      desktopImage: createHeroPlaceholder("EXCLUSIVE", ["#c8c1bb", "#5d5956"]),
      mobileImage: createHeroPlaceholder("EXCLUSIVE", ["#c8c1bb", "#5d5956"], true),
      createdAt: 4,
      orderIndex: 3,
    },
  ];

  const createStudioPhoto = ({ coatColor, accentColor, background, crop = "full", hairColor = "#3d2b21" }) => {
    const cropMap = {
      full: { tx: 0, ty: 0, scale: 1 },
      collar: { tx: -160, ty: -180, scale: 1.26 },
      belt: { tx: -180, ty: -360, scale: 1.36 },
      side: { tx: 50, ty: -20, scale: 1.08 },
    };

    const view = cropMap[crop] || cropMap.full;
    const poseRotation = crop === "side" ? -4 : 0;
    const sleeveShift = crop === "side" ? 16 : 0;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500">
        <defs>
          <linearGradient id="photo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${background[0]}"/>
            <stop offset="100%" stop-color="${background[1]}"/>
          </linearGradient>
          <linearGradient id="coat-shine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${accentColor}"/>
            <stop offset="100%" stop-color="${coatColor}"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="rgba(0,0,0,0.18)"/>
          </filter>
        </defs>
        <rect width="1200" height="1500" fill="url(#photo-bg)"/>
        <circle cx="985" cy="210" r="145" fill="rgba(255,255,255,0.18)"/>
        <circle cx="160" cy="1245" r="170" fill="rgba(255,255,255,0.14)"/>
        <ellipse cx="610" cy="1320" rx="260" ry="46" fill="rgba(0,0,0,0.08)"/>
        <g transform="translate(${view.tx} ${view.ty}) scale(${view.scale}) rotate(${poseRotation} 600 720)" filter="url(#shadow)">
          <path d="M515 162C552 120 649 116 685 162C720 206 728 273 713 335H487C472 272 481 205 515 162Z" fill="${hairColor}"/>
          <circle cx="600" cy="254" r="82" fill="#e8c9b7"/>
          <path d="M558 312H642V390H558Z" fill="#e8c9b7"/>
          <path d="M418 430C467 369 529 345 600 345C671 345 734 369 782 430L830 1200H370L418 430Z" fill="url(#coat-shine)"/>
          <path d="M495 390L566 520L520 1200H410L435 560C441 479 461 430 495 390Z" fill="${coatColor}"/>
          <path d="M705 390L634 520L680 1200H790L765 560C759 479 739 430 705 390Z" fill="${coatColor}"/>
          <path d="M548 370L594 500L520 1200H430L470 560C476 470 500 412 548 370Z" fill="#151515"/>
          <path d="M652 370L606 500L680 1200H770L730 560C724 470 700 412 652 370Z" fill="#1d1d1d"/>
          <path d="M470 540L600 640L730 540L748 610L600 704L452 610Z" fill="${accentColor}"/>
          <path d="M468 560H732V616H468Z" fill="${accentColor}"/>
          <rect x="${396 + sleeveShift}" y="455" width="88" height="434" rx="44" transform="rotate(12 440 672)" fill="${coatColor}"/>
          <rect x="${716 + sleeveShift}" y="438" width="88" height="434" rx="44" transform="rotate(-12 760 655)" fill="${coatColor}"/>
          <path d="M420 1210C500 1168 567 1148 600 1148C632 1148 702 1168 780 1210V1310H420Z" fill="#151515"/>
          <path d="M510 405H690L640 336H560Z" fill="#202020"/>
          <path d="M468 1202C512 1184 560 1174 600 1174C640 1174 688 1184 732 1202" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="5"/>
        </g>
      </svg>
    `;

    return createDataUriSvg(svg);
  };

  const buildCategoryImage = (category) => createProductPlaceholder(makeLabel(category.title), category.palette, "Раздел каталога");

  const normalizeSizeList = (sizes) => {
    const source = Array.isArray(sizes) ? sizes : String(sizes ?? "").split(/[;,]/);
    const normalized = source
      .map((value) => sanitizeText(String(value), ""))
      .filter(Boolean)
      .map((value) => value.toUpperCase());

    return normalized.length ? [...new Set(normalized)] : ["ONE SIZE"];
  };

  const buildSizeTable = (sizes) =>
    normalizeSizeList(sizes).map((size) => {
      if (SIZE_GUIDE[size]) {
        return [...SIZE_GUIDE[size]];
      }

      if (/^\d+$/.test(size)) {
        return [size, size, "-", "-", "-"];
      }

      return [size, "-", "-", "-", "-"];
    });

  const normalizeColorEntry = (entry, palette, index = 0) => {
    if (typeof entry === "string") {
      const name = sanitizeText(entry, "");

      if (!name) {
        return null;
      }

      return {
        name,
        swatch: KNOWN_COLOR_SWATCHES[name.toLowerCase()] || palette[index % palette.length] || palette[1],
      };
    }

    const name = sanitizeText(entry?.name, "");

    if (!name) {
      return null;
    }

    return {
      name,
      swatch: normalizeHexColor(entry?.swatch, KNOWN_COLOR_SWATCHES[name.toLowerCase()] || palette[index % palette.length] || palette[1]),
    };
  };

  const normalizeColorList = (colors, palette) => {
    const source = Array.isArray(colors) ? colors : String(colors ?? "").split(/[;,]/);
    const normalized = source.map((entry, index) => normalizeColorEntry(entry, palette, index)).filter(Boolean);

    return normalized.length
      ? normalized
      : [
          {
            name: "Базовый",
            swatch: palette[1] || DEFAULT_PALETTE[1],
          },
        ];
  };

  const buildDefaultCare = () => [
    "Деликатная стирка при температуре до 30°C.",
    "Сушить на широких плечиках без прямого солнца.",
    "Отпаривать с изнаночной стороны через ткань.",
  ];

  const buildDefaultFeatures = (product, category) => [
    ["Категория", category?.title || "Каталог EXCLUSIVE"],
    ["Артикул", product.article],
    ["Размеры", product.sizes.join(" · ")],
    ["Посадка", "Комфортная"],
    ["Стиль", "Повседневный гардероб"],
    ["Сезон", "Круглый год"],
  ];

  const createGalleryFromSeed = (seed, category) => {
    if (Array.isArray(seed.gallery) && seed.gallery.length) {
      return seed.gallery.map((entry) => {
        if (entry.src) {
          return {
            src: normalizeImageSource(entry.src),
            alt: sanitizeText(entry.alt, seed.title),
          };
        }

        return {
          src: createStudioPhoto({
            coatColor: entry.coatColor || "#171717",
            accentColor: entry.accentColor || "#2d2d2d",
            background: entry.background || category.palette || DEFAULT_PALETTE,
            crop: entry.crop || "full",
            hairColor: entry.hairColor || "#3d2b21",
          }),
          alt: sanitizeText(entry.alt, seed.title),
        };
      });
    }

    if (sanitizeText(seed.image, "")) {
      return [{ src: normalizeImageSource(seed.image), alt: seed.title }];
    }

    const placeholder = createProductPlaceholder(makeLabel(seed.label || seed.title), seed.palette || category.palette || DEFAULT_PALETTE);
    return [{ src: placeholder, alt: seed.title }];
  };

  const normalizeCategory = (category, usedKeys) => {
    const title = sanitizeText(category?.title, "Категория");
    const key = ensureUniqueKey(slugify(category?.key || title, "category"), usedKeys);
    const palette = normalizePalette(category?.palette);
    const normalized = {
      key,
      title,
      description: sanitizeText(category?.description, `Раздел ${title} в каталоге EXCLUSIVE.`),
      palette,
      image: normalizeImageSource(category?.image) || buildCategoryImage({ title, palette }),
      showOnHome: Boolean(category?.showOnHome),
      createdAt: Number(category?.createdAt) || Date.now(),
    };

    usedKeys.add(key);
    return normalized;
  };

  const createArticle = (categoryKey, title, index) => {
    const prefix = slugify(categoryKey, "ct").slice(0, 3).toUpperCase();
    const suffix = slugify(title, "item").replace(/-/g, "").slice(0, 6).toUpperCase();
    return `EX-${prefix}-${String(index + 101).padStart(3, "0")}-${suffix}`;
  };

  const normalizeProduct = (product, index, categoriesMap, fallbackCategoryKey, maxOrderIndex) => {
    const categoryKey = categoriesMap.has(product?.categoryKey) ? product.categoryKey : fallbackCategoryKey;
    const category = categoriesMap.get(categoryKey);
    const title = sanitizeText(product?.title, "Товар EXCLUSIVE");
    const palette = normalizePalette(product?.palette || category?.palette || DEFAULT_PALETTE);
    const sizes = normalizeSizeList(product?.sizes);
    const colors = normalizeColorList(product?.colors, palette);
    const id = sanitizeText(product?.id, `${categoryKey}-${slugify(title, `item-${index + 1}`)}`);
    const priceValue = normalizePrice(product?.priceValue ?? product?.price);
    const gallery = createGalleryFromSeed(product || {}, category || { palette });
    const normalized = {
      id,
      categoryKey,
      subKey: sanitizeText(product?.subKey, "all"),
      subTitle: sanitizeText(product?.subTitle, category?.title || "Все товары"),
      title,
      article: sanitizeText(product?.article, createArticle(categoryKey, title, index)),
      priceValue,
      priceLabel: formatPrice(priceValue),
      sizes,
      colors,
      palette,
      label: sanitizeText(product?.label, makeLabel(title)),
      image: normalizeImageSource(product?.image) || gallery[0]?.src || "",
      gallery,
      description: sanitizeText(product?.description, `${title}. Новая модель EXCLUSIVE для повседневного гардероба.`),
      composition: sanitizeText(product?.composition, "Состав уточняется в карточке товара EXCLUSIVE."),
      care: Array.isArray(product?.care) && product.care.length ? product.care.map((item) => sanitizeText(item, "")).filter(Boolean) : buildDefaultCare(),
      features: Array.isArray(product?.features) && product.features.length ? product.features : [],
      sizeTable: Array.isArray(product?.sizeTable) && product.sizeTable.length ? product.sizeTable : buildSizeTable(sizes),
      createdAt: Number(product?.createdAt) || Date.now() + index,
      orderIndex: Number.isFinite(product?.orderIndex) ? Number(product.orderIndex) : maxOrderIndex + index + 1,
      isFeatured: Boolean(product?.isFeatured),
    };

    normalized.features = normalized.features.length ? normalized.features : buildDefaultFeatures(normalized, category);
    return normalized;
  };

  const generateBuiltInProducts = () => {
    const generated = [];

    BUILTIN_SECTIONS.forEach((section) => {
      section.subcategories.forEach((subcategory) => {
        Array.from({ length: subcategory.count }, (_, index) => {
          const number = String(index + 1).padStart(2, "0");
          generated.push({
            id: `${section.key}-${subcategory.key}-${number}`,
            categoryKey: section.key,
            subKey: subcategory.key,
            subTitle: subcategory.title,
            title: `${subcategory.itemLabel} EXCLUSIVE ${number} ${TITLE_SUFFIXES[index % TITLE_SUFFIXES.length]}`,
            priceValue: subcategory.basePrice + (index % 5) * subcategory.step,
            sizes: subcategory.sizes,
            colors: [{ name: "Базовый", swatch: subcategory.swatch }],
            palette: subcategory.palette || section.palette,
            label: subcategory.itemLabel.toUpperCase(),
          });
        });
      });
    });

    return generated;
  };

  const getDefaultData = () => {
    const usedKeys = new Set();
    const categories = BUILTIN_SECTIONS.map((section) =>
      normalizeCategory(
        {
          key: section.key,
          title: section.title,
          description: section.description,
          palette: section.palette,
          showOnHome: section.showOnHome,
        },
        usedKeys,
      ),
    );

    const categoriesMap = new Map(categories.map((category) => [category.key, category]));
    const fallbackCategoryKey = categories[0]?.key || "catalog";
    const seeded = [...generateBuiltInProducts(), DETAIL_PRODUCT_SEED, ...FEATURED_PRODUCT_SEEDS];
    const normalized = seeded.map((product, index) =>
      normalizeProduct(product, index, categoriesMap, fallbackCategoryKey, 0),
    );

    const productMap = new Map();
    normalized.forEach((product) => {
      productMap.set(product.id, product);
    });

    let orderIndex = 0;
    const products = [...productMap.values()].map((product) => ({
      ...product,
      orderIndex: orderIndex++,
    }));

    return { categories, products, banners: clone(DEFAULT_BANNERS) };
  };

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
      return storage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  };

  const writeToStorage = (storage, value) => {
    try {
      storage.setItem(STORAGE_KEY, value);
      return true;
    } catch (error) {
      return false;
    }
  };

  const removeFromStorage = (storage) => {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch (error) {
      return;
    }
  };

  const normalizeImageSource = (value) => {
    const raw = sanitizeText(value, "").replaceAll("\\", "/");

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

  const normalizeBanner = (banner, index, usedIds, maxOrderIndex = -1) => {
    const fallbackTitle = index === 3 ? "Интернет-магазин женской одежды EXCLUSIVE" : "";
    const title = sanitizeText(banner?.title, fallbackTitle);
    const id = ensureUniqueKey(slugify(banner?.id || title || `hero-${index + 1}`, `hero-${index + 1}`), usedIds);
    const desktopImage =
      normalizeImageSource(banner?.desktopImage || banner?.image) ||
      createHeroPlaceholder(title || `БАННЕР ${String(index + 1).padStart(2, "0")}`, ["#d9d0c9", "#8f847d"]);
    const mobileImage =
      normalizeImageSource(banner?.mobileImage) ||
      desktopImage ||
      createHeroPlaceholder(title || `БАННЕР ${String(index + 1).padStart(2, "0")}`, ["#d9d0c9", "#8f847d"], true);
    const rawOrderIndex = Number(banner?.orderIndex);

    usedIds.add(id);

    return {
      id,
      title,
      text: sanitizeText(banner?.text, ""),
      button: sanitizeText(banner?.button, ""),
      href: sanitizeText(banner?.href, "/catalog/"),
      desktopImage,
      mobileImage,
      createdAt: Number(banner?.createdAt) || Date.now() + index,
      orderIndex: Number.isFinite(rawOrderIndex) ? rawOrderIndex : maxOrderIndex + index + 1,
    };
  };

  const normalizeCatalog = (rawData) => {
    const defaults = getDefaultData();
    const sourceCategories = Array.isArray(rawData?.categories) && rawData.categories.length ? rawData.categories : defaults.categories;
    const usedKeys = new Set();
    const categories = sourceCategories.map((category) => normalizeCategory(category, usedKeys));
    const categoriesMap = new Map(categories.map((category) => [category.key, category]));
    const fallbackCategoryKey = categories[0]?.key || defaults.categories[0]?.key || "catalog";
    const sourceProducts = Array.isArray(rawData?.products) && rawData.products.length ? rawData.products : defaults.products;
    let maxOrderIndex = -1;
    const products = sourceProducts.map((product, index) => {
      const normalized = normalizeProduct(product, index, categoriesMap, fallbackCategoryKey, maxOrderIndex);
      maxOrderIndex = Math.max(maxOrderIndex, normalized.orderIndex);
      return normalized;
    });
    const sourceBanners = Array.isArray(rawData?.banners) && rawData.banners.length ? rawData.banners : defaults.banners;
    const usedBannerIds = new Set();
    let maxBannerOrderIndex = -1;
    const banners = sourceBanners.map((banner, index) => {
      const normalized = normalizeBanner(banner, index, usedBannerIds, maxBannerOrderIndex);
      maxBannerOrderIndex = Math.max(maxBannerOrderIndex, normalized.orderIndex);
      return normalized;
    });

    return { categories, products, banners };
  };

  const readCatalog = () => {
    for (const storage of getStorageCandidates()) {
      const rawValue = readFromStorage(storage);

      if (!rawValue) {
        continue;
      }

      try {
        return normalizeCatalog(JSON.parse(rawValue));
      } catch (error) {
        continue;
      }
    }

    if (inMemoryFallback.categories.length || inMemoryFallback.products.length || inMemoryFallback.banners.length) {
      return normalizeCatalog(inMemoryFallback);
    }

    return normalizeCatalog(getDefaultData());
  };

  const emitCatalogChange = (data = readCatalog()) => {
    window.dispatchEvent(
      new CustomEvent(CATALOG_EVENT, {
        detail: {
          categories: clone(data.categories),
          products: clone(data.products),
          banners: clone(data.banners),
        },
      }),
    );
  };

  const saveCatalog = (data, options = {}) => {
    const previousSerialized = JSON.stringify(normalizeCatalog(readCatalog()));
    const normalized = normalizeCatalog(data);
    const serialized = JSON.stringify(normalized);

    inMemoryFallback.categories = clone(normalized.categories);
    inMemoryFallback.products = clone(normalized.products);
    inMemoryFallback.banners = clone(normalized.banners);

    for (const storage of getStorageCandidates()) {
      const written = writeToStorage(storage, serialized);
      if (!written) {
        removeFromStorage(storage);
      }
    }

    if (serialized !== previousSerialized && options.emit !== false) {
      emitCatalogChange(normalized);
    }

    return normalized;
  };

  const saveCatalogRemotely = async (data, options = {}) => {
    if (!isRemoteAvailable()) {
      return normalizeCatalog(data);
    }

    try {
      const remoteCatalog = await requestCatalog("catalog/save", {
        sessionToken: window.ExclusiveAuth?.getSessionToken?.() || "",
        ...data,
      });
      return saveCatalog(remoteCatalog);
    } catch (error) {
      if (options.throwOnError) {
        throw error;
      }

      return normalizeCatalog(data);
    }
  };

  const saveCatalogWithRemote = async (data, previousData = readCatalog()) => {
    const nextCatalog = saveCatalog(data);

    try {
      return await saveCatalogRemotely(nextCatalog, { throwOnError: true });
    } catch (error) {
      saveCatalog(previousData);
      throw error;
    }
  };

  const bootstrapRemoteCatalog = async () => {
    if (readyPromise) {
      return readyPromise;
    }

    readyPromise = (async () => {
      const localCatalog = getData();

      if (!isRemoteAvailable()) {
        return localCatalog;
      }

      try {
        const remoteCatalog = await requestCatalog("catalog/bootstrap", {
          sessionToken: window.ExclusiveAuth?.getSessionToken?.() || "",
          ...localCatalog,
        });
        return saveCatalog(remoteCatalog, { emit: false });
      } catch (error) {
        return localCatalog;
      }
    })();

    return readyPromise;
  };

  const getData = () => normalizeCatalog(readCatalog());
  const getCategories = () => clone(getData().categories);

  const getCategoryByKey = (key) => {
    const category = getData().categories.find((item) => item.key === key);
    return category ? clone(category) : null;
  };

  const decorateProduct = (product, categoriesMap) => {
    const category = categoriesMap.get(product.categoryKey);
    return {
      ...clone(product),
      categoryTitle: category?.title || "Каталог",
      categoryDescription: category?.description || "",
      categoryPalette: category?.palette || DEFAULT_PALETTE,
    };
  };

  const getProducts = (filters = {}) => {
    const data = getData();
    const categoriesMap = new Map(data.categories.map((category) => [category.key, category]));
    let products = data.products.map((product) => decorateProduct(product, categoriesMap));

    if (filters.categoryKey) {
      products = products.filter((product) => product.categoryKey === filters.categoryKey);
    }

    if (filters.excludeId) {
      products = products.filter((product) => product.id !== filters.excludeId);
    }

    if (filters.search) {
      const query = sanitizeText(filters.search, "").toLowerCase();
      products = products.filter((product) =>
        [product.title, product.article, product.categoryTitle].some((value) => value.toLowerCase().includes(query)),
      );
    }

    if (filters.sort === "price-desc") {
      products = products.sort((first, second) => second.priceValue - first.priceValue);
    } else if (filters.sort === "price-asc") {
      products = products.sort((first, second) => first.priceValue - second.priceValue);
    } else {
      products = products.sort((first, second) => first.orderIndex - second.orderIndex);
    }

    if (filters.limit) {
      products = products.slice(0, filters.limit);
    }

    return products;
  };

  const getProductById = (id) => {
    const products = getProducts();
    return clone(products.find((product) => product.id === id) || products.find((product) => product.id === DETAIL_PRODUCT_SEED.id) || products[0] || null);
  };

  const getMenuGroups = () =>
    getCategories().map((category) => ({
      title: category.title,
      href: `/catalog/?page=${encodeURIComponent(category.key)}`,
      items: [],
    }));

  const pickProductsByIds = (ids, fallback) => {
    const products = getProducts();
    const byId = new Map(products.map((product) => [product.id, product]));
    const picked = ids.map((id) => byId.get(id)).filter(Boolean);
    return picked.length ? picked : fallback;
  };

  const getHomeCollections = () => {
    const categories = getCategories().filter((category) => category.showOnHome).slice(0, 7);
    const products = getProducts();

    return {
      categories,
      newArrivals: pickProductsByIds(HOME_COLLECTION_IDS.newArrivals, products.slice(0, 6)),
      popular: pickProductsByIds(HOME_COLLECTION_IDS.popular, products.slice(6, 12)),
      shoes: pickProductsByIds(HOME_COLLECTION_IDS.shoes, products.filter((product) => product.categoryKey === "shoes").slice(0, 4)),
      catalogPreview: pickProductsByIds(HOME_COLLECTION_IDS.catalogPreview, products.slice(12, 20)),
    };
  };

  const getBanners = () => clone(getData().banners).sort((first, second) => first.orderIndex - second.orderIndex);

  const saveBanner = async (payload, bannerId = null) => {
    const data = getData();
    const existingBanner = bannerId ? data.banners.find((banner) => banner.id === bannerId) : null;
    const existingIds = new Set(data.banners.filter((banner) => banner.id !== bannerId).map((banner) => banner.id));
    const maxOrderIndex = data.banners.reduce((max, banner) => Math.max(max, Number(banner.orderIndex) || 0), -1);
    const draft = {
      ...existingBanner,
      id: existingBanner?.id || ensureUniqueKey(slugify(payload?.title || payload?.id || `hero-${Date.now()}`, "hero"), existingIds),
      title: sanitizeText(payload?.title, existingBanner?.title || ""),
      text: sanitizeText(payload?.text, existingBanner?.text || ""),
      button: sanitizeText(payload?.button, existingBanner?.button || ""),
      href: sanitizeText(payload?.href, existingBanner?.href || "/catalog/"),
      desktopImage: normalizeImageSource(payload?.desktopImage) || normalizeImageSource(existingBanner?.desktopImage),
      mobileImage: normalizeImageSource(payload?.mobileImage) || normalizeImageSource(existingBanner?.mobileImage),
      createdAt: existingBanner?.createdAt || Date.now(),
      orderIndex: existingBanner?.orderIndex ?? maxOrderIndex + 1,
    };
    const usedIds = new Set(data.banners.filter((banner) => banner.id !== bannerId).map((banner) => banner.id));
    const nextBanner = normalizeBanner(draft, data.banners.length, usedIds, maxOrderIndex);
    const banners = existingBanner
      ? data.banners.map((banner) => (banner.id === bannerId ? nextBanner : banner))
      : [...data.banners, nextBanner];

    return saveCatalogWithRemote(
      {
        categories: data.categories,
        products: data.products,
        banners,
      },
      data,
    );
  };

  const addBanner = (payload) => saveBanner(payload, null);
  const updateBanner = (bannerId, payload) => saveBanner(payload, bannerId);

  const deleteBanner = async (bannerId) => {
    const data = getData();

    if (data.banners.length <= 1) {
      return data;
    }

    return saveCatalogWithRemote(
      {
        categories: data.categories,
        products: data.products,
        banners: data.banners.filter((banner) => banner.id !== bannerId),
      },
      data,
    );
  };

  const addCategory = async (payload) => {
    const data = getData();
    const existingKeys = new Set(data.categories.map((category) => category.key));
    const title = sanitizeText(payload?.title, "Новая категория");
    const key = ensureUniqueKey(slugify(payload?.key || title, "category"), existingKeys);
    const nextCategory = {
      key,
      title,
      description: sanitizeText(payload?.description, `Раздел ${title} в каталоге EXCLUSIVE.`),
      palette: normalizePalette([payload?.paletteStart || DEFAULT_PALETTE[0], payload?.paletteEnd || DEFAULT_PALETTE[1]]),
      showOnHome: true,
      image: "",
      createdAt: Date.now(),
    };

    const nextCatalog = {
      categories: [...data.categories, nextCategory],
      products: data.products,
    };

    return saveCatalogWithRemote(nextCatalog, data);
  };

  const updateCategory = async (categoryKey, payload) => {
    const data = getData();

    const nextCatalog = {
      categories: data.categories.map((category) =>
        category.key === categoryKey
          ? {
              ...category,
              title: sanitizeText(payload?.title, category.title),
              description: sanitizeText(payload?.description, category.description),
              palette: normalizePalette([payload?.paletteStart || category.palette[0], payload?.paletteEnd || category.palette[1]], category.palette),
              image: "",
            }
          : category,
      ),
      products: data.products,
    };

    return saveCatalogWithRemote(nextCatalog, data);
  };

  const deleteCategory = async (categoryKey) => {
    const data = getData();
    if (data.categories.length <= 1) {
      return data;
    }

    const nextCatalog = {
      categories: data.categories.filter((category) => category.key !== categoryKey),
      products: data.products.filter((product) => product.categoryKey !== categoryKey),
    };

    return saveCatalogWithRemote(nextCatalog, data);
  };

  const saveProduct = async (payload, productId = null) => {
    const data = getData();
    const existingProduct = productId ? data.products.find((product) => product.id === productId) : null;
    const categoryKey = sanitizeText(payload?.categoryKey, existingProduct?.categoryKey || data.categories[0]?.key || "outerwear");
    const category = getCategoryByKey(categoryKey) || data.categories[0];
    const title = sanitizeText(payload?.title, existingProduct?.title || "Новый товар EXCLUSIVE");
    const nextLabel = sanitizeText(payload?.label, existingProduct?.label || makeLabel(title));
    const palette = normalizePalette(
      [
        payload?.paletteStart || existingProduct?.palette?.[0] || category?.palette?.[0] || DEFAULT_PALETTE[0],
        payload?.paletteEnd || existingProduct?.palette?.[1] || category?.palette?.[1] || DEFAULT_PALETTE[1],
      ],
      existingProduct?.palette || category?.palette || DEFAULT_PALETTE,
    );
    const normalizedImage = normalizeImageSource(payload?.image);
    const normalizedGallery = Array.isArray(payload?.gallery)
      ? payload.gallery
          .map((entry) => {
            const src = normalizeImageSource(entry?.src || entry);

            if (!src) {
              return null;
            }

            return {
              src,
              alt: sanitizeText(entry?.alt, title),
            };
          })
          .filter(Boolean)
      : null;
    const nextGallery = normalizedGallery && normalizedGallery.length
      ? normalizedGallery
      : normalizedImage
        ? [{ src: normalizedImage, alt: title }]
        : Array.isArray(existingProduct?.gallery)
          ? existingProduct.gallery
          : [];
    const nextImage = nextGallery[0]?.src || normalizedImage || normalizeImageSource(existingProduct?.image);
    const currentLabel = existingProduct?.label || makeLabel(existingProduct?.title || "Товар EXCLUSIVE");
    const hasMediaChanges =
      normalizedImage !== "" ||
      Boolean(normalizedGallery) ||
      title !== (existingProduct?.title || "") ||
      nextLabel !== currentLabel ||
      palette[0] !== (existingProduct?.palette?.[0] || "") ||
      palette[1] !== (existingProduct?.palette?.[1] || "");

    const minOrderIndex = data.products.reduce((min, product) => Math.min(min, Number(product.orderIndex) || 0), 0);
    const nextProduct = {
      ...existingProduct,
      id: existingProduct?.id || `${categoryKey}-${slugify(title, `item-${Date.now()}`)}`,
      categoryKey,
      subKey: sanitizeText(existingProduct?.subKey, "all"),
      subTitle: sanitizeText(existingProduct?.subTitle, category?.title || "Все товары"),
      title,
      article: sanitizeText(payload?.article, existingProduct?.article || ""),
      priceValue: normalizePrice(payload?.priceValue ?? existingProduct?.priceValue),
      sizes: normalizeSizeList(payload?.sizes ?? existingProduct?.sizes),
      colors: normalizeColorList(payload?.colors ?? existingProduct?.colors, palette),
      palette,
      label: nextLabel,
      image: hasMediaChanges ? nextImage : normalizeImageSource(existingProduct?.image),
      gallery: hasMediaChanges ? nextGallery : Array.isArray(existingProduct?.gallery) ? existingProduct.gallery : [],
      description: sanitizeText(payload?.description, existingProduct?.description || `${title}. Новая модель EXCLUSIVE для повседневного гардероба.`),
      composition: sanitizeText(payload?.composition, existingProduct?.composition || "Состав уточняется в карточке товара EXCLUSIVE."),
      care: Array.isArray(payload?.care) && payload.care.length
        ? payload.care.map((item) => sanitizeText(item, "")).filter(Boolean)
        : Array.isArray(existingProduct?.care) && existingProduct.care.length
          ? existingProduct.care
          : buildDefaultCare(),
      features: Array.isArray(payload?.features) && payload.features.length
        ? payload.features
            .map((feature) => {
              if (!Array.isArray(feature)) {
                return null;
              }

              const name = sanitizeText(feature[0], "");
              const value = sanitizeText(feature[1], "");
              return name ? [name, value] : null;
            })
            .filter(Boolean)
        : Array.isArray(existingProduct?.features) && existingProduct.features.length
          ? existingProduct.features
          : [],
      sizeTable: buildSizeTable(payload?.sizes ?? existingProduct?.sizes),
      createdAt: existingProduct?.createdAt || Date.now(),
      orderIndex: existingProduct?.orderIndex ?? minOrderIndex - 1,
      isFeatured: Boolean(existingProduct?.isFeatured),
    };

    const products = existingProduct
      ? data.products.map((product) => (product.id === productId ? nextProduct : product))
      : [...data.products, nextProduct];

    const nextCatalog = {
      categories: data.categories,
      products,
    };

    return saveCatalogWithRemote(nextCatalog, data);
  };

  const addProduct = (payload) => saveProduct(payload, null);
  const updateProduct = (productId, payload) => saveProduct(payload, productId);

  const deleteProduct = async (productId) => {
    const data = getData();
    const nextCatalog = {
      categories: data.categories,
      products: data.products.filter((product) => product.id !== productId),
    };

    return saveCatalogWithRemote(nextCatalog, data);
  };

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      emitCatalogChange(readCatalog());
    }
  });

  window.ExclusiveCatalog = {
    CATALOG_EVENT,
    STORAGE_KEY,
    addBanner,
    addCategory,
    addProduct,
    deleteBanner,
    deleteCategory,
    deleteProduct,
    formatPrice,
    getBanners,
    getCategories,
    getCategoryByKey,
    getData,
    getHomeCollections,
    getHeroSlides: getBanners,
    getMenuGroups,
    getProductById,
    getProducts,
    ready: () => bootstrapRemoteCatalog(),
    normalizePrice,
    refreshFromRemote: () => bootstrapRemoteCatalog(),
    slugify,
    updateBanner,
    updateCategory,
    updateProduct,
  };

  void bootstrapRemoteCatalog();
})();
