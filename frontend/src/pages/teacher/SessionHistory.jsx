import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import sessionAPI from "../../services/sessionAPI";
import attendanceAPI from "../../services/attendanceAPI";
import classAPI from "../../services/classAPI";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

const SessionHistory = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(null);
  const [classData, setClassData] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);

      // Fetch session details
      const sessionResponse = await sessionAPI.getSessionDetails(sessionId);

      // Get classId (handle both populated and non-populated cases)
      const classId =
        typeof sessionResponse.data.classId === "string"
          ? sessionResponse.data.classId
          : sessionResponse.data.classId._id;

      // Update sessionData with string classId for navigation
      sessionResponse.data.classId = classId;
      setSessionData(sessionResponse.data);

      // Fetch class details
      const classResponse = await classAPI.getClassDetails(classId);
      setClassData(classResponse.data);
      setStudents(classResponse.data.students || []);

      // Fetch attendance records
      const attendanceResponse = await sessionAPI.getSessionAttendance(
        sessionId
      );
      const attendanceRecords = attendanceResponse.data.attendance || [];

      // Create attendance map
      const attendanceMap = {};
      attendanceRecords.forEach((record) => {
        // Backend returns 'student' field, not 'studentId'
        const studentId =
          record.student?._id || record.studentId?._id || record.studentId;
        if (studentId) {
          attendanceMap[studentId] = record.status;
        }
      });
      setAttendance(attendanceMap);

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch session data:", error);
      setMessage({ type: "error", text: "Failed to load session data" });
      setLoading(false);
    }
  };

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      setSaving(true);

      await attendanceAPI.manualUpdate(sessionId, studentId, newStatus);

      // Update local state
      setAttendance({
        ...attendance,
        [studentId]: newStatus,
      });

      setMessage({ type: "success", text: "Attendance updated successfully" });

      // Clear success message after 2 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 2000);
    } catch (error) {
      console.error("Failed to update attendance:", error);
      console.error("Error details:", error.response?.data);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update attendance",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!window.confirm("Mark all students as present for this session?"))
      return;

    try {
      setSaving(true);

      // Mark all students as present
      const promises = students.map((student) =>
        attendanceAPI.manualUpdate(sessionId, student._id, "Present")
      );

      await Promise.all(promises);

      // Update local state
      const newAttendance = {};
      students.forEach((student) => {
        newAttendance[student._id] = "Present";
      });
      setAttendance(newAttendance);

      setMessage({ type: "success", text: "All students marked as present" });
    } catch (error) {
      console.error("Failed to mark all present:", error);
      setMessage({ type: "error", text: "Failed to mark all present" });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Present":
        return "bg-success-100 text-success-700 border-success-300";
      case "Absent":
        return "bg-error-100 text-error-700 border-error-300";
      case "Late":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getPresentCount = () => {
    return Object.values(attendance).filter((status) => status === "Present")
      .length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading session data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Session Attendance Editor
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {classData?.name} • {formatDate(sessionData?.startTime)}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate(`/teacher/class/${sessionData?.classId}`)}
            >
              Back to Class
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-success-50 border-success-200 text-success-700"
                : "bg-error-50 border-error-200 text-error-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Session Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">Date</h3>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatDate(sessionData?.startTime)}
            </p>
          </Card>
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">Time</h3>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatTime(sessionData?.startTime)} -{" "}
              {formatTime(sessionData?.endTime)}
            </p>
          </Card>
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">Type</h3>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {sessionData?.type}
            </p>
          </Card>
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">Present</h3>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {getPresentCount()}/{students.length}
            </p>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Student Attendance
          </h2>
          <Button
            variant="success"
            onClick={handleMarkAllPresent}
            disabled={saving}
          >
            Mark All Present
          </Button>
        </div>

        {/* Attendance Table */}
        {students.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">
              No students enrolled in this class.
            </p>
          </Card>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Roll No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student, index) => {
                  const currentStatus = attendance[student._id] || "Absent";

                  return (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.info?.rollNo || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                            currentStatus
                          )}`}
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={currentStatus}
                          onChange={(e) =>
                            handleStatusChange(student._id, e.target.value)
                          }
                          disabled={saving}
                          className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <h3 className="text-blue-900 font-semibold mb-2">💡 Quick Tips</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              • Changes are saved immediately when you select a new status
            </li>
            <li>• Use "Mark All Present" for quick retroactive entry</li>
            <li>• You can change attendance status at any time</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default SessionHistory;
