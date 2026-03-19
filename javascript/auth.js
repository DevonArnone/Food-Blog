const AUTH_USERS_KEY = "forks-freedom-users-v2";
const AUTH_SESSION_KEY = "forks-freedom-session-v2";
const PASSWORD_RESET_LOG_KEY = "forks-freedom-password-resets";

function authStorageRead(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function authStorageWrite(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function authPageName() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function authAvatar(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Forks And Freedom")}&background=16302b&color=f6f1e8&size=128`;
}

function escapeAttribute(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

class AuthManager {
  constructor() {
    this.users = authStorageRead(AUTH_USERS_KEY, []);
    this.session = authStorageRead(AUTH_SESSION_KEY, null);
    this.user = this.findUserById(this.session?.userId || "");
    this.googleScriptPromise = null;
    this.init();
  }

  init() {
    document.addEventListener("site:shell-ready", () => this.renderShell());
    document.addEventListener("DOMContentLoaded", () => {
      this.renderShell();
      this.initializeAuthPages();
      this.initializeProtectedPages();
    });
  }

  config() {
    return window.FORKS_FREEDOM_CONFIG || {};
  }

  hasGoogleAuth() {
    const clientId = String(this.config().googleClientId || "").trim();
    return Boolean(clientId && clientId !== "YOUR_GOOGLE_CLIENT_ID");
  }

  findUserById(userId) {
    return this.users.find((user) => user.id === userId) || null;
  }

  findUserByEmail(email) {
    return this.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase()) || null;
  }

  findUserByUsername(username) {
    return this.users.find((user) => user.username.toLowerCase() === String(username).toLowerCase()) || null;
  }

  saveUsers() {
    authStorageWrite(AUTH_USERS_KEY, this.users);
  }

  saveSession() {
    authStorageWrite(AUTH_SESSION_KEY, this.session);
  }

  publicUser(user = this.user) {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      bio: user.bio || "",
      picture: user.picture || authAvatar(user.name),
      provider: user.provider || "password",
      joinedAt: user.joinedAt
    };
  }

  isAuthenticated() {
    return Boolean(this.user);
  }

  getUser() {
    return this.publicUser();
  }

  currentRedirectTarget() {
    const search = window.location.search || "";
    const page = authPageName();
    return `${page}${search}`;
  }

  redirectTo(url) {
    window.location.assign(url);
  }

  requireAuth(options = {}) {
    const params = new URLSearchParams();
    params.set("next", options.next || this.currentRedirectTarget());
    if (options.message) {
      params.set("message", options.message);
    }
    this.redirectTo(`login.html?${params.toString()}`);
  }

  emitChange() {
    const detail = this.getUser();
    window.dispatchEvent(new CustomEvent("auth:changed", { detail }));
    if (detail) {
      window.dispatchEvent(new CustomEvent("userLoggedIn", { detail }));
    } else {
      window.dispatchEvent(new CustomEvent("userLoggedOut"));
    }
  }

  syncActiveUser() {
    this.user = this.findUserById(this.session?.userId || "");
    if (!this.user && this.session) {
      this.session = null;
      this.saveSession();
    }
  }

  registerUser({ name, email, username, password }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedUsername = String(username || "").trim().toLowerCase();

    if (!name || !normalizedEmail || !normalizedUsername || !password) {
      return { success: false, message: "Complete every required field." };
    }

    if (password.length < 8) {
      return { success: false, message: "Use at least 8 characters for your password." };
    }

    if (this.findUserByEmail(normalizedEmail)) {
      return { success: false, message: "That email is already registered." };
    }

    if (this.findUserByUsername(normalizedUsername)) {
      return { success: false, message: "That username is already taken." };
    }

    const user = {
      id: `user-${Date.now()}`,
      name: String(name).trim(),
      email: normalizedEmail,
      username: normalizedUsername,
      password,
      bio: "",
      picture: authAvatar(name),
      provider: "password",
      joinedAt: new Date().toISOString()
    };

    this.users = [user, ...this.users];
    this.saveUsers();
    this.session = { userId: user.id, lastLoginAt: new Date().toISOString() };
    this.saveSession();
    this.syncActiveUser();
    this.renderShell();
    this.emitChange();
    return { success: true, user: this.getUser() };
  }

  loginWithPassword(identifier, password) {
    const value = String(identifier || "").trim().toLowerCase();
    const user = this.users.find(
      (candidate) =>
        (candidate.email.toLowerCase() === value || candidate.username.toLowerCase() === value) &&
        candidate.password === password
    );

    if (!user) {
      return { success: false, message: "Incorrect email or password." };
    }

    this.session = { userId: user.id, lastLoginAt: new Date().toISOString() };
    this.saveSession();
    this.syncActiveUser();
    this.renderShell();
    this.emitChange();
    return { success: true, user: this.getUser() };
  }

  finishGoogleLogin(profile) {
    const email = String(profile.email || "").trim().toLowerCase();
    if (!email) {
      return { success: false, message: "Google did not return a valid email address." };
    }

    let user = this.findUserByEmail(email);
    if (!user) {
      user = {
        id: `google-${profile.sub || Date.now()}`,
        name: profile.name || profile.given_name || email.split("@")[0],
        email,
        username: email.split("@")[0].replace(/[^a-z0-9]+/gi, "").toLowerCase() || `reader${Date.now()}`,
        password: "",
        bio: "",
        picture: profile.picture || authAvatar(profile.name || email),
        provider: "google",
        joinedAt: new Date().toISOString()
      };
      this.users = [user, ...this.users];
      this.saveUsers();
    } else {
      user.picture = profile.picture || user.picture;
      user.name = profile.name || user.name;
      user.provider = "google";
      this.saveUsers();
    }

    this.session = { userId: user.id, lastLoginAt: new Date().toISOString() };
    this.saveSession();
    this.syncActiveUser();
    this.renderShell();
    this.emitChange();
    return { success: true, user: this.getUser() };
  }

  signOut() {
    this.session = null;
    this.user = null;
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    this.renderShell();
    this.emitChange();
    this.redirectTo("index.html");
  }

  updateProfile(fields) {
    if (!this.user) {
      return { success: false, message: "You need to be signed in to update your profile." };
    }

    const email = String(fields.email || "").trim().toLowerCase();
    const username = String(fields.username || "").trim().toLowerCase();

    if (!fields.name || !email || !username) {
      return { success: false, message: "Name, username, and email are required." };
    }

    const emailOwner = this.findUserByEmail(email);
    if (emailOwner && emailOwner.id !== this.user.id) {
      return { success: false, message: "Another account already uses that email." };
    }

    const usernameOwner = this.findUserByUsername(username);
    if (usernameOwner && usernameOwner.id !== this.user.id) {
      return { success: false, message: "Another account already uses that username." };
    }

    this.user.name = String(fields.name).trim();
    this.user.email = email;
    this.user.username = username;
    this.user.bio = String(fields.bio || "").trim();
    this.user.picture = this.user.picture || authAvatar(this.user.name);
    this.saveUsers();
    this.renderShell();
    this.emitChange();
    return { success: true, user: this.getUser() };
  }

  requestPasswordReset(email) {
    const user = this.findUserByEmail(email);
    if (!user) {
      return {
        success: true,
        message: "If that email is in the system, a reset link would be sent. For this demo, use the sign-up flow to create a new account."
      };
    }

    const history = authStorageRead(PASSWORD_RESET_LOG_KEY, []);
    history.unshift({
      email: user.email,
      requestedAt: new Date().toISOString()
    });
    authStorageWrite(PASSWORD_RESET_LOG_KEY, history.slice(0, 10));

    return {
      success: true,
      message: `Password reset requested for ${user.email}. In this portfolio demo, no email is sent, but the flow is wired and documented.`
    };
  }

  savedRecipesKey() {
    return this.user ? `forks-freedom-favorites:${this.user.id}` : "";
  }

  getSavedRecipes() {
    if (!this.user) {
      return [];
    }
    return authStorageRead(this.savedRecipesKey(), []);
  }

  isRecipeSaved(slug) {
    return this.getSavedRecipes().includes(slug);
  }

  toggleSavedRecipe(slug) {
    if (!this.user) {
      return { success: false, requiresAuth: true, message: "Sign in to save recipes to your account." };
    }

    const current = this.getSavedRecipes();
    const next = current.includes(slug) ? current.filter((item) => item !== slug) : [slug, ...current];
    authStorageWrite(this.savedRecipesKey(), next);
    document.dispatchEvent(new CustomEvent("favorites:updated"));
    return { success: true, saved: next.includes(slug) };
  }

  async loadGoogleIdentity() {
    if (!this.hasGoogleAuth()) {
      return null;
    }

    if (!this.googleScriptPromise) {
      this.googleScriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existing && window.google?.accounts?.id) {
          resolve(window.google);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.google);
        script.onerror = () => reject(new Error("Google Identity Services could not be loaded."));
        document.head.appendChild(script);
      });
    }

    return this.googleScriptPromise;
  }

  async renderGoogleButton(container) {
    if (!container) {
      return;
    }

    if (!this.hasGoogleAuth()) {
      container.innerHTML = `
        <div class="auth-provider-callout">
          <strong>Google sign-in is available.</strong>
          <p>Add your Google client ID in <code>javascript/config.js</code> to enable it in the browser.</p>
        </div>
      `;
      return;
    }

    try {
      await this.loadGoogleIdentity();
      if (!window.google?.accounts?.id) {
        throw new Error("Google Identity Services did not initialize.");
      }

      container.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: this.config().googleClientId,
        callback: (response) => this.handleGoogleCredential(response)
      });
      window.google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        width: Math.min(container.offsetWidth || 320, 360),
        text: "continue_with",
        shape: "pill"
      });
    } catch (error) {
      container.innerHTML = `
        <div class="auth-provider-callout auth-provider-callout--warning">
          <strong>Google sign-in is temporarily unavailable.</strong>
          <p>${escapeAttribute(error.message)}</p>
        </div>
      `;
    }
  }

  handleGoogleCredential(response) {
    try {
      const payload = JSON.parse(atob(response.credential.split(".")[1]));
      const result = this.finishGoogleLogin(payload);
      if (!result.success) {
        throw new Error(result.message);
      }
      this.finishAuthRedirect();
    } catch (error) {
      this.writePageMessage("login", error.message || "Google sign-in failed.", "error");
    }
  }

  finishAuthRedirect() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next) {
      this.redirectTo(next);
      return;
    }

    if (["login.html", "signup.html", "forgot-password.html"].includes(authPageName())) {
      this.redirectTo("account.html");
    }
  }

  renderShell() {
    const mount = document.querySelector("[data-auth-shell]");
    if (!mount) {
      return;
    }

    if (this.user) {
      const user = this.getUser();
      mount.innerHTML = `
        <div class="auth-shell auth-shell--signed-in">
          <a class="auth-chip" href="favorites.html">Saved</a>
          <details class="profile-menu">
            <summary class="profile-menu__summary">
              <img class="profile-menu__avatar" src="${user.picture}" alt="${escapeAttribute(user.name)}">
              <span>${escapeAttribute(user.name)}</span>
            </summary>
            <div class="profile-menu__panel">
              <p class="profile-menu__meta">${escapeAttribute(user.email)}</p>
              <a class="profile-menu__link" href="account.html">Account</a>
              <a class="profile-menu__link" href="dashboard.html">My Activity</a>
              <button class="profile-menu__button" type="button" data-auth-signout>Sign out</button>
            </div>
          </details>
        </div>
      `;

      mount.querySelector("[data-auth-signout]")?.addEventListener("click", () => this.signOut());
      return;
    }

    mount.innerHTML = `
      <div class="auth-shell">
        <a class="auth-chip" href="login.html">Log in</a>
        <a class="button-secondary auth-shell__signup" href="signup.html">Sign up</a>
      </div>
    `;
  }

  initializeProtectedPages() {
    document.querySelectorAll("[data-protected-page]").forEach((page) => {
      if (this.isAuthenticated()) {
        page.removeAttribute("data-auth-blocked");
        page.removeAttribute("data-protected-hidden");
        return;
      }

      const message = page.getAttribute("data-protected-message") || "Please sign in to view this page.";
      const title = page.getAttribute("data-protected-title") || "Sign in required";
      const cta = page.getAttribute("data-protected-cta") || "Log in";
      page.setAttribute("data-auth-blocked", "true");
      page.innerHTML = `
        <section class="page-hero">
          <article class="hero-copy">
            <span class="eyebrow">Account Access</span>
            <h1>${escapeAttribute(title)}</h1>
            <p>${escapeAttribute(message)}</p>
            <div class="button-row">
              <a class="button" href="login.html?next=${encodeURIComponent(this.currentRedirectTarget())}">${escapeAttribute(cta)}</a>
              <a class="button-secondary" href="signup.html?next=${encodeURIComponent(this.currentRedirectTarget())}">Create account</a>
            </div>
          </article>
        </section>
      `;
    });
  }

  writePageMessage(pageKey, message, tone = "info") {
    const node = document.querySelector(`[data-auth-message="${pageKey}"]`);
    if (!node) {
      return;
    }

    node.hidden = false;
    node.textContent = message;
    node.dataset.tone = tone;
  }

  fillAuthCopy() {
    const params = new URLSearchParams(window.location.search);
    const message = params.get("message");
    if (message) {
      ["login", "signup"].forEach((pageKey) => this.writePageMessage(pageKey, message, "info"));
    }
  }

  initializeAuthPages() {
    this.fillAuthCopy();

    const loginForm = document.querySelector("[data-login-form]");
    if (loginForm) {
      loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const result = this.loginWithPassword(formData.get("identifier"), formData.get("password"));
        if (!result.success) {
          this.writePageMessage("login", result.message, "error");
          return;
        }
        this.finishAuthRedirect();
      });

      this.renderGoogleButton(document.querySelector("[data-google-login-button]"));
    }

    const signupForm = document.querySelector("[data-signup-form]");
    if (signupForm) {
      signupForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(signupForm);
        if (formData.get("password") !== formData.get("confirmPassword")) {
          this.writePageMessage("signup", "Passwords do not match.", "error");
          return;
        }

        const result = this.registerUser({
          name: formData.get("name"),
          email: formData.get("email"),
          username: formData.get("username"),
          password: formData.get("password")
        });

        if (!result.success) {
          this.writePageMessage("signup", result.message, "error");
          return;
        }
        this.finishAuthRedirect();
      });

      this.renderGoogleButton(document.querySelector("[data-google-signup-button]"));
    }

    const forgotForm = document.querySelector("[data-forgot-password-form]");
    if (forgotForm) {
      forgotForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(forgotForm);
        const result = this.requestPasswordReset(formData.get("email"));
        this.writePageMessage("forgot-password", result.message, "info");
      });
    }

    const accountPage = document.querySelector("[data-account-page]");
    if (accountPage && this.isAuthenticated()) {
      const user = this.getUser();
      accountPage.querySelector("[data-account-name]")?.setAttribute("value", user.name);
      accountPage.querySelector("[data-account-email]")?.setAttribute("value", user.email);
      accountPage.querySelector("[data-account-username]")?.setAttribute("value", user.username);
      const bioField = accountPage.querySelector("[data-account-bio]");
      if (bioField) {
        bioField.value = user.bio || "";
      }
      const avatar = accountPage.querySelector("[data-account-avatar]");
      const provider = accountPage.querySelector("[data-account-provider]");
      const joined = accountPage.querySelector("[data-account-joined]");
      if (avatar) {
        avatar.setAttribute("src", user.picture);
        avatar.setAttribute("alt", `${user.name} avatar`);
      }
      if (provider) {
        provider.textContent = user.provider === "google" ? "Google Sign-In" : "Email and password";
      }
      if (joined) {
        joined.textContent = new Date(user.joinedAt).toLocaleDateString();
      }

      accountPage.querySelector("[data-account-form]")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const result = this.updateProfile({
          name: formData.get("name"),
          email: formData.get("email"),
          username: formData.get("username"),
          bio: formData.get("bio")
        });
        this.writePageMessage("account", result.message || "Profile updated.", result.success ? "success" : "error");
        if (result.success) {
          accountPage.querySelector("[data-account-avatar]")?.setAttribute("src", this.getUser().picture);
        }
      });

      accountPage.querySelector("[data-account-signout]")?.addEventListener("click", () => this.signOut());
    }
  }
}

window.authManager = new AuthManager();
