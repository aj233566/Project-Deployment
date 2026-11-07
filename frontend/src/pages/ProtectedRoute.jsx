import { Navigate, useLocation } from "react-router-dom";
import { getToken, getStoredUser } from "../context/session";
import { getLoginPath } from "../utils/loginRouting";
function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const token = getToken();
  const user = getStoredUser();
  if (!token || !user) {
    return <Navigate to={getLoginPath(location.pathname)} replace state={{ from: location.pathname }} />;
  }
  if (user.role === "authority" && user.authorityStatus !== "verified") {
    return <Navigate to={getLoginPath(location.pathname)} replace />;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === "authority" && user.authorityStatus === "verified") {
      return <Navigate to="/dashboard/authority" replace />;
    }
    return <Navigate to="/dashboard/citizen" replace />;
  }
  return children;
}
export default ProtectedRoute;
