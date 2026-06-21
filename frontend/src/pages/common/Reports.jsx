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
import SortableTable from "../../components/ui/SortableTable";
import Modal from "../../components/ui/Modal";

const COLORS = {
  present: "#10b981",
  absent: "#ef4444",
  late: "#f59e0b",
};

const Reports = () => {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview"); // overview, students, defaulters
  const [classData, setClassData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  
  const [allStudents, setAllStudents] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  
  const [period, setPeriod] = useState("weekly");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Drill-down Modal State
  const [drillDownModal, setDrillDownModal] = useState({ isOpen: false, student: null, loading: false, records: [] });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [classRes, analyticsRes, allStudentsRes, defaultersRes] = await Promise.all([
        classAPI.getClassById(classId),
        analyticsAPI.getClassAnalytics(classId, period, dateRange.startDate, dateRange.endDate),
        analyticsAPI.getDefaulters(classId, 101), // all students
        analyticsAPI.getDefaulters(classId, 75)   // real defaulters
      ]);

      setClassData(classRes.data);
      setAnalytics(analyticsRes.data);
      
      // Defaulters API returns array inside "defaulters" key or similar
      setAllStudents(allStudentsRes.data?.defaulters || allStudentsRes.data || []);
      setDefaulters(defaultersRes.data?.defaulters || defaultersRes.data || []);

      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError("Failed to load analytics data");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchData();
    }
  }, [classId, period, dateRange]);

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
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        endDate = now.toISOString().split("T")[0];
        break;
      }
      case "thisSemester": {
        const month = now.getMonth();
        const semesterStart = month >= 7 ? new Date(now.getFullYear(), 7, 1) : new Date(now.getFullYear(), 0, 1);
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

  const [exporting, setExporting] = useState(false);

  const exportToExcel = async () => {
    if (!classData) return;
    try {
      setExporting(true);
      const blob = await analyticsAPI.exportClassMatrix(
        classId,
        dateRange.startDate,
        dateRange.endDate,
        "xlsx"
      );
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Class_${classData.code || "Report"}_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const getPieChartData = () => {
    if (!analytics?.overallStats) return [];
    return [
      { name: "Present", value: analytics.overallStats.totalPresent, color: COLORS.present },
      { name: "Absent", value: analytics.overallStats.totalAbsent, color: COLORS.absent },
      { name: "Late", value: analytics.overallStats.totalLate, color: COLORS.late },
    ].filter((item) => item.value > 0);
  };

  const getBarChartData = () => {
    if (!analytics?.trends) return [];
    return analytics.trends.map((trend) => {
      const identifier = trend._id || trend.weekNumber || trend.month;
      if (identifier == null) return null;
      return {
        name: period === "weekly" ? `Week ${identifier}` : `Month ${identifier}`,
        Present: trend.present || 0,
        Absent: trend.absent || 0,
        Late: trend.late || 0,
      };
    }).filter(Boolean);
  };

  const calculateAttendanceRate = () => {
    if (!analytics?.overallStats) return 0;
    const { totalPresent, totalAbsent, totalLate } = analytics.overallStats;
    const total = totalPresent + totalAbsent + totalLate;
    return total === 0 ? 0 : Math.round((totalPresent / total) * 100);
  };

  const openDrillDown = async (student) => {
    setDrillDownModal({ isOpen: true, student, loading: true, records: [] });
    try {
      const params = { classId, startDate: dateRange.startDate, endDate: dateRange.endDate };
      const res = await analyticsAPI.getStudentAttendanceDetail(student.studentId || student._id, params);
      setDrillDownModal((prev) => ({ ...prev, loading: false, records: res.data.records }));
    } catch (error) {
      console.error("Failed to load drill-down", error);
      setDrillDownModal((prev) => ({ ...prev, loading: false }));
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading analytics...</p></div>;
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

  const studentColumns = [
    { key: "name", label: "Name" },
    { key: "rollNo", label: "Roll No", render: (_, row) => row.info?.rollNo || "N/A" },
    { key: "totalClasses", label: "Total Sessions" },
    { key: "presentCount", label: "Present" },
    { 
      key: "attendancePercentage", 
      label: "Attendance %",
      render: (val) => (
        <span className={`px-2 py-1 text-xs font-medium rounded ${val >= 75 ? "bg-success-100 text-success-700" : "bg-error-100 text-error-700"}`}>
          {val.toFixed(1)}%
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <button 
          onClick={() => openDrillDown(row)}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
        >
          View Detail
        </button>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Class Analytics</h1>
              <p className="mt-1 text-sm text-gray-600">{classData?.name} • {classData?.code}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" size="sm" onClick={exportToExcel} disabled={exporting}>
                {exporting ? "Exporting..." : "📊 Export Excel"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/teacher/class/${classId}`)}>Back to Class</Button>
            </div>
          </div>

          <div className="mt-6 flex space-x-4 border-b pb-2">
            {[
              { id: "overview", label: "Overview" },
              { id: "students", label: "Students List" },
              { id: "defaulters", label: "Defaulters" },
              { id: "suspicious", label: "Suspicious Sessions" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? "text-primary-600 border-b-2 border-primary-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 items-end mt-4">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDatePreset("thisWeek")}>This Week</Button>
              <Button variant="secondary" size="sm" onClick={() => setDatePreset("thisMonth")}>This Month</Button>
              <Button variant="secondary" size="sm" onClick={() => setDateRange({ startDate: "", endDate: "" })}>Clear</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <h3 className="text-blue-100 text-sm font-medium">Attendance Rate</h3>
                <p className="text-4xl font-bold mt-2">{attendanceRate}%</p>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <h3 className="text-green-100 text-sm font-medium">Total Present</h3>
                <p className="text-4xl font-bold mt-2">{analytics?.overallStats?.totalPresent || 0}</p>
              </Card>
              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                <h3 className="text-red-100 text-sm font-medium">Total Absent</h3>
                <p className="text-4xl font-bold mt-2">{analytics?.overallStats?.totalAbsent || 0}</p>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                <h3 className="text-yellow-100 text-sm font-medium">Total Late</h3>
                <p className="text-4xl font-bold mt-2">{analytics?.overallStats?.totalLate || 0}</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Overall Distribution</h2>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-gray-500 py-12">No data available</p>}
              </Card>

              <Card>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Verification Methods</h2>
                {analytics?.overallStats && (analytics.overallStats.totalQR > 0 || analytics.overallStats.totalManual > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie 
                        data={[
                          { name: "QR Code", value: analytics.overallStats.totalQR, color: "#8b5cf6" },
                          { name: "Manual", value: analytics.overallStats.totalManual, color: "#f59e0b" }
                        ].filter(i => i.value > 0)} 
                        cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value"
                      >
                        {[
                          { name: "QR Code", value: analytics.overallStats.totalQR, color: "#8b5cf6" },
                          { name: "Manual", value: analytics.overallStats.totalManual, color: "#f59e0b" }
                        ].filter(i => i.value > 0).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-gray-500 py-12">No data available</p>}
              </Card>

              {/* Section-wise Breakdown */}
              <Card className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Section-wise Breakdown</h2>
                </div>
                {analytics?.sectionStats && analytics.sectionStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.sectionStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="section" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" name="Present" fill={COLORS.present} />
                      <Bar dataKey="absent" name="Absent" fill={COLORS.absent} />
                      <Bar dataKey="late" name="Late" fill={COLORS.late} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-gray-500 py-12">No section data available</p>}
              </Card>

              <Card className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Attendance Trends</h2>
                  <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
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
                ) : <p className="text-center text-gray-500 py-12">No data available</p>}
              </Card>
            </div>
          </>
        )}

        {activeTab === "students" && (
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-white border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">All Students ({allStudents.length})</h2>
            </div>
            <SortableTable 
              columns={studentColumns} 
              data={allStudents} 
              emptyMessage="No students found for the selected period."
            />
          </Card>
        )}

        {activeTab === "defaulters" && (
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-white border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Students Below 75% Attendance</h2>
              <span className="px-3 py-1 bg-error-100 text-error-700 rounded-full text-sm font-medium">{defaulters.length} Students</span>
            </div>
            {defaulters.length === 0 ? (
              <div className="text-center py-12"><p className="text-success-600 font-medium text-lg">✓ All students have good attendance!</p></div>
            ) : (
              <SortableTable 
                columns={studentColumns} 
                data={defaulters} 
              />
            )}
          </Card>
        )}

        {activeTab === "suspicious" && (
          <Card className="p-0 overflow-hidden border-warning-200">
            <div className="p-4 bg-warning-50 border-b border-warning-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-warning-900">Suspicious Sessions</h2>
                <p className="text-xs text-warning-700 mt-1">Sessions flagged for IP mismatches or geofence anomalies.</p>
              </div>
              <span className="px-3 py-1 bg-warning-200 text-warning-800 rounded-full text-sm font-medium">
                {analytics?.suspiciousRecords?.length || 0} Records
              </span>
            </div>
            {(!analytics?.suspiciousRecords || analytics.suspiciousRecords.length === 0) ? (
              <div className="text-center py-12">
                <p className="text-success-600 font-medium text-lg">✓ No suspicious sessions detected!</p>
              </div>
            ) : (
              <SortableTable 
                columns={[
                  { key: "studentName", label: "Student", render: (_, row) => row.studentId?.name || "Unknown" },
                  { key: "rollNo", label: "Roll No", render: (_, row) => row.studentId?.info?.rollNo || "N/A" },
                  { key: "date", label: "Date", render: (_, row) => new Date(row.date).toLocaleDateString() },
                  { key: "status", label: "Status", render: (val) => (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100">{val}</span>
                  )},
                  { key: "ipAddress", label: "IP Address", render: (_, row) => row.metadata?.ipAddress || "N/A" },
                  { key: "reason", label: "Flag Reason", render: (_, row) => (
                    <span className="text-error-600 text-xs font-semibold">{row.metadata?.flagReason || "Unknown"}</span>
                  )}
                ]} 
                data={analytics.suspiciousRecords} 
              />
            )}
          </Card>
        )}
      </div>

      <Modal 
        isOpen={drillDownModal.isOpen} 
        onClose={() => setDrillDownModal({ ...drillDownModal, isOpen: false })}
        title={drillDownModal.student ? `Attendance Detail: ${drillDownModal.student.name}` : "Attendance Detail"}
        size="lg"
      >
        {drillDownModal.loading ? (
          <p className="text-gray-500 py-4">Loading records...</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            {drillDownModal.records.length === 0 ? (
              <p className="text-gray-500 py-4">No attendance records found for the selected period.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 mt-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Verification</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drillDownModal.records.map((rec, idx) => {
                    const dateObj = new Date(rec.date);
                    const timeStr = rec.time ? new Date(rec.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">{dateObj.toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{timeStr}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{rec.classCode} - {rec.className}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          rec.status === "Present" ? "bg-green-100 text-green-800" :
                          rec.status === "Absent" ? "bg-red-100 text-red-800" :
                          rec.status === "Late" ? "bg-warning-100 text-warning-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 capitalize">{rec.verificationMethod || "Manual"}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Reports;
