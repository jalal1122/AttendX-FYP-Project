import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectIsAuthenticated,
  selectCurrentUser,
} from "./features/auth/authSlice";
import PrivateRoute from "./components/PrivateRoute";

// Auth Pages
import Login from "./pages/auth/Login";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";

// Teacher Pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import LiveSession from "./pages/teacher/LiveSession";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import ScanAttendance from "./pages/student/ScanAttendance";

function App() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);

  // Redirect authenticated users from root to their dashboard
  const getDefaultRedirect = () => {
    if (!isAuthenticated) return "/login";

    switch (user?.role) {
      case "admin":
        return "/admin/dashboard";
      case "teacher":
        return "/teacher/dashboard";
      case "student":
        return "/student/dashboard";
      default:
        return "/login";
    }
  };

  return (
    <Router>
      <Routes>
        {/* Root redirect */}
        <Route
          path="/"
          element={<Navigate to={getDefaultRedirect()} replace />}
        />

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        {/* Teacher Routes */}
        <Route
          path="/teacher/dashboard"
          element={
            <PrivateRoute allowedRoles={["teacher", "admin"]}>
              <TeacherDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/teacher/session/:classId"
          element={
            <PrivateRoute allowedRoles={["teacher", "admin"]}>
              <LiveSession />
            </PrivateRoute>
          }
        />

        {/* Student Routes */}
        <Route
          path="/student/dashboard"
          element={
            <PrivateRoute allowedRoles={["student"]}>
              <StudentDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/student/scan"
          element={
            <PrivateRoute allowedRoles={["student"]}>
              <ScanAttendance />
            </PrivateRoute>
          }
        />

        {/* 404 Not Found */}
        <Route
          path="*"
          element={<Navigate to={getDefaultRedirect()} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
