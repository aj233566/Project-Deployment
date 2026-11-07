const TOKEN = 'token';
const USER = 'user';
function readKey(key) {
  try {
    const own = window.sessionStorage.getItem(key);
    if (own !== null) return own;
    const seed = window.localStorage.getItem(key);
    if (seed !== null) {
      try { window.sessionStorage.setItem(key, seed); } catch { void 0; }
    }
    return seed;
  } catch {
    return null;
  }
}
export function getToken() {
  const token = readKey(TOKEN);
  return typeof token === 'string' && token.trim().length > 0 ? token : null;
}
export function getStoredUser() {
  try {
    const raw = readKey(USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    clearSession();
    return null;
  }
}
export function setSession(token, user) {
  const serialized = typeof user === 'string' ? user : JSON.stringify(user);
  try {
    window.sessionStorage.setItem(TOKEN, token);
    window.sessionStorage.setItem(USER, serialized);
    window.localStorage.setItem(TOKEN, token);
    window.localStorage.setItem(USER, serialized);
  } catch { void 0; }
}
export function hasActiveSession(storage) {
  if (storage) {
    const token = storage.getItem('token');
    return typeof token === 'string' && token.trim().length > 0;
  }
  return !!getToken();
}
export function clearSession(storage) {
  try {
    if (storage) {
      storage.removeItem('token');
      storage.removeItem('user');
      return;
    }
    window.sessionStorage.removeItem(TOKEN);
    window.sessionStorage.removeItem(USER);
    window.localStorage.removeItem(TOKEN);
    window.localStorage.removeItem(USER);
  } catch { void 0; }
}
export function isAuthRoute(pathname) {
  const path = typeof pathname === 'string'
    ? pathname
    : (typeof window !== 'undefined' ? window.location.pathname : '');
  return path === '/login'
    || path === '/login/citizen'
    || path === '/login/authority'
    || path === '/signup';
}
export function shouldRedirectToLogin(status, pathname) {
  return status === 401 && !isAuthRoute(pathname);
}
