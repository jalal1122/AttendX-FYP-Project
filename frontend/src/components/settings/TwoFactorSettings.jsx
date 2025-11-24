import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import authAPI from "../../services/authAPI";
import { updateUser } from "../../features/auth/authSlice";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";

const TwoFactorSettings = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      const response = await authAPI.enable2FA();
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);

      setMessage({
        type: "info",
        text: "Scan the QR code with Google Authenticator or any TOTP app",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to generate QR code",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndActivate = async (e) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: "error", text: "Please enter a valid 6-digit code" });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      await authAPI.verify2FA(verificationCode, secret);

      // Update Redux state immediately
      dispatch(updateUser({ isTwoFactorEnabled: true }));

      setMessage({
        type: "success",
        text: "2FA enabled successfully! You'll need your authenticator app to login.",
      });

      // Reset state
      setQrCode(null);
      setSecret("");
      setVerificationCode("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Invalid verification code",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();

    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: "error", text: "Please enter a valid 6-digit code" });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: "", text: "" });

      await authAPI.disable2FA(verificationCode);

      // Update Redux state immediately
      dispatch(updateUser({ isTwoFactorEnabled: false }));

      setMessage({
        type: "success",
        text: "2FA disabled successfully",
      });

      setShowDisable(false);
      setVerificationCode("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to disable 2FA",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Two-Factor Authentication (2FA)
      </h2>

      {message.text && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-success-50 text-success-700 border border-success-200"
              : message.type === "error"
              ? "bg-error-50 text-error-700 border border-error-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {user?.isTwoFactorEnabled ? (
        // 2FA is enabled
        <div>
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-6 h-6 text-success-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-success-700 font-semibold">
              2FA is enabled
            </span>
          </div>

          <p className="text-gray-600 mb-4">
            Your account is protected with Two-Factor Authentication. You'll
            need your authenticator app to login.
          </p>

          {!showDisable ? (
            <Button
              variant="error"
              onClick={() => setShowDisable(true)}
              disabled={loading}
            >
              Disable 2FA
            </Button>
          ) : (
            <form onSubmit={handleDisable2FA} className="space-y-4">
              <Input
                label="Enter Authenticator Code"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, ""))
                }
                required
              />
              <div className="flex gap-2">
                <Button type="submit" variant="error" disabled={loading}>
                  {loading ? "Disabling..." : "Confirm Disable"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowDisable(false);
                    setVerificationCode("");
                    setMessage({ type: "", text: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        // 2FA is not enabled
        <div>
          <p className="text-gray-600 mb-6">
            Add an extra layer of security to your account. You'll need to enter
            a code from your authenticator app (like Google Authenticator) each
            time you login.
          </p>

          {!qrCode ? (
            <Button onClick={handleEnable2FA} disabled={loading}>
              {loading ? "Generating..." : "Enable 2FA"}
            </Button>
          ) : (
            <div className="space-y-6">
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4">
                  Step 1: Scan QR Code
                </h3>
                <div className="flex justify-center mb-4">
                  <img src={qrCode} alt="2FA QR Code" className="w-64 h-64" />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Scan this QR code with Google Authenticator, Microsoft
                  Authenticator, or any TOTP app
                </p>
              </div>

              <form onSubmit={handleVerifyAndActivate} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">
                    Step 2: Enter Verification Code
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    After scanning, enter the 6-digit code from your
                    authenticator app
                  </p>
                  <Input
                    label="Verification Code"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, ""))
                    }
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Activate 2FA"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setQrCode(null);
                      setSecret("");
                      setVerificationCode("");
                      setMessage({ type: "", text: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default TwoFactorSettings;
