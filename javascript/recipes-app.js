const FAVORITES_KEY = "forks-freedom-favorites";
const SUBMISSIONS_KEY = "forks-freedom-submissions";
const COMMENTS_KEY_PREFIX = "forks-freedom-comments";

function totalCookTime(recipe) {
  return Number(recipe.prepMinutes) + Number(recipe.cookMinutes);
}

function recipeHref(recipe) {
  return `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
}

function safeReadStorage(key, fallback) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text || "");
  return div.innerHTML;
}

function favoriteSlugs() {
  if (window.authManager?.isAuthenticated()) {
    return window.authManager.getSavedRecipes();
  }
  return safeReadStorage(FAVORITES_KEY, []);
}

function submittedRecipes() {
  const raw = safeReadStorage(SUBMISSIONS_KEY, []);
  return raw.map((recipe) => ({
    ...recipe,
    userSubmitted: true,
    featured: false,
    popularScore: Number(recipe.popularScore || 40),
    addedOn: recipe.addedOn || new Date().toISOString().slice(0, 10),
    image: "",
    imageAlt: "",
    heroTone: recipe.heroTone || "sage",
    nutrition: recipe.nutrition || {
      calories: "Custom",
      protein: "Custom",
      carbs: "Custom",
      fat: "Custom"
    }
  }));
}

function mySubmittedRecipes() {
  const userId = window.authManager?.getUser()?.id;
  if (!userId) {
    return [];
  }

  return submittedRecipes().filter((recipe) => recipe.authorId === userId);
}

function allRecipes() {
  return [...(window.RECIPES || []), ...submittedRecipes()];
}

function findRecipe(slug) {
  return allRecipes().find((recipe) => recipe.slug === slug);
}

function commentsKey(slug) {
  return `${COMMENTS_KEY_PREFIX}:${slug}`;
}

function recipeComments(slug) {
  return safeReadStorage(commentsKey(slug), []);
}

function saveRecipeComments(slug, comments) {
  safeWriteStorage(commentsKey(slug), comments);
}

function addRecipeComment(slug, text) {
  const user = window.authManager?.getUser();
  if (!user) {
    return { success: false, requiresAuth: true };
  }

  const comments = recipeComments(slug);
  const nextComment = {
    id: `comment-${Date.now()}`,
    recipeSlug: slug,
    userId: user.id,
    userName: user.name,
    userPicture: user.picture,
    text: text.trim(),
    timestamp: new Date().toISOString()
  };
  saveRecipeComments(slug, [nextComment, ...comments]);
  return { success: true };
}

function deleteRecipeComment(slug, commentId) {
  const user = window.authManager?.getUser();
  if (!user) {
    return;
  }

  const nextComments = recipeComments(slug).filter(
    (comment) => !(comment.id === commentId && comment.userId === user.id)
  );
  saveRecipeComments(slug, nextComments);
}

function formatCommentTime(timestamp) {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}

function commentListMarkup(slug) {
  const user = window.authManager?.getUser();
  const comments = recipeComments(slug);

  if (!comments.length) {
    return `
      <article class="detail-card empty-state">
        <p>No comments yet. Be the first reader to share a note, serving tip, or quick review.</p>
      </article>
    `;
  }

  return comments
    .map((comment) => {
      const ownsComment = user && user.id === comment.userId;
      return `
        <article class="detail-card comment-card" data-comment-id="${comment.id}">
          <div class="comment-card__header">
            <div class="comment-card__author">
              <img class="comment-card__avatar" src="${comment.userPicture}" alt="${comment.userName}">
              <div>
                <strong>${escapeHtml(comment.userName)}</strong>
                <p>${formatCommentTime(comment.timestamp)}</p>
              </div>
            </div>
            ${ownsComment ? `<button class="button-secondary comment-card__delete" type="button" data-comment-delete="${comment.id}">Delete</button>` : ""}
          </div>
          <p>${escapeHtml(comment.text)}</p>
        </article>
      `;
    })
    .join("");
}

function commentComposerMarkup(recipe) {
  if (window.authManager?.isAuthenticated()) {
    return `
      <article class="detail-card detail-prose">
        <div class="detail-section-heading">
          <span class="pill">Leave a Comment</span>
          <h2>Share your take</h2>
          <p>Keep it useful: swaps, serving notes, or what you would cook with it next.</p>
        </div>
        <form class="form-grid" data-comment-form data-comment-slug="${recipe.slug}">
          <div class="input-group">
            <label for="comment-text">Comment</label>
            <textarea id="comment-text" name="comment" placeholder="I made this for a weeknight dinner and doubled the vegetables..." required></textarea>
          </div>
          <button class="button" type="submit">Post Comment</button>
        </form>
      </article>
    `;
  }

  return `
    <article class="detail-card detail-prose">
      <div class="detail-section-heading">
        <span class="pill">Comments</span>
        <h2>Sign in to join the conversation</h2>
        <p>Comments are tied to your account so saved recipes and feedback stay connected.</p>
      </div>
      <div class="button-row">
        <a class="button" href="login.html?next=${encodeURIComponent(`recipe.html?slug=${recipe.slug}`)}">Log In</a>
        <a class="button-secondary" href="signup.html?next=${encodeURIComponent(`recipe.html?slug=${recipe.slug}`)}">Create Account</a>
      </div>
    </article>
  `;
}

function isFavorite(slug) {
  return favoriteSlugs().includes(slug);
}

function toggleFavorite(slug) {
  if (window.authManager?.toggleSavedRecipe) {
    return window.authManager.toggleSavedRecipe(slug);
  }

  const favorites = favoriteSlugs();
  const nextFavorites = favorites.includes(slug)
    ? favorites.filter((value) => value !== slug)
    : [...favorites, slug];

  safeWriteStorage(FAVORITES_KEY, nextFavorites);
  document.dispatchEvent(new CustomEvent("favorites:updated"));
  return { success: true, saved: nextFavorites.includes(slug) };
}

function saveSubmission(recipe) {
  const recipes = submittedRecipes().filter((item) => item.slug !== recipe.slug);
  safeWriteStorage(SUBMISSIONS_KEY, [recipe, ...recipes]);
  document.dispatchEvent(new CustomEvent("submissions:updated"));
}

function getRecipeImage(recipe, className = "recipe-card__media") {
  if (recipe.image) {
    return `
      <a class="${className}" href="${recipeHref(recipe)}">
        <img src="${recipe.image}" alt="${recipe.imageAlt}">
      </a>
    `;
  }

  return `
    <a class="${className} recipe-card__media--placeholder recipe-card__media--${recipe.heroTone}" href="${recipeHref(recipe)}">
      <div class="placeholder-copy">
        <span class="pill">${recipe.category}</span>
        <strong>${recipe.title}</strong>
      </div>
    </a>
  `;
}

function favoriteButtonMarkup(recipe) {
  const active = isFavorite(recipe.slug);
  return `
    <button
      class="favorite-button${active ? " favorite-button--active" : ""}"
      type="button"
      data-favorite-toggle
      data-slug="${recipe.slug}"
      aria-pressed="${String(active)}"
    >
      ${active ? "Saved" : "Save Recipe"}
    </button>
  `;
}

function recipeCardMarkup(recipe) {
  return `
    <article class="recipe-card">
      ${getRecipeImage(recipe)}
      <div class="recipe-card__body">
        <div class="recipe-card__meta">
          <span class="tag">${recipe.category}</span>
          <span class="tag">${recipe.difficulty}</span>
          <span class="tag">${totalCookTime(recipe)} min</span>
          ${recipe.userSubmitted ? '<span class="tag">Community Added</span>' : ""}
        </div>
        <a href="${recipeHref(recipe)}">
          <h3>${recipe.title}</h3>
        </a>
        <p>${recipe.description}</p>
        <div class="meta-row">
          <span class="pill">${recipe.cuisine}</span>
          ${recipe.dietaryTags.map((tag) => `<span class="pill">${tag}</span>`).join("")}
        </div>
      </div>
      <div class="recipe-card__actions">
        <a class="button-secondary" href="${recipeHref(recipe)}">View Recipe</a>
        ${favoriteButtonMarkup(recipe)}
      </div>
    </article>
  `;
}

function sortRecipes(recipes, sortValue) {
  const sorted = [...recipes];

  switch (sortValue) {
    case "newest":
      sorted.sort((a, b) => new Date(b.addedOn) - new Date(a.addedOn));
      break;
    case "popular":
      sorted.sort((a, b) => b.popularScore - a.popularScore);
      break;
    case "quickest":
      sorted.sort((a, b) => totalCookTime(a) - totalCookTime(b));
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || b.popularScore - a.popularScore);
      break;
  }

  return sorted;
}

function renderRecipeCollection(target, recipes, fallbackText = "No recipes to show yet.") {
  target.innerHTML = recipes.length
    ? recipes.map((recipe) => recipeCardMarkup(recipe)).join("")
    : `<div class="empty-state">${fallbackText}</div>`;
}

function syncFavoriteButtons() {
  document.querySelectorAll("[data-favorite-toggle]").forEach((button) => {
    const slug = button.getAttribute("data-slug");
    const active = isFavorite(slug);
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("favorite-button--active", active);
    button.textContent = active ? "Saved" : "Save Recipe";
  });
}

function attachFavoriteHandler() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-favorite-toggle]");
    if (!button) {
      return;
    }

    const result = toggleFavorite(button.getAttribute("data-slug"));
    if (result?.requiresAuth) {
      window.authManager?.requireAuth({
        message: "Log in to save recipes to your account.",
        next: `${window.location.pathname.split("/").pop() || "recipes.html"}${window.location.search}`
      });
      return;
    }
    syncFavoriteButtons();
  });
}

function initializeRecipesPage() {
  const page = document.querySelector("[data-recipes-page]");
  if (!page) {
    return;
  }

  const searchInput = page.querySelector("[data-filter-search]");
  const categorySelect = page.querySelector("[data-filter-category]");
  const difficultySelect = page.querySelector("[data-filter-difficulty]");
  const sortSelect = page.querySelector("[data-filter-sort]");
  const tagContainer = page.querySelector("[data-filter-tags]");
  const clearButton = page.querySelector("[data-filter-clear]");
  const resultsCount = page.querySelector("[data-results-count]");
  const resultsGrid = page.querySelector("[data-results-grid]");
  const emptyState = page.querySelector("[data-results-empty]");
  const featuredGrid = page.querySelector("[data-featured-grid]");
  const popularGrid = page.querySelector("[data-popular-grid]");
  const recentGrid = page.querySelector("[data-recent-grid]");

  function categories() {
    return [...new Set(allRecipes().map((recipe) => recipe.category))].sort();
  }

  function difficulties() {
    return [...new Set(allRecipes().map((recipe) => recipe.difficulty))].sort();
  }

  function tags() {
    return [...new Set(allRecipes().flatMap((recipe) => recipe.dietaryTags))].sort();
  }

  function populateFilters() {
    categorySelect.innerHTML = `<option value="">All categories</option>${categories()
      .map((category) => `<option value="${category}">${category}</option>`)
      .join("")}`;

    difficultySelect.innerHTML = `<option value="">All difficulties</option>${difficulties()
      .map((difficulty) => `<option value="${difficulty}">${difficulty}</option>`)
      .join("")}`;

    tagContainer.innerHTML = tags()
      .map(
        (tag) =>
          `<button class="filter-chip" type="button" data-tag-value="${tag}" aria-pressed="false">${tag}</button>`
      )
      .join("");
  }

  function getState() {
    const params = new URLSearchParams(window.location.search);
    return {
      search: params.get("q") || "",
      category: params.get("category") || "",
      difficulty: params.get("difficulty") || "",
      tag: params.get("tag") || "",
      sort: params.get("sort") || "featured"
    };
  }

  function setState(nextState) {
    const params = new URLSearchParams();
    if (nextState.search) params.set("q", nextState.search);
    if (nextState.category) params.set("category", nextState.category);
    if (nextState.difficulty) params.set("difficulty", nextState.difficulty);
    if (nextState.tag) params.set("tag", nextState.tag);
    if (nextState.sort && nextState.sort !== "featured") params.set("sort", nextState.sort);
    const query = params.toString();
    const nextUrl = query ? `recipes.html?${query}` : "recipes.html";
    window.history.replaceState({}, "", nextUrl);
    render();
  }

  function syncControls(state) {
    searchInput.value = state.search;
    categorySelect.value = state.category;
    difficultySelect.value = state.difficulty;
    sortSelect.value = state.sort;

    tagContainer.querySelectorAll("[data-tag-value]").forEach((button) => {
      const isActive = button.getAttribute("data-tag-value") === state.tag;
      button.setAttribute("aria-pressed", String(isActive));
      button.classList.toggle("filter-chip--active", isActive);
    });
  }

  function render() {
    populateFilters();
    const state = getState();
    syncControls(state);

    const filtered = sortRecipes(
      allRecipes().filter((recipe) => {
        const haystack = [recipe.title, recipe.description, recipe.cuisine, recipe.category, ...recipe.dietaryTags]
          .join(" ")
          .toLowerCase();

        return (
          (!state.search || haystack.includes(state.search.toLowerCase())) &&
          (!state.category || recipe.category === state.category) &&
          (!state.difficulty || recipe.difficulty === state.difficulty) &&
          (!state.tag || recipe.dietaryTags.includes(state.tag))
        );
      }),
      state.sort
    );

    resultsCount.textContent = `${filtered.length} recipe${filtered.length === 1 ? "" : "s"} found`;
    renderRecipeCollection(resultsGrid, filtered);
    emptyState.hidden = filtered.length > 0;

    renderRecipeCollection(featuredGrid, allRecipes().filter((recipe) => recipe.featured).slice(0, 3));
    renderRecipeCollection(popularGrid, sortRecipes(allRecipes(), "popular").slice(0, 3));
    renderRecipeCollection(recentGrid, sortRecipes(allRecipes(), "newest").slice(0, 3));
    syncFavoriteButtons();
  }

  searchInput.addEventListener("input", () => {
    const state = getState();
    setState({ ...state, search: searchInput.value.trim() });
  });

  categorySelect.addEventListener("change", () => setState({ ...getState(), category: categorySelect.value }));
  difficultySelect.addEventListener("change", () => setState({ ...getState(), difficulty: difficultySelect.value }));
  sortSelect.addEventListener("change", () => setState({ ...getState(), sort: sortSelect.value }));

  tagContainer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tag-value]");
    if (!button) {
      return;
    }

    const state = getState();
    const tag = button.getAttribute("data-tag-value");
    setState({ ...state, tag: state.tag === tag ? "" : tag });
  });

  clearButton.addEventListener("click", () => {
    window.history.replaceState({}, "", "recipes.html");
    render();
  });

  document.addEventListener("submissions:updated", render);
  document.addEventListener("favorites:updated", syncFavoriteButtons);
  render();
}

function initializeRecipeDetailPage() {
  const page = document.querySelector("[data-recipe-detail-page]");
  if (!page) {
    return;
  }

  const slug = new URLSearchParams(window.location.search).get("slug");
  const recipe = findRecipe(slug);
  const titleNode = page.querySelector("[data-detail-title]");
  const layoutNode = page.querySelector("[data-detail-layout]");

  if (!recipe) {
    titleNode.textContent = "Recipe not found";
    layoutNode.innerHTML = `
      <article class="detail-card empty-state">
        <p>That recipe does not exist yet. Head back to the recipe index to browse the current collection.</p>
        <div class="button-row">
          <a class="button" href="recipes.html">Back to Recipes</a>
        </div>
      </article>
    `;
    return;
  }

  const related = allRecipes()
    .filter((item) => item.slug !== recipe.slug && (item.category === recipe.category || item.cuisine === recipe.cuisine))
    .slice(0, 3);

  const nutritionMarkup = Object.entries(recipe.nutrition)
    .map(
      ([label, value]) => `
        <article class="stats-card">
          <strong>${value}</strong>
          <p>${label.charAt(0).toUpperCase() + label.slice(1)}</p>
        </article>
      `
    )
    .join("");

  document.title = `Forks & Freedom | ${recipe.title}`;
  titleNode.textContent = recipe.title;
  layoutNode.innerHTML = `
    <section class="detail-layout detail-layout--hero">
      <article class="detail-card detail-media-card">
        ${getRecipeImage(recipe, "recipe-card__media detail-media")}
      </article>

      <article class="detail-card detail-summary">
        <div class="detail-summary__header">
          <span class="eyebrow">${recipe.category}</span>
          <h1>${recipe.title}</h1>
          <p class="detail-lead">${recipe.description}</p>
        </div>

        <div class="detail-meta-cluster">
          <div class="meta-row">
            <span class="tag">${recipe.cuisine}</span>
            <span class="tag">${recipe.difficulty}</span>
            <span class="tag">${recipe.servings} servings</span>
            ${recipe.userSubmitted ? '<span class="tag">Community Added</span>' : ""}
            ${recipe.dietaryTags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>
          <div class="button-row">
            ${favoriteButtonMarkup(recipe)}
            <a class="button-secondary" href="#recipe-instructions">Jump to steps</a>
          </div>
        </div>

        <div class="stats-grid">
          <article class="stats-card">
            <strong>${recipe.prepMinutes} min</strong>
            <p>Prep time</p>
          </article>
          <article class="stats-card">
            <strong>${recipe.cookMinutes} min</strong>
            <p>Cook time</p>
          </article>
          <article class="stats-card">
            <strong>${totalCookTime(recipe)} min</strong>
            <p>Total time</p>
          </article>
          <article class="stats-card">
            <strong>${recipe.servings}</strong>
            <p>Servings</p>
          </article>
        </div>

        <div class="detail-divider" aria-hidden="true"></div>

        <div class="detail-highlights">
          <p class="detail-muted">Built for ${recipe.category.toLowerCase()} nights with a ${recipe.difficulty.toLowerCase()}-friendly workflow and clear ingredient prep.</p>
        </div>
      </article>
    </section>

    <section class="detail-content-grid">
      <article class="detail-card detail-prose" id="recipe-instructions">
        <div class="detail-section-heading">
          <span class="pill">Method</span>
          <h2>Instructions</h2>
          <p>Use the step list as a quick cooking flow, then reference the snapshot for serving context and recipe notes.</p>
        </div>
        <ol class="step-list">
          ${recipe.instructions.map((step) => `<li>${step}</li>`).join("")}
        </ol>
      </article>

      <aside class="detail-sidebar-stack">
        <article class="detail-card">
          <div class="detail-section-heading">
            <span class="pill">Ingredients</span>
            <h2>What you need</h2>
          </div>
          <ul class="checklist">
            ${recipe.ingredients.map((ingredient) => `<li>${ingredient}</li>`).join("")}
          </ul>
        </article>

        <article class="detail-card detail-prose">
          <div class="detail-section-heading">
            <span class="pill">Snapshot</span>
            <h2>Recipe snapshot</h2>
          </div>
          <ul class="list-clean">
            <li><strong>Cuisine:</strong> ${recipe.cuisine}</li>
            <li><strong>Difficulty:</strong> ${recipe.difficulty}</li>
            <li><strong>Dietary tags:</strong> ${recipe.dietaryTags.join(", ")}</li>
            <li><strong>Best for:</strong> ${recipe.category}</li>
          </ul>
        </article>
      </aside>
    </section>

    <section class="section">
      <div>
        <span class="pill">Nutrition</span>
        <h2 class="section-title">Optional nutrition snapshot</h2>
      </div>
      <div class="stats-grid">${nutritionMarkup}</div>
    </section>

    <section class="detail-content-grid">
      ${commentComposerMarkup(recipe)}
      <div class="detail-sidebar-stack">
        <div class="detail-section-heading">
          <span class="pill">Reader Notes</span>
          <h2>Recipe comments</h2>
        </div>
        ${commentListMarkup(recipe.slug)}
      </div>
    </section>

    <section class="section">
      <div>
        <span class="pill">Related Recipes</span>
        <h2 class="section-title">Keep cooking in the same lane.</h2>
      </div>
      <div class="recipe-grid">
        ${related.map((item) => recipeCardMarkup(item)).join("")}
      </div>
    </section>
  `;

  syncFavoriteButtons();
  attachRecipeCommentHandlers(recipe.slug);
}

function attachRecipeCommentHandlers(slug) {
  document.querySelector("[data-comment-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const textarea = form.querySelector("textarea");
    if (!textarea || !textarea.value.trim()) {
      return;
    }

    const result = addRecipeComment(slug, textarea.value);
    if (result.requiresAuth) {
      window.authManager?.requireAuth({
        message: "Log in to comment on recipes.",
        next: `recipe.html?slug=${encodeURIComponent(slug)}`
      });
      return;
    }
    initializeRecipeDetailPage();
  });

  document.querySelectorAll("[data-comment-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteRecipeComment(slug, button.getAttribute("data-comment-delete"));
      initializeRecipeDetailPage();
    });
  });
}

function initializeCategoriesPage() {
  const page = document.querySelector("[data-categories-page]");
  if (!page) {
    return;
  }

  const categories = [...new Set(allRecipes().map((recipe) => recipe.category))].sort();
  const target = page.querySelector("[data-category-sections]");

  target.innerHTML = categories
    .map((category) => {
      const recipes = allRecipes().filter((recipe) => recipe.category === category).slice(0, 3);
      return `
        <section class="section">
          <div>
            <span class="pill">${category}</span>
            <h2 class="section-title">${recipes.length} recipe${recipes.length === 1 ? "" : "s"} in ${category}</h2>
          </div>
          <div class="recipe-grid">
            ${recipes.map((recipe) => recipeCardMarkup(recipe)).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  syncFavoriteButtons();
}

function initializeFavoritesPage() {
  const page = document.querySelector("[data-favorites-page]");
  if (!page || page.hasAttribute("data-auth-blocked")) {
    return;
  }

  const grid = page.querySelector("[data-favorites-grid]");
  const count = page.querySelector("[data-favorites-count]");

  function render() {
    if (window.authManager && !window.authManager.isAuthenticated()) {
      count.textContent = "Sign in to unlock your saved collection";
      grid.innerHTML = `
        <article class="detail-card empty-state">
          <p>Saved recipes are tied to your account so you can keep a personal shortlist across the site.</p>
          <div class="button-row">
            <a class="button" href="login.html?next=${encodeURIComponent("favorites.html")}">Log In</a>
            <a class="button-secondary" href="signup.html?next=${encodeURIComponent("favorites.html")}">Create Account</a>
          </div>
        </article>
      `;
      return;
    }

    const recipes = allRecipes().filter((recipe) => isFavorite(recipe.slug));
    count.textContent = `${recipes.length} saved recipe${recipes.length === 1 ? "" : "s"}`;
    renderRecipeCollection(
      grid,
      recipes,
      'You have not saved any recipes yet. Browse the recipe index and use "Save" to build your shortlist.'
    );
    syncFavoriteButtons();
  }

  document.addEventListener("favorites:updated", render);
  document.addEventListener("submissions:updated", render);
  window.addEventListener("auth:changed", render);
  render();
}

function initializeDashboardPage() {
  const page = document.querySelector("[data-dashboard-page]");
  if (!page || page.hasAttribute("data-auth-blocked")) {
    return;
  }

  const metrics = page.querySelector("[data-dashboard-metrics]");
  const recipesGrid = page.querySelector("[data-dashboard-recipes]");

  function render() {
    if (window.authManager && !window.authManager.isAuthenticated()) {
      metrics.innerHTML = `
        <article class="detail-card empty-state">
          <p>Sign in to view your recipe activity, submissions, and saved recipes in one place.</p>
        </article>
      `;
      recipesGrid.innerHTML = "";
      return;
    }

    const mine = mySubmittedRecipes();
    const recent = mine[0];
    metrics.innerHTML = `
      <article class="stats-card">
        <strong>${mine.length}</strong>
        <p>Recipes submitted</p>
      </article>
      <article class="stats-card">
        <strong>${favoriteSlugs().length}</strong>
        <p>Recipes saved</p>
      </article>
      <article class="stats-card">
        <strong>${recent ? recent.title : "None yet"}</strong>
        <p>Most recent submission</p>
      </article>
    `;

    renderRecipeCollection(
      recipesGrid,
      mine,
      "Your submitted recipes will appear here after you use the recipe submission form."
    );
    syncFavoriteButtons();
  }

  document.addEventListener("submissions:updated", render);
  document.addEventListener("favorites:updated", render);
  window.addEventListener("auth:changed", render);
  render();
}

function initializeSearchPage() {
  const page = document.querySelector("[data-search-page]");
  if (!page) {
    return;
  }

  const form = page.querySelector("[data-search-form]");
  const input = page.querySelector("[data-search-input]");
  const count = page.querySelector("[data-search-count]");
  const grid = page.querySelector("[data-search-grid]");

  function render() {
    const params = new URLSearchParams(window.location.search);
    const query = (params.get("q") || "").trim();
    input.value = query;

    if (!query) {
      count.textContent = "Enter a search term to explore recipes.";
      renderRecipeCollection(grid, [], "Try searching for salmon, pasta, dessert, or high-protein.");
      return;
    }

    const results = allRecipes().filter((recipe) =>
      [recipe.title, recipe.description, recipe.cuisine, recipe.category, ...recipe.dietaryTags]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase())
    );

    count.textContent = `${results.length} result${results.length === 1 ? "" : "s"} for "${query}"`;
    renderRecipeCollection(grid, results, `No recipes matched "${query}".`);
    syncFavoriteButtons();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    const nextUrl = query ? `search.html?q=${encodeURIComponent(query)}` : "search.html";
    window.history.replaceState({}, "", nextUrl);
    render();
  });

  document.addEventListener("submissions:updated", render);
  render();
}

