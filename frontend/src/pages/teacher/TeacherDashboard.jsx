import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectCurrentUser } from "../../features/auth/authSlice";
import classAPI from "../../services/classAPI";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    semester: "",
    batch: "",
    academicYear: new Date().getFullYear().toString(),
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await classAPI.createClass(formData);
      setSuccess("Class created successfully!");
      setShowCreateModal(false);

      // Add new class to the list
      setClasses([response.data, ...classes]);

      // Reset form
      setFormData({
        name: "",
        department: "",
        semester: "",
        batch: "",
        academicYear: new Date().getFullYear().toString(),
      });
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create class");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Teacher Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome back, {user?.name}!
              </p>
            </div>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              + Create Class
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">Total Classes</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {classes.length}
            </p>
          </Card>
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">
              Total Students
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {classes.reduce(
                (sum, cls) => sum + (cls.students?.length || 0),
                0
              )}
            </p>
          </Card>
          <Card>
            <h3 className="text-gray-500 text-sm font-medium">
              Active Sessions
            </h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </Card>
        </div>

        {/* Classes Grid */}
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
                No classes yet. Create your first class!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <Card
                  key={cls._id}
                  className="hover:border-primary-500 border-2 border-transparent"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {cls.name}
                    </h3>
                    <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                      {cls.code}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Department:</span>{" "}
                      {cls.department}
                    </p>
                    <p>
                      <span className="font-medium">Semester:</span>{" "}
                      {cls.semester}
                    </p>
                    <p>
                      <span className="font-medium">Students:</span>{" "}
                      {cls.students?.length || 0}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() =>
                        navigate(`/teacher/session/${String(cls._id)}`)
                      }
                    >
                      Start Session
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        navigate(`/teacher/class/${String(cls._id)}`)
                      }
                    >
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Class Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Class"
      >
        <form onSubmit={handleCreateClass}>
          <Input
            label="Class Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Web Engineering"
            required
          />

          <Input
            label="Department"
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            placeholder="e.g., Computer Science"
            required
          />

          <Input
            label="Semester"
            name="semester"
            type="number"
            min="1"
            max="8"
            value={formData.semester}
            onChange={handleInputChange}
            placeholder="1-8"
            required
          />

          <Input
            label="Batch"
            name="batch"
            value={formData.batch}
            onChange={handleInputChange}
            placeholder="e.g., 2021-2025"
          />

          <Input
            label="Academic Year"
            name="academicYear"
            value={formData.academicYear}
            onChange={handleInputChange}
            placeholder="e.g., 2025"
          />

          {error && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Create Class
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeacherDashboard;
