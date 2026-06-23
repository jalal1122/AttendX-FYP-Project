import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import classAPI from "../../services/classAPI";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import ClassFilters from "../../components/ui/ClassFilters";

const ManageClasses = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Backend Filters
  const [filters, setFilters] = useState({
    name: "",
    department: "",
    semester: "",
    batch: "",
    teacher: ""
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async (currentFilters = filters) => {
    try {
      setLoading(true);
      // Clean empty filters before sending
      const activeFilters = Object.fromEntries(
        Object.entries(currentFilters).filter(([_, v]) => v !== "")
      );
      const response = await classAPI.getAllClasses(activeFilters);
      setClasses(response.data.classes || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchClasses(filters);
  };

  const handleClearFilter = () => {
    const emptyFilters = { name: "", department: "", semester: "", batch: "", teacher: "" };
    setFilters(emptyFilters);
    fetchClasses(emptyFilters);
  };

  // Get unique departments (for stats only now)
  const departments = [...new Set(classes.map((cls) => cls.department))].filter(Boolean);

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
        <ClassFilters 
          filters={filters} 
          setFilters={setFilters} 
          onFilter={handleFilter}
          onClear={handleClearFilter}
          isAdmin={true} 
        />

        {/* Classes Grid */}
        {loading ? (
          <Card>
            <p className="text-center text-gray-500 py-8">Loading classes...</p>
          </Card>
        ) : classes.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">No classes found</p>
          </Card>
        ) : (
          <div className="mobile-grid">
            {classes.map((cls) => (
              <Card key={cls._id} className="hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {cls.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Semester {cls.semester}
                    </p>
                    <p className="text-xs text-gray-400 break-all mt-1">
                      Class ID: {cls._id}
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
                    <span className="font-medium w-24">Teacher ID:</span>
                    <span className="break-all">
                      {cls.teacher?._id || "N/A"}
                    </span>
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
                {classes.length}
              </p>
              <p className="text-sm text-gray-600">Total Classes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {classes.reduce(
                  (sum, cls) => sum + (cls.students?.length || 0),
                  0,
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
