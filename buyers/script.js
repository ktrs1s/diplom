const currentYearNode = document.getElementById("current-year");
const headerCartBadge = document.getElementById("header-cart-badge");
const profileLinks = document.querySelectorAll("[data-profile-link]");
const menuToggle = document.getElementById("menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");
const mobileMenuClose = document.getElementById("mobile-menu-close");
const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");
const siteHeader = document.getElementById("site-header");

if (currentYearNode) {
  currentYearNode.textContent = String(new Date().getFullYear());
}

const syncHeaderState = () => {
  if (!siteHeader) {
    return;
  }

  siteHeader.classList.add("is-solid");
};

const closeMenu = () => {
  if (!mobileMenu || !menuToggle || !mobileMenuBackdrop) {
    return;
  }

  document.body.classList.remove("menu-open");
  mobileMenu.classList.remove("is-open");
  mobileMenu.setAttribute("aria-hidden", "true");
  menuToggle.setAttribute("aria-expanded", "false");
  mobileMenuBackdrop.hidden = true;
  syncHeaderState();
};

const openMenu = () => {
  if (!mobileMenu || !menuToggle || !mobileMenuBackdrop) {
    return;
  }

  document.body.classList.add("menu-open");
  mobileMenu.classList.add("is-open");
  mobileMenu.setAttribute("aria-hidden", "false");
  menuToggle.setAttribute("aria-expanded", "true");
  mobileMenuBackdrop.hidden = false;
  syncHeaderState();
};

if (menuToggle && mobileMenu && mobileMenuClose && mobileMenuBackdrop) {
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
}

syncHeaderState();
window.ExclusiveStore?.mountCartBadge(headerCartBadge);
window.ExclusiveAuth?.mountProfileLinks(profileLinks);
window.addEventListener(window.ExclusiveAuth?.AUTH_EVENT || "exclusive:authchange", () => {
  window.ExclusiveAuth?.mountProfileLinks(profileLinks);
});
