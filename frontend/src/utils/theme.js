const THEME_KEY = "senetry-theme";

export function getSavedTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.classList.toggle("dark", selectedTheme === "dark");
  document.documentElement.style.colorScheme = selectedTheme;
  try {
    window.localStorage.setItem(THEME_KEY, selectedTheme);
  } catch {
    // Theme still applies for this session if storage is unavailable.
  }
  return selectedTheme;
}

export function initializeTheme() {
  return applyTheme(getSavedTheme());
}