function initializeSubmitPage() {
  const page = document.querySelector("[data-submit-page]");
  if (!page) {
    return;
  }

  const form = page.querySelector("[data-submit-form]");
  const feedback = page.querySelector("[data-submit-feedback]");

  function ensureAuthenticated() {
    if (window.authManager?.isAuthenticated()) {
      return true;
    }

    feedback.textContent = "Log in or create an account before submitting a recipe.";
    feedback.hidden = false;
    window.authManager?.requireAuth({
      message: "Create an account to submit recipes to Forks & Freedom.",
      next: "submit.html"
    });
    return false;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!ensureAuthenticated()) {
      return;
    }
    const formData = new FormData(form);

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const cuisine = String(formData.get("cuisine") || "").trim();
    const difficulty = String(formData.get("difficulty") || "").trim();
    const prepMinutes = Number(formData.get("prepMinutes") || 0);
    const cookMinutes = Number(formData.get("cookMinutes") || 0);
    const servings = Number(formData.get("servings") || 0);
    const dietaryTags = String(formData.get("dietaryTags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const ingredients = String(formData.get("ingredients") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const instructions = String(formData.get("instructions") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!title || !description || !category || !cuisine || !difficulty || !prepMinutes || !cookMinutes || !servings || !ingredients.length || !instructions.length) {
      feedback.textContent = "Complete every field before submitting your recipe.";
      feedback.hidden = false;
      return;
    }

    saveSubmission({
      slug: slugify(title),
      title,
      description,
      authorId: window.authManager?.getUser()?.id || "anonymous",
      authorName: window.authManager?.getUser()?.name || "Guest",
      category,
      cuisine,
      difficulty,
      dietaryTags: dietaryTags.length ? dietaryTags : ["Custom"],
      prepMinutes,
      cookMinutes,
      servings,
      ingredients,
      instructions,
      addedOn: new Date().toISOString().slice(0, 10),
      heroTone: ["sage", "amber", "charcoal", "berry"][submittedRecipes().length % 4],
      nutrition: {
        calories: "Custom",
        protein: "Custom",
        carbs: "Custom",
        fat: "Custom"
      }
    });

    form.reset();
    feedback.hidden = false;
    feedback.textContent = "Recipe submitted. It is now available in the dashboard, search, and recipe browse pages.";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  attachFavoriteHandler();
  initializeRecipesPage();
  initializeRecipeDetailPage();
  initializeCategoriesPage();
  initializeFavoritesPage();
  initializeDashboardPage();
  initializeSearchPage();
  initializeSubmitPage();
  syncFavoriteButtons();
});
