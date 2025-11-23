import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import classAPI from "../../services/classAPI";
import sessionAPI from "../../services/sessionAPI";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";

const ClassDetails = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [classData, setClassData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState("sessions");
  const [loading, setLoading] = useState(true);
  const [showRetroModal, setShowRetroModal] = useState(false);
  const [retroFormData, setRetroFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    type: "Lecture",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchClassData = useCallback(async () => {
    try {
      // Ensure classId is a string, not an object
      const classIdString = String(classId);
      const response = await classAPI.getClassDetails(classIdString);
      setClassData(response.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load class details");
      setLoading(false);
    }
  }, [classId]);

  const fetchSessions = useCallback(async () => {
    try {
      // Ensure classId is a string, not an object
      const classIdString = String(classId);
      const response = await sessionAPI.getClassSessions(classIdString);
      setSessions(response.data.sessions || []);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  }, [classId]);

  useEffect(() => {
    fetchClassData();
    fetchSessions();
  }, [fetchClassData, fetchSessions]);

  const handleRetroInputChange = (e) => {
    setRetroFormData({
      ...retroFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateRetroSession = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        classId: String(classId),
        date: retroFormData.date,
        startTime: retroFormData.startTime,
        endTime: retroFormData.endTime,
        type: retroFormData.type,
      };

      const response = await sessionAPI.createRetroactiveSession(payload);
      setSuccess("Retroactive session created successfully!");
      setShowRetroModal(false);

      // Redirect to session history page for manual attendance marking
      // Backend returns ApiResponse: {success, data: session, message}
      // Axios wraps as response.data, so session is at response.data.data
      const sessionId = response.data.data._id;
      navigate(`/teacher/session/${sessionId}/edit`);
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to create retroactive session"
      );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
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
                {classData?.name}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {classData?.code} • {classData?.department} • Semester{" "}
                {classData?.semester}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate("/teacher/dashboard")}
              >
                Back to Dashboard
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate(`/teacher/session/${classId}`)}
              >
                Start Live Session
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {success && (
          <div className="mb-6 p-4 bg-success-50 border border-success-200 text-success-700 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-error-50 border border-error-200 text-error-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">
              Total Students
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {classData?.students?.length || 0}
            </p>
          </Card>
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">
              Total Sessions
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {sessions.length}
            </p>
          </Card>
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">Class Code</h3>
            <p className="text-3xl font-bold text-primary-600 mt-2">
              {classData?.code}
            </p>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("sessions")}
                className={`${
                  activeTab === "sessions"
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Sessions ({sessions.length})
              </button>
              <button
                onClick={() => setActiveTab("students")}
                className={`${
                  activeTab === "students"
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Students ({classData?.students?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`${
                  activeTab === "analytics"
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Analytics
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "sessions" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Session History
              </h2>
              <Button variant="success" onClick={() => setShowRetroModal(true)}>
                + Add Past Session
              </Button>
            </div>

            {sessions.length === 0 ? (
              <Card>
                <p className="text-center text-gray-500 py-8">
                  No sessions yet. Start a live session or add a past session.
                </p>
              </Card>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
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
                    {sessions.map((session) => (
                      <tr key={session._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(session.startTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(session.startTime)} -{" "}
                          {formatTime(session.endTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {session.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              session.active
                                ? "bg-success-100 text-success-700"
                                : session.isRetroactive
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {session.active
                              ? "Live"
                              : session.isRetroactive
                              ? "Manual"
                              : "Ended"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button
                            variant="outline"
                            onClick={() =>
                              navigate(`/teacher/session/${session._id}/edit`)
                            }
                            className="text-xs"
                          >
                            View/Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "students" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Enrolled Students
            </h2>
            {classData?.students?.length === 0 ? (
              <Card>
                <p className="text-center text-gray-500 py-8">
                  No students enrolled yet. Share the class code:{" "}
                  <strong>{classData?.code}</strong>
                </p>
              </Card>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Roll No
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {classData?.students?.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.info?.rollNo || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Class Analytics
              </h2>
              <Button
                variant="primary"
                onClick={() => navigate(`/reports/${classId}`)}
              >
                View Full Report
              </Button>
            </div>
            <Card>
              <p className="text-center text-gray-500 py-8">
                Click "View Full Report" to see detailed analytics with charts
                and trends.
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Retroactive Session Modal */}
      <Modal
        isOpen={showRetroModal}
        onClose={() => setShowRetroModal(false)}
        title="Add Past Session"
      >
        <form onSubmit={handleCreateRetroSession}>
          <p className="text-sm text-gray-600 mb-4">
            Create a retroactive session for manual attendance entry.
          </p>

          <Input
            label="Date"
            name="date"
            type="date"
            value={retroFormData.date}
            onChange={handleRetroInputChange}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              name="startTime"
              type="time"
              value={retroFormData.startTime}
              onChange={handleRetroInputChange}
              required
            />

            <Input
              label="End Time"
              name="endTime"
              type="time"
              value={retroFormData.endTime}
              onChange={handleRetroInputChange}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Type
            </label>
            <select
              name="type"
              value={retroFormData.type}
              onChange={handleRetroInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="Lecture">Lecture</option>
              <option value="Lab">Lab</option>
              <option value="Exam">Exam</option>
            </select>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowRetroModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Create & Edit Attendance
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClassDetails;
