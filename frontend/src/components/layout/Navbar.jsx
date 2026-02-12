import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser, selectCurrentUser } from "../../features/auth/authSlice";
import { Menu, X, Home, FileText, User as UserIcon, LogOut } from "lucide-react";
import Button from "../ui/Button";
import NotificationCenter from "./NotificationCenter";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Navigate to login even if API call fails
      navigate("/login");
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "teacher":
        return "bg-blue-100 text-blue-800";
      case "student":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDashboardLink = () => {
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
    <nav className="bg-white shadow-sm border-b-2 border-sky-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(getDashboardLink())}
              className="text-xl sm:text-2xl font-bold text-sky-500 hover:text-sky-600 transition-colors"
            >
              Attend<span className="text-slate-900">X</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => navigate(getDashboardLink())}
                className="text-sm font-medium text-gray-700 hover:text-sky-600 transition-colors"
              >
                Dashboard
              </button>

              {user.role === "student" && (
                <button
                  onClick={() => navigate("/student/attendance")}
                  className="text-sm font-medium text-gray-700 hover:text-sky-600 transition-colors"
                >
                  My Attendance
                </button>
              )}
            </div>
          )}

          {/* Desktop User Info & Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <>
                {/* Notification Bell */}
                <NotificationCenter />

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => navigate("/profile")}
                  className="text-sm"
                >
                  <UserIcon className="w-4 h-4 inline-block mr-1" />
                  Profile
                </Button>

                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="text-sm"
                >
                  Logout
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button & Notification */}
          {user && (
            <div className="flex md:hidden items-center gap-2">
              <NotificationCenter />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-700 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {user && isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white">
          <div className="px-4 py-3 space-y-3">
            {/* User Info */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <span
                className={`px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(
                  user.role
                )}`}
              >
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>

            {/* Navigation Links */}
            <button
              onClick={() => {
                navigate(getDashboardLink());
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-gray-700 hover:bg-sky-50 hover:text-sky-600 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>

            {user.role === "student" && (
              <button
                onClick={() => {
                  navigate("/student/attendance");
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-gray-700 hover:bg-sky-50 hover:text-sky-600 rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">My Attendance</span>
              </button>
            )}

            <button
              onClick={() => {
                navigate("/profile");
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-gray-700 hover:bg-sky-50 hover:text-sky-600 rounded-lg transition-colors"
            >
              <UserIcon className="w-5 h-5" />
              <span className="font-medium">Profile</span>
            </button>

            <button
              onClick={() => {
                handleLogout();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
