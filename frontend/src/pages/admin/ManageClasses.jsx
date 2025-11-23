import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import classAPI from "../../services/classAPI";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const ManageClasses = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");

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
    } finally {
      setLoading(false);
    }
  };

  // Get unique departments
  const departments = [...new Set(classes.map((cls) => cls.department))].filter(
    Boolean
  );

  // Filter classes
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch =
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment =
      filterDepartment === "all" || cls.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Classes
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                View and manage all classes in the system
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or code..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Department
              </label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Classes Grid */}
        {loading ? (
          <Card>
            <p className="text-center text-gray-500 py-8">Loading classes...</p>
          </Card>
        ) : filteredClasses.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">No classes found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClasses.map((cls) => (
              <Card key={cls._id} className="hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {cls.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Semester {cls.semester}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                    {cls.code}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Department:</span>
                    <span>{cls.department}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Teacher:</span>
                    <span>{cls.teacher?.name || "N/A"}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Students:</span>
                    <span className="font-semibold text-primary-600">
                      {cls.students?.length || 0}
                    </span>
                  </div>
                  {cls.batch && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-24">Batch:</span>
                      <span>{cls.batch}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Year:</span>
                    <span>{cls.academicYear}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/teacher/class/${cls._id}`)}
                    className="w-full"
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        <Card className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-600">
                {filteredClasses.length}
              </p>
              <p className="text-sm text-gray-600">Total Classes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {filteredClasses.reduce(
                  (sum, cls) => sum + (cls.students?.length || 0),
                  0
                )}
              </p>
              <p className="text-sm text-gray-600">Total Enrollments</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {departments.length}
              </p>
              <p className="text-sm text-gray-600">Departments</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ManageClasses;
