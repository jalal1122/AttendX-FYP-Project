import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectCurrentUser } from "../../features/auth/authSlice";
import classAPI from "../../services/classAPI";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import ExportModal from "../../components/modals/ExportModal";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [joiningClass, setJoiningClass] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getAllClasses();
      setClasses(response.data.classes || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setError("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError("Please enter a class code");
      return;
    }

    setError("");
    setSuccess("");
    setJoiningClass(true);

    try {
      const response = await classAPI.joinClass(joinCode.trim().toUpperCase());
      setSuccess(`Successfully joined ${response.data.name}!`);
      setJoinCode("");

      // Add the joined class to the list
      setClasses([response.data, ...classes]);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to join class");
    } finally {
      setJoiningClass(false);
    }
  };

  // Calculate attendance percentage
  const calculateAttendancePercentage = (classData) => {
    if (!classData.totalSessions || classData.totalSessions === 0) return 0;
    return Math.round(
      (classData.attendedSessions / classData.totalSessions) * 100
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Student Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome, {user?.name}!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                variant="secondary" 
                onClick={() => setShowExportModal(true)}
                className="mobile-btn w-full sm:w-auto"
              >
                📄 Download Transcript
              </Button>
              <Button 
                variant="success" 
                onClick={() => navigate("/student/scan")}
                className="mobile-btn w-full sm:w-auto"
              >
                📱 Scan Attendance
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mobile-container">
        {/* Success Message */}
        {success && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-success-50 border border-success-200 text-success-700 rounded-lg text-sm sm:text-base">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* Join Class Card */}
        <div className="mobile-card mb-6 sm:mb-8 bg-gradient-to-r from-sky-50 to-blue-50">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            Join a New Class
          </h2>
          <form onSubmit={handleJoinClass} className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Enter class code (e.g., ABC123)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="mobile-input flex-1"
              maxLength={6}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={joiningClass || !joinCode.trim()}
              className="mobile-btn w-full sm:w-auto"
            >
              {joiningClass ? "Joining..." : "Join Class"}
            </Button>
          </form>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="mobile-card">
            <h3 className="text-gray-500 text-sm font-medium">
              Enrolled Classes
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {classes.length}
            </p>
          </div>
          <div className="mobile-card">
            <h3 className="text-gray-500 text-sm font-medium">
              Overall Attendance
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {classes.length > 0
                ? Math.round(
                    classes.reduce(
                      (sum, cls) => sum + calculateAttendancePercentage(cls),
                      0
                    ) / classes.length
                  )
                : 0}
              %
            </p>
          </div>
          <div className="mobile-card sm:col-span-2 lg:col-span-1">
            <h3 className="text-gray-500 text-sm font-medium">
              Active Sessions
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
        </div>

        {/* My Classes */}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            My Classes
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading classes...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 sm:py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500 px-4">
                No classes yet. Join your first class using the code above!
              </p>
            </div>
          ) : (
            <div className="mobile-grid">
              {classes.map((cls) => {
                const attendancePercentage = calculateAttendancePercentage(cls);
                const isLowAttendance = attendancePercentage < 75;

                return (
                  <div
                    key={cls._id}
                    className="mobile-card hover:border-sky-500 border-2 border-transparent transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2">
                        {cls.name}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded flex-shrink-0 ml-2 ${
                          isLowAttendance
                            ? "badge-danger"
                            : "badge-success"
                        }`}
                      >
                        {attendancePercentage}%
                      </span>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm text-gray-600 mb-4">
                      <p>
                        <span className="font-medium">Department:</span>{" "}
                        {cls.department}
                      </p>
                      <p>
                        <span className="font-medium">Semester:</span>{" "}
                        {cls.semester}
                      </p>
                      <p>
                        <span className="font-medium">Attendance:</span>{" "}
                        {cls.attendedSessions || 0}/{cls.totalSessions || 0}{" "}
                        sessions
                      </p>
                    </div>

                    {/* Attendance Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isLowAttendance ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${attendancePercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        className="w-full mobile-btn"
                        onClick={() => navigate("/student/attendance")}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        defaultType="student_transcript"
        defaultTargetId={user?._id}
      />
    </div>
  );
};

export default StudentDashboard;
