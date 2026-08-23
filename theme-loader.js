(function loadActiveTheme() {
  const config = window.AINuggetsThemeConfig;

  if (!config || !config.activeTheme || !config.themes) {
    throw new Error("Theme configuration is missing or invalid.");
  }

  const theme = config.themes[config.activeTheme];
  if (!theme || !theme.stylesheet) {
    throw new Error(`Theme "${config.activeTheme}" is not registered.`);
  }

  const savedColorMode = localStorage.getItem("ai-nuggets-color-mode");
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
