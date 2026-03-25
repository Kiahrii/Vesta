const AUTH_STORAGE_KEY = 'app-authenticated';

export const isAuthenticated = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
};

export const setAuthenticated = (value) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (value) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

