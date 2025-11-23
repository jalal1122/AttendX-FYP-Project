import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
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
  Legend,
  ResponsiveContainer,
} from "recharts";
import analyticsAPI from "../../services/analyticsAPI";
import classAPI from "../../services/classAPI";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

const COLORS = {
  present: "#10b981",
  absent: "#ef4444",
  late: "#f59e0b",
};

const Reports = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [classData, setClassData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [period, setPeriod] = useState("weekly");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setDatePreset = (preset) => {
    const now = new Date();
    let startDate, endDate;

    switch (preset) {
      case "thisWeek": {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = weekStart.toISOString().split("T")[0];
        endDate = now.toISOString().split("T")[0];
        break;
      }
      case "thisMonth": {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        endDate = now.toISOString().split("T")[0];
        break;
      }
      case "thisSemester": {
        const month = now.getMonth();
        const semesterStart =
          month >= 7
            ? new Date(now.getFullYear(), 7, 1)
            : new Date(now.getFullYear(), 0, 1);
        startDate = semesterStart.toISOString().split("T")[0];
        endDate = now.toISOString().split("T")[0];
        break;
      }
      default:
        startDate = "";
        endDate = "";
    }

    setDateRange({ startDate, endDate });
  };

  const exportToExcel = () => {
    if (!analytics || !classData) return;

    const exportData = [
      { Class: classData.name, Code: classData.code },
      { "Attendance Rate": `${attendanceRate}%` },
      { "Total Present": analytics.overallStats?.totalPresent || 0 },
      { "Total Absent": analytics.overallStats?.totalAbsent || 0 },
      { "Total Late": analytics.overallStats?.totalLate || 0 },
      {},
      { "Defaulters (<75%)": "" },
      ...defaulters.map((s) => ({
        Name: s.studentName,
        "Roll No": s.rollNo || "N/A",
        Attendance: `${s.attendancePercentage.toFixed(1)}%`,
        Sessions: `${s.present}/${s.totalSessions}`,
      })),
    ];

    const ws = XLSX.utils.json_to_sheet(exportData, { skipHeader: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analytics");
    XLSX.writeFile(wb, `${classData.code}_Analytics.xlsx`);
  };

  const exportToCSV = () => {
    if (!analytics || !classData) return;

    const exportData = [
      { Class: classData.name, Code: classData.code },
      { "Attendance Rate": `${attendanceRate}%` },
      { "Total Present": analytics.overallStats?.totalPresent || 0 },
      { "Total Absent": analytics.overallStats?.totalAbsent || 0 },
      { "Total Late": analytics.overallStats?.totalLate || 0 },
      {},
      { "Defaulters (<75%)": "" },
      ...defaulters.map((s) => ({
        Name: s.studentName,
        "Roll No": s.rollNo || "N/A",
        Attendance: `${s.attendancePercentage.toFixed(1)}%`,
        Sessions: `${s.present}/${s.totalSessions}`,
      })),
    ];

    const ws = XLSX.utils.json_to_sheet(exportData, { skipHeader: true });
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${classData.code}_Analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch class details
      const classResponse = await classAPI.getClassDetails(classId);
      setClassData(classResponse.data);

      // Fetch analytics
      const analyticsResponse = await analyticsAPI.getClassAnalytics(
        classId,
        period,
        dateRange.startDate,
        dateRange.endDate
      );
      setAnalytics(analyticsResponse.data);

      // Fetch defaulters
      const defaultersResponse = await analyticsAPI.getDefaulters(classId, 75);
      setDefaulters(defaultersResponse.data.defaulters || []);

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setError("Failed to load analytics data");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, period, dateRange]);

  // Prepare pie chart data
  const getPieChartData = () => {
    if (!analytics?.overallStats) return [];

    const { totalPresent, totalAbsent, totalLate } = analytics.overallStats;

    return [
      { name: "Present", value: totalPresent, color: COLORS.present },
      { name: "Absent", value: totalAbsent, color: COLORS.absent },
      { name: "Late", value: totalLate, color: COLORS.late },
    ].filter((item) => item.value > 0);
  };

  // Prepare bar chart data
  const getBarChartData = () => {
    if (!analytics?.trends) return [];

    return analytics.trends.map((trend) => ({
      name: period === "weekly" ? `Week ${trend._id}` : `Month ${trend._id}`,
      Present: trend.present,
      Absent: trend.absent,
      Late: trend.late,
    }));
  };

  const calculateAttendanceRate = () => {
    if (!analytics?.overallStats) return 0;

    const { totalPresent, totalAbsent, totalLate } = analytics.overallStats;
    const total = totalPresent + totalAbsent + totalLate;

    if (total === 0) return 0;
    return Math.round((totalPresent / total) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-error-600 mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const pieData = getPieChartData();
  const barData = getBarChartData();
  const attendanceRate = calculateAttendanceRate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Class Analytics
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {classData?.name} • {classData?.code}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate(`/teacher/class/${classId}`)}
            >
              Back to Class
            </Button>
          </div>

          {/* Date Filter Controls */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDatePreset("thisWeek")}
              >
                This Week
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDatePreset("thisMonth")}
              >
                This Month
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDatePreset("thisSemester")}
              >
                This Semester
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDateRange({ startDate: "", endDate: "" })}
              >
                Clear
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={exportToExcel}>
                📊 Export Excel
              </Button>
              <Button variant="secondary" size="sm" onClick={exportToCSV}>
                📄 Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <h3 className="text-blue-100 text-sm font-medium">
              Attendance Rate
            </h3>
            <p className="text-4xl font-bold mt-2">{attendanceRate}%</p>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <h3 className="text-green-100 text-sm font-medium">
              Total Present
            </h3>
            <p className="text-4xl font-bold mt-2">
              {analytics?.overallStats?.totalPresent || 0}
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <h3 className="text-red-100 text-sm font-medium">Total Absent</h3>
            <p className="text-4xl font-bold mt-2">
              {analytics?.overallStats?.totalAbsent || 0}
            </p>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <h3 className="text-yellow-100 text-sm font-medium">Total Late</h3>
            <p className="text-4xl font-bold mt-2">
              {analytics?.overallStats?.totalLate || 0}
            </p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pie Chart */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Overall Attendance Distribution
            </h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
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
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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

          {/* Bar Chart */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Attendance Trends
              </h2>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Present" fill={COLORS.present} />
                  <Bar dataKey="Absent" fill={COLORS.absent} />
                  <Bar dataKey="Late" fill={COLORS.late} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-12">
                No data available
              </p>
            )}
          </Card>
        </div>

        {/* Defaulters List */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Students Below 75% Attendance
            </h2>
            <span className="px-3 py-1 bg-error-100 text-error-700 rounded-full text-sm font-medium">
              {defaulters.length} Students
            </span>
          </div>

          {defaulters.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-success-600 font-medium text-lg">
                ✓ All students have good attendance!
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Everyone is above 75% threshold
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Roll No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Attendance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sessions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {defaulters.map((student) => (
                    <tr key={student.studentId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.rollNo || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-error-100 text-error-700 rounded">
                          {student.attendancePercentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.present}/{student.totalSessions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <h3 className="text-blue-900 font-semibold mb-2">
            📊 About These Analytics
          </h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Attendance rate is calculated from all completed sessions</li>
            <li>
              • Trends show attendance patterns over time (weekly or monthly)
            </li>
            <li>
              • Students below 75% attendance are flagged as needing attention
            </li>
            <li>• Data updates in real-time as attendance is marked</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
