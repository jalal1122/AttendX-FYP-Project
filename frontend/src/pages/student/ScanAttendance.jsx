import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import attendanceAPI from "../../services/attendanceAPI";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";

const ScanAttendance = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [devMode, setDevMode] = useState(false);
  const [devToken, setDevToken] = useState("");
  const [processing, setProcessing] = useState(false);

  const html5QrCodeRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup: Stop scanner on unmount
      if (html5QrCodeRef.current && isScanning) {
        html5QrCodeRef.current
          .stop()
          .then(() => {
            html5QrCodeRef.current?.clear();
          })
          .catch((err) => console.error("Error stopping scanner:", err));
      }
    };
  }, [isScanning]);

  const startScanning = async () => {
    try {
      setMessage({ type: "", text: "" });

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera on mobile
        config,
        onScanSuccess,
        onScanError
      );

      setIsScanning(true);
      setMessage({
        type: "info",
        text: "Scanner active. Point camera at QR code.",
      });
    } catch (err) {
      console.error("Failed to start scanner:", err);
      setMessage({
        type: "error",
        text: "Failed to access camera. Please allow camera permissions and try again.",
      });
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const onScanSuccess = async (decodedText) => {
    console.log("QR Scanned:", decodedText);

    // Pause scanning immediately
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.pause(true);
    }

    // Mark attendance
    await markAttendance(decodedText);
  };

  const onScanError = (error) => {
    // Ignore scan errors (happens continuously while scanning)
    // console.warn('Scan error:', error);
  };

  const markAttendance = async (token) => {
    try {
      setProcessing(true);
      setMessage({ type: "info", text: "Marking attendance..." });

      const response = await attendanceAPI.markAttendance(token);

      // Success!
      setMessage({
        type: "success",
        text: `✓ Attendance marked successfully! Welcome, ${
          response.data.studentId?.name || "Student"
        }!`,
      });

      // Stop scanner
      await stopScanning();

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/student/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Attendance marking error:", error);

      const errorMessage =
        error.response?.data?.message ||
        "Failed to mark attendance. Invalid or expired token.";

      setMessage({
        type: "error",
        text: `✗ ${errorMessage}`,
      });

      setProcessing(false);

      // Resume scanning after 2 seconds
      setTimeout(() => {
        if (html5QrCodeRef.current && isScanning) {
          html5QrCodeRef.current.resume();
          setMessage({ type: "info", text: "Scanner active. Try again." });
        }
      }, 2000);
    }
  };

  const handleDevSubmit = async (e) => {
    e.preventDefault();
    if (!devToken.trim()) return;

    await markAttendance(devToken.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Scan Attendance
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Scan the QR code displayed by your teacher
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate("/student/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Banner */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-success-50 border-success-200 text-success-700"
                : message.type === "error"
                ? "bg-error-50 border-error-200 text-error-700"
                : "bg-blue-50 border-blue-200 text-blue-700"
            }`}
          >
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* QR Scanner */}
        <Card className="mb-6">
          <div className="text-center">
            {!isScanning ? (
              <div className="py-12">
                <div className="mx-auto w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-10 h-10 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Ready to Scan
                </h2>
                <p className="text-gray-600 mb-6">
                  Click the button below to activate your camera
                </p>
                <Button
                  variant="primary"
                  onClick={startScanning}
                  className="px-8 py-3"
                >
                  Start Camera
                </Button>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Point your camera at the QR code
                </h2>

                {/* QR Reader Container */}
                <div
                  id="qr-reader"
                  className="mx-auto max-w-md rounded-lg overflow-hidden shadow-lg"
                  ref={scannerRef}
                ></div>

                <div className="mt-6">
                  <Button
                    variant="error"
                    onClick={stopScanning}
                    disabled={processing}
                  >
                    Stop Scanner
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Developer Mode */}
        <Card className="bg-gray-50 border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🔧 Developer Testing Mode
            </h3>
            <button
              onClick={() => setDevMode(!devMode)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {devMode ? "Hide" : "Show"}
            </button>
          </div>

          {devMode && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                For testing: Copy the token from the teacher's screen console
                and paste it here.
              </p>
              <form onSubmit={handleDevSubmit} className="flex gap-3">
                <Input
                  placeholder="Paste QR token here..."
                  value={devToken}
                  onChange={(e) => setDevToken(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  variant="success"
                  disabled={processing || !devToken.trim()}
                >
                  Submit Token
                </Button>
              </form>
            </div>
          )}
        </Card>

        {/* Instructions */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <h3 className="text-blue-900 font-semibold mb-3">📱 Scanning Tips</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Make sure you have good lighting</li>
            <li>• Hold your device steady and keep the QR code centered</li>
            <li>• The QR code refreshes every 20 seconds - be quick!</li>
            <li>
              • If scanning fails, check your camera permissions in browser
              settings
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default ScanAttendance;
