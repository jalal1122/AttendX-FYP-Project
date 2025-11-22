import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../../features/auth/authSlice";
import classAPI from "../../services/classAPI";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const AdminDashboard = () => {
  const user = useSelector(selectCurrentUser);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    activeSessions: 0,
  });
  const [recentClasses, setRecentClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all classes
      const classesResponse = await classAPI.getAllClasses();
      const classes = classesResponse.data.classes || [];

      // Calculate stats
      const totalStudents = classes.reduce(
        (sum, cls) => sum + (cls.students?.length || 0),
        0
      );

      // Get unique teachers
      const uniqueTeachers = new Set(
        classes.map((cls) => cls.teacher?._id).filter(Boolean)
      );

      setStats({
        totalClasses: classes.length,
        totalStudents,
        totalTeachers: uniqueTeachers.size,
        activeSessions: 0, // Will be updated when session API is integrated
      });

      // Get recent classes (last 5)
      setRecentClasses(classes.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            System overview and management
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <h3 className="text-blue-100 text-sm font-medium">
                  Total Classes
                </h3>
                <p className="text-4xl font-bold mt-2">{stats.totalClasses}</p>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <h3 className="text-green-100 text-sm font-medium">
                  Total Students
                </h3>
                <p className="text-4xl font-bold mt-2">{stats.totalStudents}</p>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <h3 className="text-purple-100 text-sm font-medium">
                  Total Teachers
                </h3>
                <p className="text-4xl font-bold mt-2">{stats.totalTeachers}</p>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <h3 className="text-orange-100 text-sm font-medium">
                  Active Sessions
                </h3>
                <p className="text-4xl font-bold mt-2">
                  {stats.activeSessions}
                </p>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="primary" onClick={() => {}}>
                  View All Users
                </Button>
                <Button variant="success" onClick={() => {}}>
                  Generate Reports
                </Button>
                <Button variant="secondary" onClick={() => {}}>
                  System Settings
                </Button>
              </div>
            </Card>

            {/* Recent Classes */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent Classes
                </h2>
                <Button variant="outline" onClick={() => {}}>
                  View All
                </Button>
              </div>

              {recentClasses.length === 0 ? (
                <Card>
                  <p className="text-center text-gray-500">No classes found</p>
                </Card>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Teacher
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Students
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentClasses.map((cls) => (
                        <tr key={cls._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {cls.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Semester {cls.semester}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                              {cls.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {cls.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {cls.teacher?.name || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {cls.students?.length || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
