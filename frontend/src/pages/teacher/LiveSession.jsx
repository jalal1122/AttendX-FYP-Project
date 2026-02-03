import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import classAPI from "../../services/classAPI";
import sessionAPI from "../../services/sessionAPI";
import attendanceAPI from "../../services/attendanceAPI";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StartSessionModal from "../../components/modals/StartSessionModal";

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
  const [showStartModal, setShowStartModal] = useState(false);
  const [sessionConfig, setSessionConfig] = useState(null);
  const [pendingAttendance, setPendingAttendance] = useState([]);

  const qrIntervalRef = useRef(null);
  const countIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const fetchClassDetails = async () => {
    try {
      const response = await classAPI.getClassDetails(classId);
      setClassData(response.data);
      setTotalStudents(response.data.students?.length || 0);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load class details:", err);
      setError("Failed to load class details");
      setLoading(false);
    }
  };

  const checkExistingSession = async () => {
    try {
      // Check if there's an active session for this class
      const response = await sessionAPI.getActiveSession(classId);
      const activeSession = response.data;

      if (activeSession) {
        // Resume existing session
        console.log("📋 Resuming existing session:", activeSession._id);
        setSessionId(activeSession._id);
        setIsActive(true);
        continueSessionSetup(activeSession._id);
      }
    } catch (err) {
      console.error("Error checking existing sessions:", err);
    }
  };

  // Fetch class details on mount
  useEffect(() => {
    fetchClassDetails();
    checkExistingSession();
    return () => {
      // Cleanup intervals on unmount
      if (qrIntervalRef.current) clearInterval(qrIntervalRef.current);
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const handleModalSubmit = async (config) => {
    setSessionConfig(config);
    await startSession(config);
  };

  const startSession = async (config) => {
    try {
      setError("");
      setLoading(true);

      // Get teacher's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            console.log("📍 Teacher location captured:", {
              latitude,
              longitude,
            });

            try {
              // Start the session with location and security config
              const response = await sessionAPI.startSession(classId, {
                latitude,
                longitude,
                type: config.type,
                securityConfig: config.securityConfig,
              });
              console.log(response.data);
              
              setSessionId(response.data._id);
              setSessionConfig(response.data.securityConfig);
              setIsActive(true);
              setTimeRemaining(response.data.securityConfig.qrRefreshRate || 20);
              continueSessionSetup(
                response.data._id,
                response.data.securityConfig
              );
            } catch (err) {
              handleSessionError(err);
            }
          },
          async (error) => {
            console.warn("Location access denied:", error);
            try {
              // Start session without location
              const response = await sessionAPI.startSession(classId);
              setSessionId(response.data._id);
              setIsActive(true);
              continueSessionSetup(response.data._id);
            } catch (err) {
              handleSessionError(err);
            }
          }
        );
        return;
      } else {
        // Browser doesn't support geolocation
        const response = await sessionAPI.startSession(classId);
        setSessionId(response.data._id);
        setIsActive(true);
        continueSessionSetup(response.data._id);
      }
    } catch (err) {
      handleSessionError(err);
    }
  };

  const handleSessionError = (err) => {
    console.error("Failed to start session:", err);

    if (err.response?.status === 409) {
      setError(
        "⚠️ There's already an active session for this class. Please end it first or refresh to resume it."
      );
    } else {
      setError(err.response?.data?.message || "Failed to start session");
    }

    setLoading(false);
  };

  const continueSessionSetup = async (sessionId, config) => {
    try {
      // Use config or fetch session to get security settings
      const qrRefreshRate = config?.qrRefreshRate || 20;
      const manualApproval = config?.manualApproval || false;

      // Set initial timer
      setTimeRemaining(qrRefreshRate);

      // Get first QR token immediately
      await fetchNewQRToken(sessionId, qrRefreshRate);

      // Start QR rotation (dynamic refresh rate)
      qrIntervalRef.current = setInterval(() => {
        fetchNewQRToken(sessionId, qrRefreshRate);
      }, qrRefreshRate * 1000);

      // Start attendance count updates (every 5 seconds)
      countIntervalRef.current = setInterval(() => {
        fetchAttendanceCount(sessionId);
        if (manualApproval) {
          fetchPendingAttendance(sessionId);
        }
      }, 5000);

      // Start countdown timer (every second)
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) return qrRefreshRate; // Reset to dynamic rate
          return prev - 1;
        });
      }, 1000);

      // Fetch initial counts
      fetchAttendanceCount(sessionId);
      if (manualApproval) {
        fetchPendingAttendance(sessionId);
      }

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

  const fetchNewQRToken = async (sId, refreshRate) => {
    try {
      const response = await sessionAPI.getQRToken(sId || sessionId);
      setQrToken(response.data.token);
      setTimeRemaining(refreshRate || 20); // Reset timer

      // Log token for dev testing
      console.log("🔑 NEW QR TOKEN:", response.data.token);
    } catch (error) {
      console.error("Failed to fetch QR token:", error);
    }
  };

  const fetchAttendanceCount = async (sId) => {
    try {
      const response = await sessionAPI.getSessionAttendance(sId || sessionId);
      const all = response.data.attendance || [];

      // When manual approval is enabled, count both Present and Pending
      const countPresent = all.filter((att) => att.status === "Present").length;
      const countPending = all.filter((att) => att.status === "Pending").length;

      const effectiveCount =
        sessionConfig?.manualApproval === true
          ? countPresent + countPending
          : countPresent;

      setAttendanceCount(effectiveCount || 0);
    } catch (error) {
      console.error("Failed to fetch attendance count:", error);
    }
  };

  const fetchPendingAttendance = async (sId) => {
    try {
      const response = await sessionAPI.getSessionAttendance(sId || sessionId);
      const pending =
        response.data.attendance?.filter((att) => att.status === "Pending") ||
        [];
      setPendingAttendance(pending);
    } catch (error) {
      console.error("Failed to fetch pending attendance:", error);
    }
  };

  const handleApproveAttendance = async (studentIds) => {
    try {
      await attendanceAPI.approveAttendance(sessionId, studentIds);
      // Refresh attendance lists
      fetchAttendanceCount(sessionId);
      fetchPendingAttendance(sessionId);
    } catch (error) {
      console.error("Failed to approve attendance:", error);
      setError(error.response?.data?.message || "Failed to approve attendance");
    }
  };

  const handleApproveAll = async () => {
    const allPendingIds = pendingAttendance.map((att) => att.student._id);
    await handleApproveAttendance(allPendingIds);
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 pb-6">
      {/* Header */}
      <div className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                {classData?.name || "Live Session"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {classData?.code} • {classData?.department}
              </p>
            </div>
            {isActive && (
              <Button
                variant="error"
                onClick={endSession}
                className="w-full sm:w-auto"
              >
                End Session
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm sm:text-base">
            <p className="mb-2">{error}</p>
            {error.includes("active session") && (
              <Button
                variant="secondary"
                onClick={() => {
                  setError("");
                  checkExistingSession();
                }}
                className="mt-2 w-full sm:w-auto"
                size="sm"
              >
                Try Resume Session
              </Button>
            )}
          </div>
        )}

        {!isActive ? (
          // Pre-session state
          <Card className="text-center py-8 sm:py-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              Ready to Start Attendance Session?
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-4">
              Configure security settings and start the session.
            </p>

            <Button
              variant="primary"
              onClick={() => setShowStartModal(true)}
              disabled={loading}
              className="px-6 sm:px-8 py-2 sm:py-3 mx-4"
            >
              {loading ? "Starting..." : "Start Session"}
            </Button>
          </Card>
        ) : (
          // Active session
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* QR Code Display */}
            <div className="lg:col-span-2">
              <Card className="text-center bg-white">
                <div className="mb-4 sm:mb-6 px-2 sm:px-4">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                    Scan QR Code to Mark Attendance
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    New code generates every{" "}
                    {sessionConfig?.qrRefreshRate || 20} seconds
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center mb-4 sm:mb-6 px-2">
                  {qrToken ? (
                    <div className="p-3 sm:p-4 lg:p-6 bg-white rounded-lg shadow-lg border-2 sm:border-4 border-primary-500 w-fit">
                      <QRCode
                        value={qrToken}
                        size={
                          window.innerWidth < 640
                            ? 200
                            : window.innerWidth < 1024
                            ? 250
                            : 300
                        }
                        level="H"
                      />
                    </div>
                  ) : (
                    <div className="w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] lg:w-[300px] lg:h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                        <p className="text-gray-500 text-sm">
                          Generating QR...
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timer */}
                <div className="mb-4 px-2">
                  <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-primary-100 text-primary-700 rounded-full">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
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
                    <span className="text-base sm:text-lg font-bold">
                      Refresh in: {timeRemaining}s
                    </span>
                  </div>
                </div>

                {/* Dev Token Display */}
                <details className="mt-4 text-left px-2 sm:px-4">
                  <summary className="cursor-pointer text-xs sm:text-sm text-gray-500 hover:text-gray-700">
                    🔧 Developer Info (Click to expand)
                  </summary>
                  <div className="mt-2 p-2 sm:p-3 bg-gray-50 rounded text-xs font-mono break-all">
                    <p className="text-gray-600 mb-1">
                      Token (copy for testing):
                    </p>
                    <code className="text-gray-800">{qrToken}</code>
                  </div>
                </details>
              </Card>
            </div>

            {/* Live Stats */}
            <div className="space-y-4 sm:space-y-6">
              <Card className="bg-gradient-to-br from-success-500 to-success-600 text-white">
                <h3 className="text-success-100 text-xs sm:text-sm font-medium mb-2">
                  Students Present
                </h3>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                  {attendanceCount}/{totalStudents}
                </p>
                <div className="mt-3 sm:mt-4 w-full bg-success-400 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-500"
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
                <h3 className="text-gray-700 text-sm sm:text-base font-semibold mb-2 sm:mb-3">
                  Session Info
                </h3>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-success-600 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-success-600 mr-1 animate-pulse"></span>
                      Live
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Students:</span>
                    <span className="font-medium text-gray-900">
                      {totalStudents}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
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
                <h3 className="text-yellow-800 text-sm sm:text-base font-semibold mb-2">
                  ⚠️ Important
                </h3>
                <p className="text-xs sm:text-sm text-yellow-700">
                  Keep this window open during the session. QR codes rotate
                  every {sessionConfig?.qrRefreshRate || 20} seconds for
                  security.
                </p>
              </Card>

              {/* Pending Approvals */}
              {sessionConfig?.manualApproval &&
                pendingAttendance.length > 0 && (
                  <Card className="bg-orange-50 border-orange-200">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                      <h3 className="text-orange-800 text-sm sm:text-base font-semibold">
                        🕒 Pending Approvals ({pendingAttendance.length})
                      </h3>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleApproveAll}
                        className="w-full sm:w-auto"
                      >
                        Approve All
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                      {pendingAttendance.map((att) => (
                        <div
                          key={att.attendanceId || att.student._id}
                          className="flex justify-between items-center p-2 bg-white rounded border border-orange-200 gap-2"
                        >
                          <div className="text-xs sm:text-sm flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {att.student?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {att.student?.info?.rollNo || "N/A"}
                            </p>
                          </div>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() =>
                              handleApproveAttendance([att.student._id])
                            }
                            className="flex-shrink-0"
                          >
                            ✓
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
            </div>
          </div>
        )}

        {/* Start Session Modal */}
        <StartSessionModal
          isOpen={showStartModal}
          onClose={() => setShowStartModal(false)}
          onSubmit={handleModalSubmit}
          className={classData?.name}
        />
      </div>
    </div>
  );
};

export default LiveSession;
