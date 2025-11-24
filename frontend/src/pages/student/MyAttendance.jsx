import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
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
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

const COLORS = {
  present: "#10b981",
  absent: "#ef4444",
  late: "#f59e0b",
};

const MyAttendance = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [range, setRange] = useState("month");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await analyticsAPI.getStudentReport(user._id, range);
      setReportData(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
      setError("Failed to load attendance data");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchAttendanceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, range]);

  const getPieChartData = () => {
    if (!reportData?.overall) return [];

    return [
      {
        name: "Present",
        value: reportData.overall.presentCount,
        color: COLORS.present,
      },
      {
        name: "Absent",
        value: reportData.overall.absentCount,
        color: COLORS.absent,
      },
      {
        name: "Late",
        value: reportData.overall.lateCount,
        color: COLORS.late,
      },
    ].filter((item) => item.value > 0);
  };

  const getBarChartData = () => {
    if (!reportData?.chartData) return [];

    return reportData.chartData.map((item) => ({
      name: new Date(item.name).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      Present: item.present,
      Absent: item.absent,
      Late: item.late,
    }));
  };

  const getStatusBadge = (status) => {
    const badges = {
      Present: "bg-success-100 text-success-700",
      Absent: "bg-error-100 text-error-700",
      Late: "bg-warning-100 text-warning-700",
      Leave: "bg-blue-100 text-blue-700",
    };
    return badges[status] || "bg-gray-100 text-gray-700";
  };

  const getRangeLabel = () => {
    switch (range) {
      case "week":
        return "Last 7 Days";
      case "month":
        return "Last 30 Days";
      case "semester":
        return "This Semester";
      default:
        return "All Time";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading attendance data...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                My Attendance Report
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {reportData?.student?.name} •{" "}
                {reportData?.student?.info?.rollNo}
              </p>
            </div>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>

          {/* Range Filter */}
          <div className="mt-6 flex gap-2">
            {["week", "month", "semester", "all"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  range === r
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {r === "week"
                  ? "Last 7 Days"
                  : r === "month"
                  ? "Last 30 Days"
                  : r === "semester"
                  ? "Semester"
                  : "All Time"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <h3 className="text-sm font-medium text-gray-500">Total Classes</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {reportData?.overall?.totalClasses || 0}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-gray-500">Present</h3>
            <p className="mt-2 text-3xl font-bold text-success-600">
              {reportData?.overall?.presentCount || 0}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-gray-500">Absent</h3>
            <p className="mt-2 text-3xl font-bold text-error-600">
              {reportData?.overall?.absentCount || 0}
            </p>
          </Card>

          <Card>
            <h3 className="text-sm font-medium text-gray-500">Attendance %</h3>
            <p
              className={`mt-2 text-3xl font-bold ${
                (reportData?.overall?.attendancePercentage || 0) >= 75
                  ? "text-success-600"
                  : "text-error-600"
              }`}
            >
              {reportData?.overall?.attendancePercentage?.toFixed(1) || 0}%
            </p>
          </Card>
        </div>

        {/* Warnings */}
        {reportData?.warnings?.hasLowAttendance && (
          <div className="mb-8 p-4 bg-error-50 border border-error-200 rounded-lg">
            <h3 className="text-error-800 font-semibold mb-2">
              ⚠️ Low Attendance Warning
            </h3>
            <p className="text-error-700 text-sm">
              You have low attendance ({" < "}75%) in{" "}
              {reportData.warnings.lowAttendanceSubjects.length} subject(s).
              Please attend classes regularly.
            </p>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Pie Chart */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Overall Distribution ({getRangeLabel()})
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Attendance Trend
            </h2>
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

        {/* Subject-wise Attendance */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Subject-wise Attendance
          </h2>
          {reportData?.subjectWise?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Present
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.subjectWise.map((subject) => (
                    <tr key={subject.classId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {subject.className}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subject.classCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subject.presentCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subject.totalClasses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            subject.attendancePercentage >= 75
                              ? "bg-success-100 text-success-700"
                              : "bg-error-100 text-error-700"
                          }`}
                        >
                          {subject.attendancePercentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No subject data available
            </p>
          )}
        </Card>

        {/* Recent Sessions */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Attendance History
          </h2>
          {reportData?.recentSessions?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.recentSessions.map((session, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(session.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {session.classId?.name || "N/A"}
                        <span className="text-xs text-gray-500 ml-2">
                          ({session.classId?.code})
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(
                            session.status
                          )}`}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {session.sessionId?.startTime
                          ? new Date(
                              session.sessionId.startTime
                            ).toLocaleTimeString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No recent attendance records
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MyAttendance;
