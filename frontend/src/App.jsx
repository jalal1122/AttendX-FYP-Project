import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectIsAuthenticated,
  selectCurrentUser,
} from "./features/auth/authSlice";
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/layout/Navbar";

// Auth Pages
import Login from "./pages/auth/Login";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageClasses from "./pages/admin/ManageClasses";
import AdminReports from "./pages/admin/AdminReports";

// Teacher Pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import LiveSession from "./pages/teacher/LiveSession";
import ClassDetails from "./pages/teacher/ClassDetails";
import SessionHistory from "./pages/teacher/SessionHistory";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import ScanAttendance from "./pages/student/ScanAttendance";

// Common Pages
import Reports from "./pages/common/Reports";

// Layout wrapper component
function Layout({ children }) {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Don't show navbar on login page
  const showNavbar = isAuthenticated && location.pathname !== "/login";

  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
}

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
      <Layout>
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
          <Route
            path="/admin/users"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <ManageUsers />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <ManageClasses />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <AdminReports />
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
          <Route
            path="/teacher/class/:classId"
            element={
              <PrivateRoute allowedRoles={["teacher", "admin"]}>
                <ClassDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/session/:sessionId/edit"
            element={
              <PrivateRoute allowedRoles={["teacher", "admin"]}>
                <SessionHistory />
              </PrivateRoute>
            }
          />

          {/* Common Routes */}
          <Route
            path="/reports/:classId"
            element={
              <PrivateRoute allowedRoles={["teacher", "admin"]}>
                <Reports />
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
      </Layout>
    </Router>
  );
}

export default App;
