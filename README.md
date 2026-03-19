# Forks & Freedom

Forks & Freedom is a portfolio-quality food blog built with HTML, CSS, and vanilla JavaScript. The project now combines a polished recipe experience with editorial blog content, local-first account flows, saved recipes, recipe comments, and a cleaner shared design system.

## What Changed

The latest upgrade focused on four product areas:

- Recipe detail polish: responsive layouts, safer text wrapping, cleaner stat cards, and better use of desktop space
- Auth and account flows: dedicated login, signup, forgot-password, and account pages with support for traditional auth plus optional Google sign-in
- Saved recipes and comments: account-protected recipe saves, recipe-specific comment threads, and a more complete dashboard experience
- Real blog experience: a blog landing page, post template, editorial post data, and homepage integration so the site feels like a real food/lifestyle brand

## Core Features

- Shared site shell with a responsive navbar, footer, reusable cards, and consistent spacing
- Dynamic recipe library with categories, cuisine, difficulty, time, servings, dietary tags, and nutrition
- Dynamic recipe detail route powered by `recipe.html?slug=...`
- Account-aware saved recipes stored per user in `localStorage`
- Account-protected recipe comments keyed by recipe slug
- Traditional email/username plus password authentication
- Optional Google sign-in flow when a valid client ID is configured
- Account page for profile updates
- Saved recipes page, dashboard page, and auth-aware navigation state
- Editorial blog landing page and individual article template
- Search, filtering, sorting, categories, local recipe submission, and custom `404.html`

## Screenshots

### Home
![Home page](docs/assets/images/home-page.png)

### Recipes
![Recipes page](docs/assets/images/recipes-page.png)

### Recipe Detail
![Recipe detail page](docs/assets/images/recipe-detail-page.png)

### Dashboard
![Dashboard page](docs/assets/images/dashboard-page.png)

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- `localStorage` for account, saved recipe, comment, and submission persistence
- Google Identity Services for optional Google sign-in

## Project Structure

```text
Comp126/
├── index.html
├── recipes.html
├── recipe.html
├── blog.html
├── post.html
├── categories.html
├── favorites.html
├── submit.html
├── dashboard.html
├── login.html
├── signup.html
├── forgot-password.html
├── account.html
├── search.html
├── about.html
├── contact.html
├── 404.html
├── javascript/
│   ├── config.js
│   ├── site.js
│   ├── auth.js
│   ├── recipe-data.js
│   ├── recipes-app.js
│   ├── blog-data.js
│   └── blog-app.js
├── styles/
│   └── site.css
├── Photos/
└── docs/
    ├── upgrade-audit-plan.md
    └── assets/images/
```

## Running Locally

No install step or build process is required.

### Option 1

```bash
python3 -m http.server 4173
```

Open [http://127.0.0.1:4173/index.html](http://127.0.0.1:4173/index.html).

### Option 2

Use VS Code Live Server from the repository root and open `index.html`.

## Auth Setup

Traditional login and signup work immediately with local browser storage.

Google sign-in is optional. To enable it:

1. Create a Google OAuth client for a web application in Google Cloud Console.
2. Open [`javascript/config.js`](/Users/devonarnone/Documents/GitHub/Comp126/javascript/config.js).
3. Replace the empty `googleClientId` value with your real client ID.
4. Serve the site locally and use the login or signup page to test the Google flow.

If `googleClientId` is left empty, the UI shows a graceful setup callout instead of a broken sign-in button.

## Persistence Model

This is still a static site, so product state is stored locally in the browser:

- Accounts are stored in `localStorage`
- Saved recipes are stored per signed-in user
- Recipe comments are stored per recipe slug
- Submitted recipes are stored locally and tied to the current signed-in user

Clearing browser storage resets that local state.

## Product Pages

- `index.html`: homepage with recipes, brand positioning, and blog content
- `recipes.html`: browse, filter, sort, and discover recipes
- `recipe.html`: recipe detail page with saved state and comments
- `blog.html`: editorial landing page
- `post.html`: shared blog post template route
- `favorites.html`: saved recipes for the signed-in user
- `dashboard.html`: personal activity view for saved recipes, submissions, and comments
- `submit.html`: account-protected recipe submission flow
- `login.html`, `signup.html`, `forgot-password.html`, `account.html`: auth and account tools

## Deployment Notes

The project remains a static site and can be deployed with GitHub Pages or any static host.

1. Push the repository to GitHub.
2. Configure your static host or GitHub Pages to publish from the repository root.
3. If you want Google sign-in in production, make sure the deployed domain is allowed in your Google OAuth configuration and update `javascript/config.js` before publishing.

## Future Improvements

- Replace local-first auth and persistence with a real backend and database
- Add moderation controls or richer comment threading
- Add image upload support for recipe submissions
- Add automated UI regression checks for recipe detail, blog, and auth flows
- Capture fresh screenshots for the new blog and auth pages
