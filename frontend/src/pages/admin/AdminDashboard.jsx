import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectCurrentUser } from "../../features/auth/authSlice";
import classAPI from "../../services/classAPI";
import userAPI from "../../services/userAPI";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import SystemHealthWidget from "../../components/admin/SystemHealthWidget";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

const COLORS = ["#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e"];

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
        activeSessions: 0,
      });

      setBatchStats(userStats.batchStats || []);
      setRecentClasses(classes.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const userDistributionData = [
    { name: "Students", value: stats.totalStudents },
    { name: "Teachers", value: stats.totalTeachers },
    { name: "Admins", value: stats.totalAdmins },
  ].filter(item => item.value > 0);

  const batchChartData = batchStats.map(b => ({
    name: b.batch,
    Students: b.students
  }));

  // Reusable dynamic card class for glassmorphism
  const glassCardClass = "bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 rounded-2xl p-6";

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 md:pb-8 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-primary-50 to-indigo-50 opacity-70 -z-10" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
      <div className="absolute top-48 -left-24 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />
      
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-lg shadow-sm border-b border-slate-100 sticky top-0 z-30 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              System overview and real-time management
            </p>
          </div>
          <div className="hidden sm:block">
             <Button variant="primary" onClick={() => navigate("/admin/reports")} className="shadow-lg shadow-primary-500/30 hover:scale-105 transition-transform">
               Go to Reports Hub 📈
             </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-slate-500 mt-4 font-medium animate-pulse">Loading dashboard insights...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
              {[
                { title: "Total Users", value: stats.totalUsers, color: "from-slate-600 to-slate-800" },
                { title: "Classes", value: stats.totalClasses, color: "from-sky-500 to-blue-600" },
                { title: "Students", value: stats.totalStudents, color: "from-emerald-400 to-teal-600" },
                { title: "Teachers", value: stats.totalTeachers, color: "from-violet-500 to-purple-600" },
                { title: "Admins", value: stats.totalAdmins, color: "from-fuchsia-500 to-pink-600" },
                { title: "Active Sessions", value: stats.activeSessions, color: "from-amber-400 to-orange-500" },
              ].map((stat, idx) => (
                <div key={idx} className={`rounded-2xl bg-gradient-to-br ${stat.color} p-5 text-white shadow-lg hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden group`}>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <h3 className="text-white/80 text-xs uppercase tracking-wider font-semibold">
                    {stat.title}
                  </h3>
                  <p className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Interactive Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* User Distribution Chart */}
              <div className={glassCardClass}>
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                  <span className="bg-primary-100 p-2 rounded-lg mr-3 text-primary-600">👥</span>
                  User Distribution
                </h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {userDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, "Users"]} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Batch Distribution Chart */}
              <div className={glassCardClass}>
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                  <span className="bg-indigo-100 p-2 rounded-lg mr-3 text-indigo-600">📊</span>
                  Students per Batch
                </h2>
                <div className="h-[300px]">
                  {batchStats.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-slate-400">No batch data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={batchChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                        <Tooltip 
                          cursor={{fill: '#f1f5f9'}}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="Students" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Recent Classes Table */}
              <div className={`lg:col-span-2 ${glassCardClass} p-0 overflow-hidden`}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <span className="bg-emerald-100 p-2 rounded-lg mr-3 text-emerald-600">📚</span>
                    Recent Classes
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin/classes")}>
                    View All
                  </Button>
                </div>

                {recentClasses.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No classes found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50/50 backdrop-blur-sm">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Class Info</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Students</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-transparent">
                        {recentClasses.map((cls) => (
                          <tr key={cls._id} className="hover:bg-primary-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/admin/classes`)}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary-100 to-indigo-100 flex items-center justify-center text-primary-700 font-bold group-hover:scale-110 transition-transform">
                                  {cls.code.substring(0,2)}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-bold text-slate-900">{cls.name}</div>
                                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{cls.code}</span>
                                    <span>Sem {cls.semester}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                              {cls.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-900 font-medium">{cls.teacher?.name || "Unassigned"}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                                {cls.students?.length || 0}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* System Health Widget & Quick Actions */}
              <div className="space-y-8">
                <div className={glassCardClass}>
                  <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                    <span className="bg-purple-100 p-2 rounded-lg mr-3 text-purple-600">⚡</span>
                    System Health
                  </h2>
                  <SystemHealthWidget />
                </div>

                <div className={glassCardClass}>
                  <h2 className="text-lg font-bold text-slate-800 mb-6">Quick Actions</h2>
                  <div className="flex flex-col gap-3">
                    <Button variant="primary" onClick={() => navigate("/admin/users")} className="w-full justify-start shadow-sm hover:shadow-md transition-shadow">
                      👤 Manage Users
                    </Button>
                    <Button variant="success" onClick={() => navigate("/admin/classes")} className="w-full justify-start shadow-sm hover:shadow-md transition-shadow">
                      📚 Manage Classes
                    </Button>
                    <Button variant="secondary" onClick={() => navigate("/admin/reports")} className="w-full justify-start shadow-sm hover:shadow-md transition-shadow">
                      📊 Generate Reports
                    </Button>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
