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
