import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import classAPI from "../../services/classAPI";
import userAPI from "../../services/userAPI";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const AdminReports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
  });
  const [departmentData, setDepartmentData] = useState([]);
  const [semesterData, setSemesterData] = useState([]);
  const [roleData, setRoleData] = useState([]);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Fetch user stats
      const userStatsResponse = await userAPI.getUserStats();
      const userStats = userStatsResponse.data;

      // Fetch all classes
      const classesResponse = await classAPI.getAllClasses();
      const classes = classesResponse.data.classes || [];

      setStats({
        totalUsers: userStats.totalUsers,
        totalClasses: classes.length,
        totalStudents: userStats.totalStudents,
        totalTeachers: userStats.totalTeachers,
      });

      // Process department data
      const deptMap = {};
      classes.forEach((cls) => {
        const dept = cls.department || "Unknown";
        if (!deptMap[dept]) {
          deptMap[dept] = {
            department: dept,
            classes: 0,
            students: 0,
          };
        }
        deptMap[dept].classes += 1;
        deptMap[dept].students += cls.students?.length || 0;
      });
      setDepartmentData(Object.values(deptMap));

      // Process semester data
      const semMap = {};
      classes.forEach((cls) => {
        const sem = `Semester ${cls.semester}`;
        if (!semMap[sem]) {
          semMap[sem] = {
            semester: sem,
            classes: 0,
            students: 0,
          };
        }
        semMap[sem].classes += 1;
        semMap[sem].students += cls.students?.length || 0;
      });
      setSemesterData(
        Object.values(semMap).sort((a, b) =>
          a.semester.localeCompare(b.semester)
        )
      );

      // Role distribution
      setRoleData([
        { name: "Students", value: userStats.totalStudents },
        { name: "Teachers", value: userStats.totalTeachers },
        { name: "Admins", value: userStats.totalAdmins },
      ]);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: stats,
      departmentBreakdown: departmentData,
      semesterBreakdown: semesterData,
      roleDistribution: roleData,
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-report-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                System Reports
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Overview of system-wide statistics and analytics
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="success" onClick={exportReport}>
                Export Report
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/admin/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <Card>
            <p className="text-center text-gray-500 py-8">
              Loading report data...
            </p>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <h3 className="text-blue-100 text-sm font-medium">
                  Total Users
                </h3>
                <p className="text-4xl font-bold mt-2">{stats.totalUsers}</p>
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
                  Total Classes
                </h3>
                <p className="text-4xl font-bold mt-2">{stats.totalClasses}</p>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Role Distribution Pie Chart */}
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  User Role Distribution
                </h2>
                {roleData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={roleData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {roleData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-12">
                    No data available
                  </p>
                )}
              </Card>

              {/* Department Distribution */}
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Classes by Department
                </h2>
                {departmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="classes" fill="#3b82f6" name="Classes" />
                      <Bar dataKey="students" fill="#10b981" name="Students" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-12">
                    No data available
                  </p>
                )}
              </Card>
            </div>

            {/* Charts Row 2 */}
            <Card className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Classes by Semester
              </h2>
              {semesterData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={semesterData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semester" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="classes" fill="#f59e0b" name="Classes" />
                    <Bar dataKey="students" fill="#8b5cf6" name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-12">
                  No data available
                </p>
              )}
            </Card>

            {/* Department Details Table */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Department Details
              </h2>
              {departmentData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Classes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Students
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Students/Class
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {departmentData.map((dept, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {dept.department}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {dept.classes}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {dept.students}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {dept.classes > 0
                                ? (dept.students / dept.classes).toFixed(1)
                                : "0"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No department data available
                </p>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
