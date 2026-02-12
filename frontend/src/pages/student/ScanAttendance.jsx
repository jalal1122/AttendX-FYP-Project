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
  const [deviceId, setDeviceId] = useState(null);

  const html5QrCodeRef = useRef(null);
  const scannerRef = useRef(null);

  // Device fingerprinting on mount
  useEffect(() => {
    const initDeviceId = () => {
      try {
        let uuid = localStorage.getItem("device_uuid");

        if (!uuid) {
          // Generate new UUID for this device
          uuid = crypto.randomUUID();
          localStorage.setItem("device_uuid", uuid);
          console.log("🔐 Generated new device UUID:", uuid);
        } else {
          console.log("🔐 Retrieved existing device UUID:", uuid);
        }

        setDeviceId(uuid);
      } catch (error) {
        console.error("Device fingerprinting error:", error);
        // Fallback: generate simple UUID
        const fallbackId =
          "device_" +
          Date.now() +
          "_" +
          Math.random().toString(36).substr(2, 9);
        setDeviceId(fallbackId);
        localStorage.setItem("device_uuid", fallbackId);
      }
    };

    initDeviceId();
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup: Stop scanner on unmount
      if (html5QrCodeRef.current) {
        const scanner = html5QrCodeRef.current;
        if (scanner.getState && scanner.getState() === 2) {
          // State 2 means scanner is running
          scanner
            .stop()
            .then(() => scanner.clear())
            .catch((err) => console.log("Cleanup error:", err));
        }
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setMessage({ type: "", text: "" });
      setIsScanning(true); // Set this first to render the qr-reader div

      // Wait for DOM to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      // Responsive QR box size
      const screenWidth = window.innerWidth;
      const qrBoxSize = screenWidth < 640 ? Math.min(250, screenWidth - 80) : 250;

      const config = {
        fps: 10,
        qrbox: { width: qrBoxSize, height: qrBoxSize },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera on mobile
        config,
        onScanSuccess,
        onScanError
      );

      setMessage({
        type: "info",
        text: "Scanner active. Point camera at QR code.",
      });
    } catch (err) {
      console.error("Failed to start scanner:", err);
      setIsScanning(false); // Reset scanning state on error
      html5QrCodeRef.current = null; // Clear the reference

      let errorMessage = "Failed to access camera. ";
      const errMsg = err?.message || "";
      const errName = err?.name || "";

      if (
        errName === "NotAllowedError" ||
        errMsg.includes("Permission denied")
      ) {
        errorMessage +=
          "Please click the camera icon in your browser's address bar and allow camera access, then try again.";
      } else if (errName === "NotFoundError") {
        errorMessage += "No camera found on your device.";
      } else {
        errorMessage += "Please check your camera permissions and try again.";
      }

      setMessage({
        type: "error",
        text: errorMessage,
      });
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        const scanner = html5QrCodeRef.current;
        if (scanner.getState && scanner.getState() === 2) {
          // Only stop if scanner is actually running (state 2)
          await scanner.stop();
          scanner.clear();
        }
        setIsScanning(false);
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
        setIsScanning(false);
        html5QrCodeRef.current = null;
      }
    } else {
      setIsScanning(false);
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

  const onScanError = () => {
    // Ignore scan errors (happens continuously while scanning)
  };

  const markAttendance = async (token) => {
    setProcessing(true);
    setMessage({ type: "info", text: "Marking attendance..." });

    // Get student's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log("📍 Student location captured:", { latitude, longitude });

          try {
            const response = await attendanceAPI.markAttendance(
              token,
              latitude,
              longitude,
              deviceId
            );

            // Check if manual approval is required
            const attendance = response.attendance || response.data || response;
            const requiresApproval =
              response.requiresApproval || attendance.status === "Pending";

            if (requiresApproval) {
              // Pending status - awaiting teacher approval
              setMessage({
                type: "warning",
                text: `⏳ Attendance marked! Waiting for teacher approval...`,
              });
            } else {
              // Success!
              const studentName =
                attendance.studentId?.name || "Student";
              setMessage({
                type: "success",
                text: `✓ Attendance marked successfully! Welcome, ${studentName}!`,
              });
            }

            // Stop scanner
            await stopScanning();

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              navigate("/student/dashboard");
            }, 2000);
          } catch (error) {
            handleAttendanceError(error);
          } finally {
            setProcessing(false);
          }
        },
        async (error) => {
          console.warn("Location access denied:", error);
          setMessage({
            type: "error",
            text: "Location access is required to mark attendance. Please enable location permissions.",
          });
          setProcessing(false);

          // Resume scanning
          setTimeout(() => {
            if (html5QrCodeRef.current && isScanning) {
              html5QrCodeRef.current.resume();
              setMessage({
                type: "info",
                text: "Scanner active. Enable location to try again.",
              });
            }
          }, 3000);
        }
      );
    } else {
      // Browser doesn't support geolocation - try without location
      try {
        const response = await attendanceAPI.markAttendance(
          token,
          null,
          null,
          deviceId
        );

        // Check if manual approval is required
        const attendance = response.attendance || response.data || response;
        const requiresApproval =
          response.requiresApproval || attendance.status === "Pending";

        if (requiresApproval) {
          // Pending status - awaiting teacher approval
          setMessage({
            type: "warning",
            text: `⏳ Attendance marked! Waiting for teacher approval...`,
          });
        } else {
          // Success!
          const studentName =
            attendance.studentId?.name || "Student";
          setMessage({
            type: "success",
            text: `✓ Attendance marked successfully! Welcome, ${studentName}!`,
          });
        }

        // Stop scanner
        await stopScanning();

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate("/student/dashboard");
        }, 2000);
      } catch (error) {
        handleAttendanceError(error);
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleAttendanceError = (error) => {
    console.error("Attendance marking error:", error);

    const errorMessage =
      error.response?.data?.message ||
      "Failed to mark attendance. Invalid or expired token.";
    
    const errorCode = error.response?.data?.errorCode;

    // Enhanced error handling with icons and specific guidance
    let icon = "✗";
    let guidance = "";
    let resumeDelay = 2000;

    switch (errorCode) {
      case "GEOFENCE_OUTSIDE":
        icon = "📍";
        guidance = " Move closer to the classroom and try again.";
        resumeDelay = 3000;
        break;
      case "DEVICE_LOCK_VIOLATION":
        icon = "🔒";
        guidance = " Contact admin to reset your device binding.";
        resumeDelay = 5000;
        break;
      case "IP_MISMATCH":
        icon = "🌐";
        guidance = " Ensure you're on the same network as your teacher.";
        resumeDelay = 3000;
        break;
      case "QR_EXPIRED":
        icon = "⏱️";
        guidance = " Ask teacher to refresh the QR code.";
        resumeDelay = 2000;
        break;
      case "QR_INVALID":
        icon = "❌";
        guidance = " Scan a valid QR code from your teacher.";
        resumeDelay = 2000;
        break;
      default:
        // Check legacy string-based detection
        if (
          errorMessage.includes("Security Alert") ||
          errorMessage.includes("device has already") ||
          errorMessage.includes("device lock") ||
          errorMessage.includes("bound to a different device")
        ) {
          icon = "🔒";
          guidance = " Contact admin to reset your device.";
          resumeDelay = 5000;
        } else if (errorMessage.includes("too far")) {
          icon = "📍";
          guidance = " Move closer to the classroom.";
          resumeDelay = 3000;
        } else if (errorMessage.includes("expired")) {
          icon = "⏱️";
          guidance = " Ask teacher to refresh QR code.";
          resumeDelay = 2000;
        }
    }

    setMessage({
      type: "error",
      text: `${icon} ${errorMessage}${guidance}`,
    });

    setProcessing(false);

    // Resume scanning after appropriate delay
    setTimeout(
      () => {
        if (html5QrCodeRef.current && isScanning) {
          html5QrCodeRef.current.resume();
          setMessage({ type: "info", text: "Scanner active. Try again." });
        }
      },
      resumeDelay
    );
  };

  const handleDevSubmit = async (e) => {
    e.preventDefault();
    if (!devToken.trim()) return;

    await markAttendance(devToken.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Scan Attendance
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Scan the QR code displayed by your teacher
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate("/student/dashboard")}
              className="w-full sm:w-auto mobile-btn"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto mobile-container">
        {/* Message Banner */}
        {message.text && (
          <div
            className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border text-sm sm:text-base ${
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
        <div className="mobile-card mb-4 sm:mb-6">
          <div className="text-center">
            {!isScanning ? (
              <div className="py-8 sm:py-12">
                <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-sky-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 sm:w-10 sm:h-10 text-sky-600"
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Ready to Scan
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-6 px-4">
                  Click the button below to activate your camera
                </p>
                <Button
                  variant="primary"
                  onClick={startScanning}
                  className="w-full sm:w-auto px-8 py-3 text-base mobile-btn"
                >
                  📷 Start Camera
                </Button>
              </div>
            ) : (
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 px-2">
                  Point your camera at the QR code
                </h2>

                {/* QR Reader Container */}
                <div
                  id="qr-reader"
                  className="mx-auto w-full max-w-md rounded-lg overflow-hidden shadow-lg"
                  ref={scannerRef}
                ></div>

                <div className="mt-6 px-4">
                  <Button
                    variant="danger"
                    onClick={stopScanning}
                    disabled={processing}
                    className="w-full sm:w-auto mobile-btn"
                  >
                    ⏹️ Stop Scanner
                  </Button>
                  {processing && (
                    <p className="text-sm text-gray-500 mt-2">Processing...</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Developer Mode */}
        <div className="mobile-card bg-gray-50 border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              🔧 Developer Testing Mode
            </h3>
            <button
              onClick={() => setDevMode(!devMode)}
              className="text-sm text-sky-600 hover:text-sky-700 font-medium mobile-btn"
            >
              {devMode ? "Hide" : "Show"}
            </button>
          </div>

          {devMode && (
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                For testing: Copy the token from the teacher's screen console
                and paste it here.
              </p>
              <form onSubmit={handleDevSubmit} className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Paste QR token here..."
                  value={devToken}
                  onChange={(e) => setDevToken(e.target.value)}
                  className="flex-1 mobile-input"
                />
                <Button
                  type="submit"
                  variant="success"
                  disabled={processing || !devToken.trim()}
                  className="w-full sm:w-auto mobile-btn"
                >
                  Submit Token
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mobile-card mt-4 sm:mt-6 bg-blue-50 border-blue-200">
          <h3 className="text-blue-900 font-semibold mb-3 text-base sm:text-lg">📱 Scanning Tips</h3>
          <ul className="space-y-2 text-xs sm:text-sm text-blue-800">
            <li>• Make sure you have good lighting</li>
            <li>• Hold your device steady and keep the QR code centered</li>
            <li>• The QR code refreshes every 20 seconds - be quick!</li>
            <li>
              • If scanning fails, check your camera permissions in browser
              settings
            </li>
            <li>• For best results, use your phone's back camera</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScanAttendance;
