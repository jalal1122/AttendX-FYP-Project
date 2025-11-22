import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  login,
  selectAuthLoading,
  selectAuthError,
} from "../../features/auth/authSlice";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await dispatch(login(formData));

    if (login.fulfilled.match(result)) {
      const userRole = result.payload.user.role;

      // Redirect based on role
      switch (userRole) {
        case "admin":
          navigate("/admin/dashboard");
          break;
        case "teacher":
          navigate("/teacher/dashboard");
          break;
        case "student":
          navigate("/student/dashboard");
          break;
        default:
          navigate("/");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full mx-4">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">AttendX</h1>
          <p className="text-gray-600">Smart Attendance Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Welcome Back
          </h2>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full mt-2"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Use your credentials provided by the administrator</p>
          </div>
        </div>

        {/* Version */}
        <div className="text-center mt-4 text-sm text-gray-500">
          Version 1.0.0 | FYP 2025
        </div>
      </div>
    </div>
  );
};

export default Login;
