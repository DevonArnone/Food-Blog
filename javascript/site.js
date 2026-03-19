const navLinks = [
  { href: "index.html", label: "Home" },
  { href: "recipes.html", label: "Recipes" },
  { href: "categories.html", label: "Categories" },
  { href: "favorites.html", label: "Favorites" },
  { href: "about.html", label: "About" },
  { href: "contact.html", label: "Contact" }
];

function currentPageName() {
  const path = window.location.pathname.split("/").pop();
  return path || "index.html";
}

function injectSiteHeader() {
  const header = document.querySelector("[data-site-header]");
  if (!header) {
    return;
  }

  const page = currentPageName();
  const linksMarkup = navLinks
    .map((link) => {
      const isCurrent =
        link.href === page ||
        (page === "" && link.href === "index.html");
      const current = isCurrent ? ' aria-current="page"' : "";
      return `<li><a class="site-nav__link" href="${link.href}"${current}>${link.label}</a></li>`;
    })
    .join("");

  header.className = "site-header";
  header.innerHTML = `
    <div class="site-header__inner">
      <a class="brand" href="index.html" aria-label="Forks & Freedom home">
        <div class="brand__mark" aria-hidden="true"></div>
        <div>
          <p class="brand__eyebrow">Modern Food Blog</p>
          <p class="brand__name">Forks & Freedom</p>
        </div>
      </a>
      <nav class="site-nav" aria-label="Primary navigation" data-site-nav>
        <button
          class="site-nav__toggle"
          type="button"
          aria-expanded="false"
          aria-controls="site-nav-list"
          data-site-nav-toggle
        >
          <span class="visually-hidden">Toggle navigation</span>
          Menu
        </button>
        <ul class="site-nav__list" id="site-nav-list">
          ${linksMarkup}
        </ul>
      </nav>
      <a class="button site-header__cta" href="submit.html">Submit Recipe</a>
    </div>
  `;

  const nav = header.querySelector("[data-site-nav]");
  const toggle = header.querySelector("[data-site-nav-toggle]");

  if (!nav || !toggle) {
    return;
  }

  toggle.addEventListener("click", () => {
    const isOpen = nav.getAttribute("data-open") === "true";
    nav.setAttribute("data-open", String(!isOpen));
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.matches("a")) {
      nav.setAttribute("data-open", "false");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function injectSiteFooter() {
  const footer = document.querySelector("[data-site-footer]");
  if (!footer) {
    return;
  }

  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <h2>Forks & Freedom</h2>
        <p>Flavor-first weeknight cooking, practical hosting ideas, and recipes you can actually revisit.</p>
      </div>
      <div class="site-footer__meta">
        <p>Built with HTML, CSS, and vanilla JavaScript.</p>
        <p>Designed for a clean, mobile-first cooking experience.</p>
        <p>&copy; ${new Date().getFullYear()} Forks & Freedom</p>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  injectSiteHeader();
  injectSiteFooter();
});
