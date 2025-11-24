import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Card from "../../components/ui/Card";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Email is required");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/forgot-password", { email });

      setMessage(
        "OTP sent to your email! Check your inbox (or console in dev mode)."
      );
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validation
    if (!otp || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/reset-password", {
        email,
        otp,
        newPassword,
      });

      setMessage("Password reset successful! Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">AttendX</h1>
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 1 ? "Forgot Password" : "Reset Password"}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {step === 1
              ? "Enter your email to receive a reset code"
              : "Enter the OTP and your new password"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg text-sm">
            {message}
          </div>
        )}

        {step === 1 ? (
          // Step 1: Enter Email
          <form onSubmit={handleSendOTP} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Back to Login
              </Link>
            </div>
          </form>
        ) : (
          // Step 2: Enter OTP and New Password
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700">
                <strong>Email:</strong> {email}
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError("");
                  setMessage("");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                Change email
              </button>
            </div>

            <Input
              label="OTP Code"
              type="text"
              placeholder="Enter 6-digit code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={loading}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium block w-full"
              >
                Resend OTP
              </button>
              <Link
                to="/login"
                className="text-sm text-gray-600 hover:text-gray-800 font-medium block"
              >
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
