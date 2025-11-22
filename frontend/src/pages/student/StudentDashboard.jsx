import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectCurrentUser } from "../../features/auth/authSlice";
import classAPI from "../../services/classAPI";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [joiningClass, setJoiningClass] = useState(false);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Student Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome, {user?.name}!
              </p>
            </div>
            <Button variant="success" onClick={() => navigate("/student/scan")}>
              📱 Scan Attendance
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-success-50 border border-success-200 text-success-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-error-50 border border-error-200 text-error-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Join Class Card */}
        <Card className="mb-8 bg-gradient-to-r from-primary-50 to-blue-50">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Join a New Class
          </h2>
          <form onSubmit={handleJoinClass} className="flex gap-3">
            <Input
              placeholder="Enter class code (e.g., ABC123)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="flex-1"
              maxLength={6}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={joiningClass || !joinCode.trim()}
            >
              {joiningClass ? "Joining..." : "Join Class"}
            </Button>
          </form>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">
              Enrolled Classes
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {classes.length}
            </p>
          </Card>
          <Card>
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
          </Card>
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">
              Active Sessions
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </Card>
        </div>

        {/* My Classes */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            My Classes
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading classes...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">
                No classes yet. Join your first class using the code above!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => {
                const attendancePercentage = calculateAttendancePercentage(cls);
                const isLowAttendance = attendancePercentage < 75;

                return (
                  <Card
                    key={cls._id}
                    className="hover:border-primary-500 border-2 border-transparent"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {cls.name}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          isLowAttendance
                            ? "bg-error-100 text-error-700"
                            : "bg-success-100 text-success-700"
                        }`}
                      >
                        {attendancePercentage}%
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
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
                            isLowAttendance ? "bg-error-500" : "bg-success-500"
                          }`}
                          style={{ width: `${attendancePercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          /* Navigate to class details */
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
