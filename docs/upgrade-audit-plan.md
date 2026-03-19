# Food Blog Upgrade Audit

## Current Application Audit

### Tech Stack
- Static multi-page site built with HTML, CSS, and vanilla JavaScript.
- Responsive navigation relies on `responsive-nav.js`, `fastclick.js`, `fixed-responsive-nav.js`, and `scroll.js`.
- Typography loads from Google Fonts using `Goblin One` and `Hepta Slab`.
- No build step, package manager, component framework, or server-side runtime is currently present.

### Routing Structure
- `/index.html`: homepage with mission statement, newsletter form, and image grid.
- `/recipes.html`: recipe listing page.
- `/TS1.html`, `/burger.html`, `/applecrisp.html`, `/JG1.html`: individual recipe pages.
- `/about.html`: author/about page.
- `/contact.html`: contact page.

### Global Layout And Styling Patterns
- Shared navigation is duplicated in every page.
- Shared footer is duplicated in every page.
- Global typography rules live in `styles/header.css`.
- Each page has its own CSS file with repeated layout, card, image, and spacing rules.
- Styling is inconsistent across pages in spacing, widths, shadows, border radii, and section structure.
- Several pages rely on `main` with page-specific flex rules and ad hoc margins rather than a consistent shell.

### Scrollbar / Overflow Findings
- `styles/recipesstyles.css` sets `.main_section { height: 100vh; }`, which forces the recipes content to occupy a full viewport height before adding the header and footer. That creates guaranteed document overflow and is the strongest current scrollbar bug candidate.
- Multiple pages add `margin-top: 40px` to `main` even though the header is already in normal document flow. This inflates page height and contributes to awkward spacing and extra scroll.
- Large fixed heights such as `.recipe_img { height: 1000px; }` on desktop create oversized scroll regions and brittle layouts.
- Layout rules are split between `header.css` and page CSS files, making overflow fixes harder to apply consistently.

### Content And Product Gaps
- Recipe dataset is very small and spread across separate static pages.
- Recipe cards lack metadata, summaries, tags, difficulty, or scan-friendly structure.
- No search, category filtering, sorting, saved recipes, related recipes, empty states, or richer discovery tools.
- No categories page, favorites page, recipe submission page, search results page, or custom 404 page.
- Forms do not have validation feedback or polished states.
- README does not explain the product, setup, or screenshots.

## Recommended Upgrade Phases

### Phase 1
- Preserve the current static-site architecture, but introduce a shared design system CSS layer and a reusable page shell pattern.
- Consolidate repeated styles into a small number of global files instead of rewriting the project into a new framework.

### Phase 2
- Modernize the shared layout: navbar, footer, containers, buttons, forms, cards, spacing, typography, and responsive breakpoints.
- Unify image handling, hover states, and page section structure.

### Phase 3
- Remove fixed-height and viewport-height layout traps.
- Standardize page flow so only the document scrolls unless a component explicitly needs local scrolling.
- Verify the recipes page and detail pages for duplicate scrollbar behavior across screen sizes.

### Phase 4
- Convert recipe content into a structured data source in JavaScript.
- Rebuild browse and detail experiences around richer metadata: prep time, cook time, servings, cuisine, difficulty, dietary tags, ingredients, instructions, and optional nutrition.
- Add featured, popular, recent, search, filter, and sort experiences.

### Phase 5
- Add purposeful portfolio-quality pages: categories, favorites, submit recipe, search results, and 404.
- Expand homepage sections so the product feels complete instead of a set of isolated school pages.

### Phase 6
- Refactor duplicated markup and styling into reusable patterns.
- Improve naming consistency, file organization, and maintainability while staying interview-friendly and easy to explain.

### Phase 7
- Rewrite the README with a polished overview, feature list, tech stack, local setup, project structure, screenshots, and future roadmap.
- Save screenshots under `docs/assets/images`.

## 2026-03-18 Follow-Up Audit: Recipe Detail, Auth, And Blog Experience

### Current Active Pages
- `index.html`: marketing-style homepage
- `recipes.html`: dynamic recipe browse page
- `recipe.html`: shared recipe detail route powered by `slug` query params
- `categories.html`, `favorites.html`, `submit.html`, `dashboard.html`, `search.html`, `404.html`
- Legacy detail routes (`TS1.html`, `burger.html`, `applecrisp.html`, `JG1.html`) currently redirect into `recipe.html`

### Current Styling And Layout System
- The active experience uses `styles/site.css` with a reusable shell injected by `javascript/site.js`.
- The design system is broadly consistent, but some older auth and comment styles live in separate legacy files: `styles/auth.css` and `styles/comments.css`.
- The auth and comment styles are not currently loaded by the active pages, so they are effectively detached from the live product.

