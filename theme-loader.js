(function loadActiveTheme() {
  const config = window.ThemeConfig;

  if (!config || !config.activeTheme || !config.themes) {
    throw new Error("Theme configuration is missing or invalid.");
  }

  const theme = config.themes[config.activeTheme];
  if (!theme || !theme.stylesheet) {
    throw new Error(`Theme "${config.activeTheme}" is not registered.`);
  }

  const storageNamespace = window.ProductConfig?.identity?.storageNamespace;
  if (typeof storageNamespace !== "string" || !storageNamespace.trim()) {
    throw new Error("Product storage namespace is missing or invalid.");
  }
  const savedColorMode = localStorage.getItem(`${storageNamespace}-color-mode`);
  const systemColorMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const configuredColorMode = config.defaultColorMode === "dark" ? "dark" : config.defaultColorMode === "light" ? "light" : systemColorMode;

  document.documentElement.dataset.theme = config.activeTheme;
  document.documentElement.dataset.colorMode = savedColorMode === "dark" || savedColorMode === "light" ? savedColorMode : configuredColorMode;
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = theme.stylesheet;
  stylesheet.dataset.themeStylesheet = config.activeTheme;
  document.head.appendChild(stylesheet);
})();
