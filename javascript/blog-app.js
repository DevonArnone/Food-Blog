function blogHref(post) {
  return `post.html?slug=${encodeURIComponent(post.slug)}`;
}

function allPosts() {
  return [...(window.BLOG_POSTS || [])].sort((a, b) => new Date(b.publishedOn) - new Date(a.publishedOn));
}

function findPost(slug) {
  return allPosts().find((post) => post.slug === slug);
}

function postImageMarkup(post, className = "blog-card__media") {
  if (post.image) {
    return `
      <a class="${className}" href="${blogHref(post)}">
        <img src="${post.image}" alt="${post.imageAlt}">
      </a>
    `;
  }

  return `
    <a class="${className} recipe-card__media--placeholder recipe-card__media--${post.heroTone || "sage"}" href="${blogHref(post)}">
      <div class="placeholder-copy">
        <span class="pill">${post.category}</span>
        <strong>${post.title}</strong>
      </div>
    </a>
  `;
}

function postMetaMarkup(post) {
  return `
    <div class="meta-row">
      <span class="tag">${post.category}</span>
      <span class="tag">${new Date(post.publishedOn).toLocaleDateString()}</span>
      <span class="tag">${post.readTime}</span>
    </div>
  `;
}

function blogCardMarkup(post, featured = false) {
  return `
    <article class="blog-card${featured ? " blog-card--featured" : ""}">
      ${postImageMarkup(post)}
      <div class="blog-card__body">
        ${postMetaMarkup(post)}
        <a href="${blogHref(post)}">
          <h3>${post.title}</h3>
        </a>
        <p>${post.excerpt}</p>
        <div class="meta-row">
          ${post.tags.map((tag) => `<span class="pill">${tag}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function populateBlogIndex(target) {
  const posts = allPosts();
  const featured = posts.find((post) => post.featured) || posts[0];
  const remaining = posts.filter((post) => post.slug !== featured.slug);
  const categories = [...new Set(posts.map((post) => post.category))];

  target.innerHTML = `
    <section class="section">
      <div class="results-header">
        <div>
          <span class="pill">Featured Story</span>
          <h2 class="section-title">Editorial content that supports how people actually cook.</h2>
        </div>
      </div>
      ${blogCardMarkup(featured, true)}
    </section>

    <section class="section">
      <div>
        <span class="pill">Browse By Category</span>
        <h2 class="section-title">Stories across planning, hosting, and kitchen routines.</h2>
      </div>
      <div class="chip-row">
        ${categories.map((category) => `<span class="filter-chip">${category}</span>`).join("")}
      </div>
    </section>

    <section class="section">
      <div>
        <span class="pill">Recent Posts</span>
        <h2 class="section-title">Fresh reads from the test kitchen.</h2>
      </div>
      <div class="blog-grid">
        ${remaining.map((post) => blogCardMarkup(post)).join("")}
      </div>
    </section>
  `;
}

function populateHomeBlog(target) {
  const posts = allPosts().slice(0, 3);
  target.innerHTML = posts.map((post) => blogCardMarkup(post)).join("");
}

function initializeBlogPage() {
  const page = document.querySelector("[data-blog-page]");
  if (!page) {
    return;
  }

  const target = page.querySelector("[data-blog-sections]");
  populateBlogIndex(target);
}

function initializeHomeBlogSection() {
  const target = document.querySelector("[data-home-blog-grid]");
  if (!target) {
    return;
  }

  populateHomeBlog(target);
}

function initializeBlogPostPage() {
  const page = document.querySelector("[data-post-page]");
  if (!page) {
    return;
  }

  const slug = new URLSearchParams(window.location.search).get("slug");
  const post = findPost(slug);
  const title = page.querySelector("[data-post-title]");
  const target = page.querySelector("[data-post-layout]");

  if (!post) {
    title.textContent = "Story not found";
    target.innerHTML = `
      <article class="detail-card empty-state">
        <p>That article is not available right now. Head back to the blog landing page to browse the current editorial collection.</p>
        <div class="button-row">
          <a class="button" href="blog.html">Back to Blog</a>
        </div>
      </article>
    `;
    return;
  }

  const relatedPosts = allPosts().filter((item) => item.slug !== post.slug).slice(0, 3);
  const relatedRecipes = (window.RECIPES || []).filter((recipe) => post.relatedRecipes.includes(recipe.slug));

  document.title = `Forks & Freedom | ${post.title}`;
  title.textContent = post.title;
  target.innerHTML = `
    <section class="detail-layout detail-layout--hero">
      <article class="detail-card detail-media-card">
        ${postImageMarkup(post, "detail-media")}
      </article>

      <article class="detail-card detail-summary">
        <div class="detail-summary__header">
          <span class="eyebrow">${post.category}</span>
          <h1>${post.title}</h1>
          <p class="detail-lead">${post.excerpt}</p>
        </div>
        <div class="meta-row">
          <span class="tag">${post.author}</span>
          <span class="tag">${new Date(post.publishedOn).toLocaleDateString()}</span>
          <span class="tag">${post.readTime}</span>
        </div>
        <div class="meta-row">
          ${post.tags.map((tag) => `<span class="pill">${tag}</span>`).join("")}
        </div>
        <div class="button-row">
          <a class="button-secondary" href="blog.html">Back to Blog</a>
          <a class="button" href="recipes.html">Browse Recipes</a>
        </div>
      </article>
    </section>

    <section class="detail-content-grid">
      <article class="detail-card detail-prose post-body">
        ${post.sections
          .map(
            (section) => `
              <section class="post-body__section">
                <h2>${section.heading}</h2>
                ${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
                ${
                  section.bullets
                    ? `<ul class="checklist">${section.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>`
                    : ""
                }
              </section>
            `
          )
          .join("")}
      </article>

      <aside class="detail-sidebar-stack">
        <article class="detail-card detail-prose">
          <div class="detail-section-heading">
            <span class="pill">Article Snapshot</span>
            <h2>At a glance</h2>
          </div>
          <ul class="list-clean">
            <li><strong>Category:</strong> ${post.category}</li>
            <li><strong>Author:</strong> ${post.author}</li>
            <li><strong>Published:</strong> ${new Date(post.publishedOn).toLocaleDateString()}</li>
            <li><strong>Read time:</strong> ${post.readTime}</li>
          </ul>
        </article>

        <article class="detail-card detail-prose">
          <div class="detail-section-heading">
            <span class="pill">Cook This Next</span>
            <h2>Recipes related to this story</h2>
          </div>
          <div class="recipe-grid">
            ${relatedRecipes.map((recipe) => recipeCardMarkup(recipe)).join("")}
          </div>
        </article>
      </aside>
    </section>

    <section class="section">
      <div>
        <span class="pill">More Stories</span>
        <h2 class="section-title">Keep reading.</h2>
      </div>
      <div class="blog-grid">
        ${relatedPosts.map((item) => blogCardMarkup(item)).join("")}
      </div>
    </section>
  `;

  if (typeof syncFavoriteButtons === "function") {
    syncFavoriteButtons();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeBlogPage();
  initializeHomeBlogSection();
  initializeBlogPostPage();
});
