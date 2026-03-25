const THEME_STORAGE_KEY = 'app-theme';
const LIGHT_THEME = 'light';
const DARK_THEME = 'dark';

const isValidTheme = (theme) => theme === LIGHT_THEME || theme === DARK_THEME;

export const getStoredTheme = () => {
  if (typeof window === 'undefined') {
    return LIGHT_THEME;
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isValidTheme(savedTheme) ? savedTheme : LIGHT_THEME;
};

export const applyTheme = (theme) => {
  const safeTheme = isValidTheme(theme) ? theme : LIGHT_THEME;

  if (typeof document !== 'undefined') {
    const htmlElement = document.documentElement;
    htmlElement.setAttribute('data-bs-theme', safeTheme);
    htmlElement.setAttribute('data-pc-theme', safeTheme);
    htmlElement.style.colorScheme = safeTheme;

    if (document.body) {
      document.body.classList.toggle('dark-mode', safeTheme === DARK_THEME);
      document.body.classList.toggle('light-mode', safeTheme === LIGHT_THEME);
    }
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
  }
};

export const initializeTheme = () => {
  applyTheme(getStoredTheme());
};

