import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser, selectCurrentUser } from "../../features/auth/authSlice";
import Button from "../ui/Button";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);

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
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate(getDashboardLink())}
              className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors"
            >
              Attend<span className="text-black">X</span>
            </button>

            {/* Navigation Links */}
            {user && (
              <div className="hidden md:flex items-center gap-4">
                <button
                  onClick={() => navigate(getDashboardLink())}
                  className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Dashboard
                </button>

                {user.role === "student" && (
                  <button
                    onClick={() => navigate("/student/attendance")}
                    className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    My Attendance
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="hidden sm:flex items-center gap-3">
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

                {/* Mobile view - just show name and role */}
                <div className="flex sm:hidden items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {user.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                </div>

                {/* Profile Button */}
                <Button
                  variant="secondary"
                  onClick={() => navigate("/profile")}
                  className="text-sm"
                >
                  <svg
                    className="w-4 h-4 inline-block mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
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
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
