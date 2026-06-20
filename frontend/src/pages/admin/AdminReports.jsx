import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import analyticsAPI from "../../services/analyticsAPI";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import SortableTable from "../../components/ui/SortableTable";
import DateRangePicker from "../../components/ui/DateRangePicker";
import Modal from "../../components/ui/Modal";

const TABS = [
  { id: "students", label: "Students" },
  { id: "teachers", label: "Teachers" },
  { id: "departments", label: "Departments" },
  { id: "batches", label: "Batches" },
  { id: "sections", label: "Sections" },
  { id: "subjects", label: "Subjects" },
  { id: "classes", label: "Classes" },
  { id: "defaulters", label: "Defaulters" },
];

const AdminReports = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("students");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });

  // Filters state
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [search, setSearch] = useState("");
  
  // Drill-down Modal State
  const [drillDownModal, setDrillDownModal] = useState({ isOpen: false, student: null, loading: false, records: [] });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      // Apply simple text search to whatever is the main field of the tab
      if (search) {
        if (activeTab === "students" || activeTab === "teachers") params.name = search;
        else if (activeTab === "classes" || activeTab === "subjects") params.department = search; // basic fallback
        else params.department = search; // for departments, batches, sections, defaulters
      }

      const res = await analyticsAPI.getAdminReports(activeTab, params);
      
      // Response shape: { students: [], pagination: {} } or similar
      const items = res.data[activeTab] || [];
      setData(items);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      } else {
        setPagination((prev) => ({ ...prev, total: items.length, pages: 1 }));
      }
    } catch (error) {
      console.error(`Failed to fetch ${activeTab} report`, error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.page, pagination.limit, dateRange, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Tab Change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPagination({ page: 1, limit: 50, total: 0, pages: 0 });
    setSearch("");
  };

  // Open Student Drill-Down Modal
  const openDrillDown = async (student) => {
    setDrillDownModal({ isOpen: true, student, loading: true, records: [] });
    try {
      const params = { startDate: dateRange.startDate, endDate: dateRange.endDate };
      const res = await analyticsAPI.getStudentAttendanceDetail(student._id, params);
      setDrillDownModal((prev) => ({ ...prev, loading: false, records: res.data.records }));
    } catch (error) {
      console.error("Failed to load drill-down", error);
      setDrillDownModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Export Current View
  const exportData = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-${activeTab}-report.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Define table columns based on active tab
  const getColumns = () => {
    const commonCols = [
      { key: "totalClasses", label: "Total Classes" },
      { key: "totalPresent", label: "Present", render: (val, row) => row.presentCount || val || 0 },
      { key: "totalAbsent", label: "Absent", render: (val, row) => row.absentCount || val || 0 },
      { key: "totalLeave", label: "Leave", render: (val, row) => row.leaveCount || val || 0 },
      { 
        key: "attendancePercentage", 
        label: "Attendance %",
        render: (val) => (
          <span className={`font-semibold ${val < 75 ? "text-red-600" : "text-green-600"}`}>
            {val}%
          </span>
        )
      }
    ];

    switch (activeTab) {
      case "students":
      case "defaulters":
        return [
          { key: "name", label: "Name" },
          { key: "rollNo", label: "Roll No" },
          { key: "department", label: "Department" },
          { key: "batch", label: "Batch" },
          { key: "semester", label: "Semester" },
          ...commonCols,
          { 
            key: "actions", 
            label: "Actions", 
            sortable: false,
            render: (_, row) => (
              <button 
                onClick={(e) => { e.stopPropagation(); openDrillDown(row); }}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
              >
                View Detail
              </button>
            )
          }
        ];
      case "teachers":
        return [
          { key: "name", label: "Name" },
          { key: "department", label: "Department" },
          { key: "totalClasses", label: "Classes Assigned" },
          { key: "totalStudents", label: "Total Students" },
          { key: "totalSessions", label: "Sessions Conducted" },
          { key: "attendancePercentage", label: "Avg Attendance %", render: (val) => `${val}%` }
        ];
      case "departments":
        return [
          { key: "name", label: "Department" },
          { key: "totalTeachers", label: "Teachers" },
          { key: "totalStudents", label: "Students" },
          { key: "totalClasses", label: "Classes" },
          { key: "attendancePercentage", label: "Avg Attendance %", render: (val) => `${val}%` }
        ];
      case "batches":
        return [
          { key: "name", label: "Batch" },
          { key: "departments", label: "Departments", render: (val) => (val || []).join(", ") },
          { key: "totalStudents", label: "Students" },
          { key: "totalClasses", label: "Classes" },
          { key: "attendancePercentage", label: "Avg Attendance %", render: (val) => `${val}%` }
        ];
      case "sections":
        return [
          { key: "name", label: "Section" },
          { key: "departments", label: "Departments", render: (val) => (val || []).join(", ") },
          { key: "totalStudents", label: "Students" },
          { key: "attendancePercentage", label: "Avg Attendance %", render: (val) => `${val}%` }
        ];
      case "subjects":
        return [
          { key: "name", label: "Subject" },
          { key: "departments", label: "Departments", render: (val) => (val || []).join(", ") },
          { key: "totalStudents", label: "Students" },
          { key: "attendancePercentage", label: "Avg Attendance %", render: (val) => `${val}%` }
        ];
      case "classes":
        return [
          { key: "code", label: "Code" },
          { key: "name", label: "Course Name" },
          { key: "teacher", label: "Teacher" },
          { key: "department", label: "Department" },
          { key: "semester", label: "Semester" },
          { key: "totalStudents", label: "Students" },
          { key: "totalSessions", label: "Sessions" },
          { key: "attendancePercentage", label: "Avg Attendance %", render: (val) => `${val}%` }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Report Registrar</h1>
              <p className="mt-1 text-sm text-gray-600">Comprehensive view across all entities</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={exportData}>📥 Export JSON</Button>
              <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex space-x-4 overflow-x-auto pb-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Filters */}
        <Card className="bg-white">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex-1">
              <DateRangePicker 
                startDate={dateRange.startDate} 
                endDate={dateRange.endDate} 
                onChange={setDateRange} 
              />
            </div>
            <div className="w-full md:w-64">
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name/dept..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </Card>

        {/* Data Table */}
        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading data...</div>
          ) : (
            <SortableTable 
              columns={getColumns()} 
              data={data} 
              emptyMessage={`No ${activeTab} found for the selected criteria.`}
            />
          )}
          
          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <div className="flex gap-2">
                <button 
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button 
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>

      </div>

      {/* Drill-Down Modal */}
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drillDownModal.records.map((rec, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">{new Date(rec.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{rec.classCode} - {rec.className}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          rec.status === "Present" ? "bg-green-100 text-green-800" :
                          rec.status === "Absent" ? "bg-red-100 text-red-800" :
                          rec.status === "Leave" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
};

export default AdminReports;
