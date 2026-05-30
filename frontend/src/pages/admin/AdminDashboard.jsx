import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectCurrentUser } from "../../features/auth/authSlice";
import classAPI from "../../services/classAPI";
import userAPI from "../../services/userAPI";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import SystemHealthWidget from "../../components/admin/SystemHealthWidget";

const AdminDashboard = () => {
  const user = useSelector(selectCurrentUser);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
    activeSessions: 0,
  });
  const [recentClasses, setRecentClasses] = useState([]);
  const [batchStats, setBatchStats] = useState([]);
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

      // Fetch user stats
      const userStatsResponse = await userAPI.getUserStats();
      const userStats = userStatsResponse.data;

      setStats({
        totalUsers: userStats.totalUsers || 0,
        totalClasses: classes.length,
        totalStudents: userStats.totalStudents || 0,
        totalTeachers: userStats.totalTeachers || 0,
        totalAdmins: userStats.totalAdmins || 0,
        activeSessions: 0, // Will be updated when session API is integrated
      });

      setBatchStats(userStats.batchStats || []);

      // Get recent classes (last 5)
      setRecentClasses(classes.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            System overview and management
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mobile-container">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="mobile-card bg-gradient-to-br from-slate-600 to-slate-700 text-white">
                <h3 className="text-slate-100 text-sm font-medium">
                  Total Users
                </h3>
                <p className="text-3xl sm:text-4xl font-bold mt-2">
                  {stats.totalUsers}
                </p>
              </div>

              <div className="mobile-card bg-gradient-to-br from-sky-500 to-sky-600 text-white">
                <h3 className="text-sky-100 text-sm font-medium">
                  Total Classes
                </h3>
                <p className="text-3xl sm:text-4xl font-bold mt-2">
                  {stats.totalClasses}
                </p>
              </div>

              <div className="mobile-card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <h3 className="text-emerald-100 text-sm font-medium">
                  Total Students
                </h3>
                <p className="text-3xl sm:text-4xl font-bold mt-2">
                  {stats.totalStudents}
                </p>
              </div>

              <div className="mobile-card bg-gradient-to-br from-violet-500 to-violet-600 text-white">
                <h3 className="text-violet-100 text-sm font-medium">
                  Total Teachers
                </h3>
                <p className="text-3xl sm:text-4xl font-bold mt-2">
                  {stats.totalTeachers}
                </p>
              </div>

              <div className="mobile-card bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 text-white">
                <h3 className="text-fuchsia-100 text-sm font-medium">
                  Total Admins
                </h3>
                <p className="text-3xl sm:text-4xl font-bold mt-2">
                  {stats.totalAdmins}
                </p>
              </div>

              <div className="mobile-card bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <h3 className="text-amber-100 text-sm font-medium">
                  Active Sessions
                </h3>
                <p className="text-3xl sm:text-4xl font-bold mt-2">
                  {stats.activeSessions}
                </p>
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                    Students by Batch
                  </h2>
                  <span className="text-sm text-gray-500">
                    {batchStats.length} batch{batchStats.length === 1 ? "" : "es"}
                  </span>
                </div>

                {batchStats.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No batch data available.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {batchStats.map((batch) => (
                      <div
                        key={batch.batch}
                        className="rounded-lg border border-gray-200 bg-slate-50 p-4"
                      >
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Batch
                        </p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {batch.batch}
                        </p>
                        <p className="mt-2 text-3xl font-bold text-primary-600">
                          {batch.students}
                        </p>
                        <p className="text-sm text-gray-500">students</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* System Health Widget */}
            <div className="mb-6 sm:mb-8">
              <SystemHealthWidget />
            </div>

            {/* Quick Actions */}
            <div className="mobile-card mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  onClick={() => navigate("/admin/users")}
                  className="mobile-btn w-full sm:w-auto flex-1"
                >
                  View All Users
                </Button>
                <Button
                  variant="success"
                  onClick={() => navigate("/admin/classes")}
                  className="mobile-btn w-full sm:w-auto flex-1"
                >
                  View All Classes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate("/admin/reports")}
                  className="mobile-btn w-full sm:w-auto flex-1"
                >
                  Generate Reports
                </Button>
              </div>
            </div>

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
