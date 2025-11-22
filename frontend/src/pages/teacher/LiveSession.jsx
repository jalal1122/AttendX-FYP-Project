import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import classAPI from "../../services/classAPI";
import sessionAPI from "../../services/sessionAPI";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

const LiveSession = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [classData, setClassData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [qrToken, setQrToken] = useState("");
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const qrIntervalRef = useRef(null);
  const countIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Fetch class details on mount
  useEffect(() => {
    fetchClassDetails();
    return () => {
      // Cleanup intervals on unmount
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [classId]);

  const fetchClassDetails = async () => {
    try {
      const response = await classAPI.getClassDetails(classId);
      setClassData(response.data);
      setTotalStudents(response.data.students?.length || 0);
      setLoading(false);
    } catch (error) {
      setError("Failed to load class details");
      setLoading(false);
    }
  };

  const startSession = async () => {
    try {
      setError("");
      setLoading(true);

      // Start the session
      const response = await sessionAPI.startSession(classId);
      setSessionId(response.data._id);
      setIsActive(true);

      // Get first QR token immediately
      await fetchNewQRToken(response.data._id);

      // Start QR rotation (every 20 seconds)
      qrIntervalRef.current = setInterval(() => {
        fetchNewQRToken(response.data._id);
      }, 20000);

      // Start attendance count updates (every 5 seconds)
      countIntervalRef.current = setInterval(() => {
        fetchAttendanceCount(response.data._id);
      }, 5000);

      // Start countdown timer (every second)
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) return 20; // Reset to 20
          return prev - 1;
        });
      }, 1000);

      setLoading(false);
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to start session";

      // If there's already an active session, show helpful error
      if (error.response?.status === 409) {
        setError(
          "⚠️ This class already has an active session. Please end the previous session first or wait for it to expire."
        );
      } else {
        setError(errorMsg);
      }

      setLoading(false);
    }
  };

  const fetchNewQRToken = async (sId) => {
    try {
      const response = await sessionAPI.getQRToken(sId || sessionId);
      setQrToken(response.data.token);
      setTimeRemaining(20); // Reset timer

      // Log token for dev testing
      console.log("🔑 NEW QR TOKEN:", response.data.token);
    } catch (error) {
      console.error("Failed to fetch QR token:", error);
    }
  };

  const fetchAttendanceCount = async (sId) => {
    try {
      const response = await sessionAPI.getSessionAttendance(sId || sessionId);
      setAttendanceCount(response.data.attendance?.length || 0);
    } catch (error) {
      console.error("Failed to fetch attendance count:", error);
    }
  };

  const endSession = async () => {
    if (!window.confirm("Are you sure you want to end this session?")) return;

    try {
      setLoading(true);

      // Clear all intervals
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      // End the session
      await sessionAPI.endSession(sessionId);

      // Navigate back to dashboard
      navigate("/teacher/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to end session");
      setLoading(false);
    }
  };

  if (loading && !isActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {classData?.name || "Live Session"}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {classData?.code} • {classData?.department}
              </p>
            </div>
            {isActive && (
              <Button variant="error" onClick={endSession}>
                End Session
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-error-50 border border-error-200 text-error-700 rounded-lg">
            {error}
          </div>
        )}

        {!isActive ? (
          // Pre-session state
          <Card className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Start Attendance Session?
            </h2>
            <p className="text-gray-600 mb-8">
              Students will have 20 seconds per QR code to scan and mark their
              attendance.
            </p>
            <Button
              variant="primary"
              onClick={startSession}
              disabled={loading}
              className="px-8 py-3"
            >
              {loading ? "Starting..." : "Start Session"}
            </Button>
          </Card>
        ) : (
          // Active session
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* QR Code Display */}
            <div className="lg:col-span-2">
              <Card className="text-center bg-white">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Scan QR Code to Mark Attendance
                  </h2>
                  <p className="text-gray-600">
                    New code generates every 20 seconds
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center mb-6">
                  {qrToken ? (
                    <div className="p-6 bg-white rounded-lg shadow-lg border-4 border-primary-500">
                      <QRCode value={qrToken} size={300} level="H" />
                    </div>
                  ) : (
                    <div className="w-[300px] h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">Generating QR...</p>
                    </div>
                  )}
                </div>

                {/* Timer */}
                <div className="mb-4">
                  <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-lg font-bold">
                      Next refresh in: {timeRemaining}s
                    </span>
                  </div>
                </div>

                {/* Dev Token Display */}
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    🔧 Developer Info (Click to expand)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono break-all">
                    <p className="text-gray-600 mb-1">
                      Token (copy for testing):
                    </p>
                    <p className="text-gray-900">{qrToken}</p>
                  </div>
                </details>
              </Card>
            </div>

            {/* Live Stats */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-success-500 to-success-600 text-white">
                <h3 className="text-success-100 text-sm font-medium mb-2">
                  Students Present
                </h3>
                <p className="text-5xl font-bold">
                  {attendanceCount}/{totalStudents}
                </p>
                <div className="mt-4 w-full bg-success-400 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        totalStudents > 0
                          ? (attendanceCount / totalStudents) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </Card>

              <Card>
                <h3 className="text-gray-700 font-semibold mb-3">
                  Session Info
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-success-600">● Live</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Students:</span>
                    <span className="font-medium text-gray-900">
                      {totalStudents}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Attendance Rate:</span>
                    <span className="font-medium text-gray-900">
                      {totalStudents > 0
                        ? Math.round((attendanceCount / totalStudents) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <h3 className="text-yellow-800 font-semibold mb-2">
                  ⚠️ Important
                </h3>
                <p className="text-sm text-yellow-700">
                  Keep this window open during the session. QR codes rotate
                  every 20 seconds for security.
                </p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveSession;
