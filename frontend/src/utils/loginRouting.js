const CITIZEN_LOGIN_PATH = "/login/citizen";
const AUTHORITY_LOGIN_PATH = "/login/authority";
export function getLoginPath(pathname = "", user = null) {
  if (user?.role === "citizen") return CITIZEN_LOGIN_PATH;
  if (user?.role === "authority") return AUTHORITY_LOGIN_PATH;
  if (user?.role === "admin") return "/login";
  if (
    pathname.startsWith("/dashboard/citizen") ||
    pathname.startsWith("/citizen/")
  ) {
    return CITIZEN_LOGIN_PATH;
  }
  if (
    pathname.startsWith("/dashboard/authority") ||
    pathname.startsWith("/incidents") ||
    pathname.startsWith("/operations-overview") ||
    pathname.startsWith("/alerts") ||
    pathname.startsWith("/emergency") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/resources")
  ) {
    return AUTHORITY_LOGIN_PATH;
  }
  return "/login";
}
export function getExpectedLoginRole(pathname = "") {
  const loginPath = getLoginPath(pathname);
  if (loginPath === CITIZEN_LOGIN_PATH) return "citizen";
  if (loginPath === AUTHORITY_LOGIN_PATH) return "authority";
  return null;
}
