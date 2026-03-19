function totalCookTime(recipe) {
  return recipe.prepMinutes + recipe.cookMinutes;
}

function recipeHref(recipe) {
  return `recipe.html?slug=${encodeURIComponent(recipe.slug)}`;
}

function findRecipe(slug) {
  return (window.RECIPES || []).find((recipe) => recipe.slug === slug);
}

function getRecipeImage(recipe, className = "recipe-card__media") {
  if (recipe.image) {
    return `
      <div class="${className}">
        <img src="${recipe.image}" alt="${recipe.imageAlt}">
      </div>
    `;
  }

  return `
    <div class="${className} recipe-card__media--placeholder recipe-card__media--${recipe.heroTone}">
      <div class="placeholder-copy">
        <span class="pill">${recipe.category}</span>
        <strong>${recipe.title}</strong>
      </div>
    </div>
  `;
}

function recipeCardMarkup(recipe) {
  return `
    <a class="recipe-card" href="${recipeHref(recipe)}">
      ${getRecipeImage(recipe)}
      <div class="recipe-card__body">
        <div class="recipe-card__meta">
          <span class="tag">${recipe.category}</span>
          <span class="tag">${recipe.difficulty}</span>
          <span class="tag">${totalCookTime(recipe)} min</span>
        </div>
        <h3>${recipe.title}</h3>
        <p>${recipe.description}</p>
        <div class="meta-row">
          <span class="pill">${recipe.cuisine}</span>
          ${recipe.dietaryTags.map((tag) => `<span class="pill">${tag}</span>`).join("")}
        </div>
      </div>
    </a>
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

function initializeRecipesPage() {
  const page = document.querySelector("[data-recipes-page]");
  if (!page || !window.RECIPES) {
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

  const categories = [...new Set(window.RECIPES.map((recipe) => recipe.category))].sort();
  const difficulties = [...new Set(window.RECIPES.map((recipe) => recipe.difficulty))].sort();
  const tags = [...new Set(window.RECIPES.flatMap((recipe) => recipe.dietaryTags))].sort();

  categorySelect.innerHTML = `<option value="">All categories</option>${categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("")}`;

  difficultySelect.innerHTML = `<option value="">All difficulties</option>${difficulties
    .map((difficulty) => `<option value="${difficulty}">${difficulty}</option>`)
    .join("")}`;

  tagContainer.innerHTML = tags
    .map(
      (tag) =>
        `<button class="filter-chip" type="button" data-tag-value="${tag}" aria-pressed="false">${tag}</button>`
    )
    .join("");

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

  function renderCollection(target, recipes) {
    target.innerHTML = recipes.map((recipe) => recipeCardMarkup(recipe)).join("");
  }

  function render() {
    const state = getState();
    syncControls(state);

    const filtered = sortRecipes(
      window.RECIPES.filter((recipe) => {
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
    resultsGrid.innerHTML = filtered.map((recipe) => recipeCardMarkup(recipe)).join("");
    emptyState.hidden = filtered.length > 0;

    renderCollection(featuredGrid, window.RECIPES.filter((recipe) => recipe.featured).slice(0, 3));
    renderCollection(popularGrid, sortRecipes(window.RECIPES, "popular").slice(0, 3));
    renderCollection(recentGrid, sortRecipes(window.RECIPES, "newest").slice(0, 3));
  }

  searchInput.addEventListener("input", () => {
    const state = getState();
    setState({ ...state, search: searchInput.value.trim() });
  });

  categorySelect.addEventListener("change", () => {
    const state = getState();
    setState({ ...state, category: categorySelect.value });
  });

  difficultySelect.addEventListener("change", () => {
    const state = getState();
    setState({ ...state, difficulty: difficultySelect.value });
  });

  sortSelect.addEventListener("change", () => {
    const state = getState();
    setState({ ...state, sort: sortSelect.value });
  });

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

  render();
}

function initializeRecipeDetailPage() {
  const page = document.querySelector("[data-recipe-detail-page]");
  if (!page || !window.RECIPES) {
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

  document.title = `Forks & Freedom | ${recipe.title}`;

  const related = window.RECIPES
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

  titleNode.textContent = recipe.title;
  layoutNode.innerHTML = `
    <section class="detail-layout">
      <article class="detail-card detail-image">
        ${getRecipeImage(recipe, "recipe-card__media detail-media")}
      </article>

      <aside class="detail-sidebar">
        <article class="detail-card detail-hero">
          <span class="eyebrow">${recipe.category}</span>
          <h1>${recipe.title}</h1>
          <p class="detail-lead">${recipe.description}</p>
          <div class="meta-row">
            <span class="tag">${recipe.cuisine}</span>
            <span class="tag">${recipe.difficulty}</span>
            <span class="tag">${recipe.servings} servings</span>
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
          </div>
        </article>

        <article class="detail-card">
          <h2>Ingredients</h2>
          <ul class="checklist">
            ${recipe.ingredients.map((ingredient) => `<li>${ingredient}</li>`).join("")}
          </ul>
        </article>
      </aside>
    </section>

    <section class="two-column">
      <article class="detail-card">
        <h2>Instructions</h2>
        <ol class="step-list">
          ${recipe.instructions.map((step) => `<li>${step}</li>`).join("")}
        </ol>
      </article>

      <article class="detail-card">
        <h2>Recipe Snapshot</h2>
        <ul class="list-clean">
          <li><strong>Cuisine:</strong> ${recipe.cuisine}</li>
          <li><strong>Difficulty:</strong> ${recipe.difficulty}</li>
          <li><strong>Dietary tags:</strong> ${recipe.dietaryTags.join(", ")}</li>
          <li><strong>Best for:</strong> ${recipe.category}</li>
        </ul>
      </article>
    </section>

    <section class="section">
      <div>
        <span class="pill">Nutrition</span>
        <h2 class="section-title">Optional nutrition snapshot</h2>
      </div>
      <div class="stats-grid">${nutritionMarkup}</div>
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
}

document.addEventListener("DOMContentLoaded", () => {
  initializeRecipesPage();
  initializeRecipeDetailPage();
});
