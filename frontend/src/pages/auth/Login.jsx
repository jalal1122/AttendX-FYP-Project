import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  login,
  selectAuthLoading,
  selectAuthError,
} from "../../features/auth/authSlice";
import authAPI from "../../services/authAPI";
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
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState("");

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
      // Check if 2FA is required
      if (result.payload.require2FA) {
        setRequire2FA(true);
        setTempToken(result.payload.tempToken);
        return;
      }

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

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setTwoFAError("");

    if (!otpCode || otpCode.length !== 6) {
      setTwoFAError("Please enter a valid 6-digit code");
      return;
    }

    try {
      setTwoFALoading(true);
      const response = await authAPI.validate2FALogin(tempToken, otpCode);

      // Store tokens and user data manually
      localStorage.setItem("accessToken", response.data.accessToken);

      const userRole = response.data.user.role;

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

      // Reload to update Redux state
      window.location.reload();
    } catch (error) {
      setTwoFAError(
        error.response?.data?.message || "Invalid verification code"
      );
    } finally {
      setTwoFALoading(false);
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
          {(error || twoFAError) && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg">
              {twoFAError || error}
            </div>
          )}

          {!require2FA ? (
            /* Login Form */
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

              <div className="text-right mb-4">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full mt-2"
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          ) : (
            /* 2FA Verification Form */
            <form onSubmit={handle2FASubmit}>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <span className="font-semibold text-blue-900">
                    Two-Factor Authentication
                  </span>
                </div>
                <p className="text-sm text-blue-700">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <Input
                label="Verification Code"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-widest"
                required
              />

              <div className="flex gap-2 mt-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={twoFALoading}
                  className="flex-1"
                >
                  {twoFALoading ? "Verifying..." : "Verify"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setRequire2FA(false);
                    setOtpCode("");
                    setTwoFAError("");
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
              </div>
            </form>
          )}

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
