import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { lazy, Suspense, useEffect } from "react";
import {
  selectIsAuthenticated,
  selectCurrentUser,
  selectCurrentToken,
  fetchCurrentUser,
} from "./features/auth/authSlice";
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/layout/Navbar";

// Public Pages
const LandingPage = lazy(() => import("./pages/LandingPage"));

// Auth Pages
const Login = lazy(() => import("./pages/auth/Login"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const RegisterAdmin = lazy(() => import("./pages/auth/RegisterAdmin"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const ManageClasses = lazy(() => import("./pages/admin/ManageClasses"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));

// Teacher Pages
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const LiveSession = lazy(() => import("./pages/teacher/LiveSession"));
const ClassDetails = lazy(() => import("./pages/teacher/ClassDetails"));
const SessionHistory = lazy(() => import("./pages/teacher/SessionHistory"));
const TeacherReports = lazy(() => import("./pages/teacher/TeacherReports"));

// Student Pages
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const ScanAttendance = lazy(() => import("./pages/student/ScanAttendance"));
const MyAttendance = lazy(() => import("./pages/student/MyAttendance"));

// Common Pages
const Reports = lazy(() => import("./pages/common/Reports"));
const Profile = lazy(() => import("./pages/common/Profile"));

// Layout wrapper component
function Layout({ children }) {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Don't show navbar on public pages (landing, login, forgot-password)
  const publicPaths = ["/", "/login", "/forgot-password", "/create-admin"];
  const showNavbar = isAuthenticated && !publicPaths.includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
        {children}
      </Suspense>
    </>
  );
}

function App() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);

  // Auto-fetch user if token exists but user is missing
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser());
    }
  }, [token, user, dispatch]);

  // Redirect authenticated users from root to their dashboard
  const getDefaultRedirect = () => {
    if (!isAuthenticated) return "/";

    switch (user?.role) {
      case "admin":
        return "/admin/dashboard";
      case "teacher":
        return "/teacher/dashboard";
      case "student":
        return "/student/dashboard";
      default:
        return "/";
    }
  };

  return (
    <Router>
      <Layout>
        <Routes>
          {/* Landing Page (public) */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Secret Admin Bootstrap Route (NOT in navbar/sidebar) */}
          <Route path="/create-admin" element={<RegisterAdmin />} />

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
          <Route
            path="/teacher/reports"
            element={
              <PrivateRoute allowedRoles={["teacher", "admin"]}>
                <TeacherReports />
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
          <Route
            path="/profile"
            element={
              <PrivateRoute allowedRoles={["student", "teacher", "admin"]}>
                <Profile />
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
          <Route
            path="/student/attendance"
            element={
              <PrivateRoute allowedRoles={["student"]}>
                <MyAttendance />
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
