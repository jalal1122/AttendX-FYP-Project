import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectIsAuthenticated,
  selectCurrentUser,
} from "../features/auth/authSlice";

const PrivateRoute = ({ children, allowedRoles }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboard based on role
    switch (user.role) {
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
      case "teacher":
        return <Navigate to="/teacher/dashboard" replace />;
      case "student":
        return <Navigate to="/student/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