### Recipe Detail Structure
- `recipe.html` renders a shared detail shell.
- `javascript/recipes-app.js` injects the detail layout, stat cards, nutrition cards, and related recipes at runtime.
- The detail page is driven by `window.RECIPES` plus locally submitted recipes stored in `localStorage`.

### Recipe Detail Layout Problems
- The detail layout uses a narrow sidebar on desktop: `grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.7fr)`.
- Inside that sidebar, the stat cards use `repeat(auto-fit, minmax(180px, 1fr))`, which is too rigid for narrow columns and leads to awkward stacking and card crowding.
- The detail image wrapper uses the same padded `detail-card` treatment as text cards, which creates excessive whitespace and inconsistent visual rhythm, especially for placeholder media.
- Several headings and card values rely on large display typography without extra guardrails like `overflow-wrap`, tighter line-height control, or narrower responsive steps.
- The current page has no integrated comment block, so there is no way to validate layout harmony between detail content and comments in the live route.

### Auth Implementation Status
- `javascript/auth.js` contains a localStorage-backed auth manager with register/login modal behavior.
- Google SSO is not functioning in the live implementation:
  - the script loader exists,
  - the configured client ID is still `YOUR_GOOGLE_CLIENT_ID`,
  - `handleGoogleSSOClick()` currently shows an alert that SSO is unavailable instead of starting a real sign-in flow.
- Traditional auth exists only as a modal implementation; there are no dedicated login, signup, account, or forgot-password pages in the active app.
- The active site shell in `javascript/site.js` does not render `#auth-container` at all, so the auth manager never has a mount point even if the script is loaded.

### Save And Comment Modeling Status
- Saved recipes are currently anonymous and not auth-protected:
  - favorites are stored directly in `localStorage` under `forks-freedom-favorites`
  - any visitor can save recipes without signing in
- Submitted recipes are also stored locally under `forks-freedom-submissions`.
- `javascript/comments.js` exists but is not wired into the active detail route.
- If comments were turned on without adjustment, they would be incorrectly keyed:
  - comment storage uses the current pathname (`recipe`) rather than the `slug` query param
  - that would collapse comments from every dynamic recipe into one shared thread

### Blog Experience Status
- The site still behaves more like a recipe product than a full food blog.
- There is no blog landing page, no post template, no editorial navigation path, and no post data model.
- Homepage copy is strong, but it does not yet branch into a story-driven or editorial content experience.

### Most Important Fixes To Make Next
- Rebuild the recipe detail layout so stat cards, hero metadata, image/media blocks, and text content stay balanced across desktop, tablet, and mobile.
- Integrate auth into the actual site shell and restore realistic Google + email/password entry points.
- Gate save/comment actions behind auth and use per-user local persistence where no backend exists.
- Add a comment section to the active detail route, keyed by recipe slug instead of pathname.
- Add blog landing and blog post pages so the product reads as a real food blog rather than only a recipe browser.

## 2026-03-18 Implementation Plan

### Phase 2: Recipe Detail And Shared Layout
- Tighten the recipe detail grid so the image, editorial content, sidebar cards, and nutrition sections use available horizontal space more intelligently on desktop.
- Add defensive wrapping rules for headings, stat values, tags, buttons, and list content to prevent overflow on narrow cards.
- Refine shared card, button, and spacing tokens in `styles/site.css` so recipe detail fixes also improve other pages with the same UI primitives.
- Expand the active recipe detail route with a cleaner editorial structure that leaves room for save and comment interactions.

### Phase 3: Auth Restoration
- Replace the detached modal-only auth experience with a site-integrated auth layer and dedicated login, signup, and account pages.
- Keep the existing localStorage-based architecture for traditional auth, but move to a clearer session model, per-user saved recipes, and stronger UI states.
- Restore Google entry points using a real configuration path: only activate the Google sign-in flow when a client ID is provided, and degrade gracefully when it is not.

### Phase 4: Save And Comment Experience
- Make save/favorite actions require authentication and store them per user rather than globally.
- Wire comments into the active `recipe.html` route, keyed by recipe slug so each recipe has its own thread.
- Add empty, loading, and unauthenticated states that match the new design system instead of using browser alerts.

### Phase 5: Blog Experience
- Add a structured blog data source plus a blog landing page and individual blog post template.
- Extend the homepage and navigation so editorial content is visible throughout the app, not isolated from recipes.
- Reuse the same card, metadata, and section patterns so the blog feels native to the product.

### Phase 6 And Beyond: Account, Cleanup, And Docs
- Add a saved recipes page refresh, account page, auth-aware navigation, and protected user flows for recipe submission and commenting.
- Remove or consolidate legacy styling and scripts that are no longer part of the active experience.
- Update the README with the new auth, blog, save, and comment flows, plus any required Google environment setup.
