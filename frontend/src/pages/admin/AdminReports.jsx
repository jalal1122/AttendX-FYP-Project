import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import analyticsAPI from "../../services/analyticsAPI";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import SortableTable from "../../components/ui/SortableTable";
import DateRangePicker from "../../components/ui/DateRangePicker";
import Modal from "../../components/ui/Modal";
import MultiSelectFilter from "../../components/ui/MultiSelectFilter";
import ReportGraphicalView from "../../components/reports/ReportGraphicalView";

const TABS = [
  { id: "departments", label: "Departments" },
  { id: "batches", label: "Batches" },
  { id: "semesters", label: "Semesters" },
  { id: "sections", label: "Sections" },
  { id: "subjects", label: "Subjects" },
  { id: "teachers", label: "Teachers" },
  { id: "classes", label: "Classes" },
  { id: "students", label: "Students" },
  { id: "defaulters", label: "Defaulters" },
];

const AdminReports = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("departments");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [viewMode, setViewMode] = useState("table");

  // Filters state
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [search, setSearch] = useState("");
  
  const [filters, setFilters] = useState({
    departments: [],
    batches: [],
    sections: [],
    semesters: [],
    threshold: 75,
  });

  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    batches: [],
    sections: [],
    semesters: [
      { value: "1", label: "Semester 1" },
      { value: "2", label: "Semester 2" },
      { value: "3", label: "Semester 3" },
      { value: "4", label: "Semester 4" },
      { value: "5", label: "Semester 5" },
      { value: "6", label: "Semester 6" },
      { value: "7", label: "Semester 7" },
      { value: "8", label: "Semester 8" },
    ]
  });
  
  // Drill-down Modal State
  const [drillDownModal, setDrillDownModal] = useState({ isOpen: false, student: null, loading: false, records: [] });

  // Load Filter Options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [depts, batches, sections] = await Promise.all([
          analyticsAPI.getAdminReports("departments"),
          analyticsAPI.getAdminReports("batches"),
          analyticsAPI.getAdminReports("sections")
        ]);
        
        setFilterOptions(prev => ({
          ...prev,
          departments: (depts.data?.departments || []).map(d => ({ value: d.name, label: d.name })),
          batches: (batches.data?.batches || []).map(b => ({ value: b.name, label: b.name })),
          sections: (sections.data?.sections || []).map(s => ({ value: s.name, label: s.name })),
        }));
      } catch (e) {
        console.error("Failed to load filter options", e);
      }
    };
    loadOptions();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        department: filters.departments.join(","),
        batch: filters.batches.join(","),
        section: filters.sections.join(","),
        semester: filters.semesters.join(","),
      };
      
      if (activeTab === "defaulters") {
        params.threshold = filters.threshold;
      }

      if (search) params.name = search;

      const res = await analyticsAPI.getAdminReports(activeTab, params);
      
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
  }, [activeTab, pagination.page, pagination.limit, dateRange, search, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Tab Change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleFilterChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleDrillDown = (nextTab, filterKey, filterValue) => {
    setFilters(prev => ({ ...prev, [filterKey]: [filterValue] }));
    handleTabChange(nextTab);
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

  // Export Excel
  const exportExcel = async () => {
    try {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        department: filters.departments.join(","),
        batch: filters.batches.join(","),
        section: filters.sections.join(","),
        semester: filters.semesters.join(","),
      };
      
      if (activeTab === "defaulters") {
        params.threshold = filters.threshold;
      }

      if (search) params.name = search;

      const blob = await analyticsAPI.getAdminReportsExcel(activeTab, params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      const filterParts = [
        filters.departments.length ? filters.departments.join("-") : "",
        filters.batches.length ? filters.batches.join("-") : "",
        filters.sections.length ? filters.sections.join("-") : "",
      ].filter(Boolean);
      const filterName = filterParts.length > 0 ? filterParts.join("_") : "All";

      link.download = `Admin_${activeTab}_Report_${filterName}_${dateStr}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export report. Please try again.");
    }
  };

  // Define table columns based on active tab
  const getColumns = () => {
    const commonCols = [
      { key: "totalClasses", label: "Total Classes" },
      { key: "totalPresent", label: "Present", render: (val, row) => row.presentCount || val || 0 },
      { key: "totalAbsent", label: "Absent", render: (val, row) => row.absentCount || val || 0 },
      { key: "totalLeave", label: "Leave", render: (val, row) => row.leaveCount || val || 0 },
      { key: "totalLate", label: "Late", render: (val, row) => row.lateCount || val || 0 },
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
          { key: "section", label: "Section" },
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
          { 
            key: "name", 
            label: "Department",
            render: (val) => (
              <button onClick={() => handleDrillDown("batches", "departments", val)} className="text-primary-600 font-medium hover:underline text-left">
                {val}
              </button>
            )
          },
          { key: "totalTeachers", label: "Teachers" },
          { key: "totalStudents", label: "Students" },
          { key: "totalClasses", label: "Classes" },
          { key: "attendancePercentage", label: "Avg Attendance %", render: (val) => `${val}%` }
        ];
      case "batches":
        return [
          { 
            key: "name", 
            label: "Batch",
            render: (val) => (
              <button onClick={() => handleDrillDown("sections", "batches", val)} className="text-primary-600 font-medium hover:underline text-left">
                {val}
              </button>
            )
          },
          { key: "totalClasses", label: "Classes" },
          { key: "totalStudents", label: "Students" },
          { key: "attendancePercentage", label: "Avg Attendance %", render: (val) => `${val}%` }
        ];
      case "semesters":
        return [
          { 
            key: "name", 
            label: "Semester",
            render: (val) => (
              <button onClick={() => {
                const num = val.replace("Semester ", "");
                handleDrillDown("classes", "semesters", num);
              }} className="text-primary-600 font-medium hover:underline text-left">
                {val}
              </button>
            )
          },
          { key: "totalClasses", label: "Classes" },
          { key: "totalStudents", label: "Students" },
          { key: "attendancePercentage", label: "Avg Attendance %", render: (val) => `${val}%` }
        ];
      case "sections":
        return [
          { 
            key: "name", 
            label: "Section",
            render: (val) => (
              <button onClick={() => handleDrillDown("subjects", "sections", val)} className="text-primary-600 font-medium hover:underline text-left">
                {val}
              </button>
            )
          },
          { key: "departments", label: "Departments", render: (val) => (val || []).join(", ") },
          { key: "batches", label: "Batches", render: (val) => (val || []).join(", ") },
          { key: "totalStudents", label: "Students" },
          { key: "totalClasses", label: "Classes" },
          { key: "attendancePercentage", label: "Avg Attendance %", render: (val) => `${val}%` }
        ];
      case "subjects":
        return [
          { 
            key: "name", 
            label: "Subject",
            render: (val) => (
              <button onClick={() => { setSearch(val); handleTabChange("classes"); }} className="text-primary-600 font-medium hover:underline text-left">
                {val}
              </button>
            )
          },
          { key: "departments", label: "Departments", render: (val) => (val || []).join(", ") },
          { key: "batches", label: "Batches", render: (val) => (val || []).join(", ") },
          { key: "totalStudents", label: "Students" },
          { key: "totalClasses", label: "Classes" },
          { key: "attendancePercentage", label: "Avg Attendance %", render: (val) => `${val}%` }
        ];
      case "classes":
        return [
          { 
            key: "code", 
            label: "Code"
          },
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
              <p className="mt-1 text-sm text-gray-600">Comprehensive view across all entities with Hierarchical Drill-Down</p>
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button 
                  onClick={() => setViewMode("table")} 
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === "table" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Table View
                </button>
                <button 
                  onClick={() => setViewMode("graphical")} 
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === "graphical" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Graphical View
                </button>
              </div>
              <Button variant="primary" onClick={exportExcel}>📥 Export Excel</Button>
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
        
        {/* Filters Panel */}
        <Card className="bg-white">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Report Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MultiSelectFilter
              label="Departments"
              options={filterOptions.departments}
              selected={filters.departments}
              onChange={(val) => handleFilterChange("departments", val)}
              placeholder="All Departments"
            />
            <MultiSelectFilter
              label="Batches"
              options={filterOptions.batches}
              selected={filters.batches}
              onChange={(val) => handleFilterChange("batches", val)}
              placeholder="All Batches"
            />
            <MultiSelectFilter
              label="Sections"
              options={filterOptions.sections}
              selected={filters.sections}
              onChange={(val) => handleFilterChange("sections", val)}
              placeholder="All Sections"
            />
            <MultiSelectFilter
              label="Semesters"
              options={filterOptions.semesters}
              selected={filters.semesters}
              onChange={(val) => handleFilterChange("semesters", val)}
              placeholder="All Semesters"
              searchable={false}
            />
            {activeTab === "defaulters" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Threshold (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.threshold}
                  onChange={(e) => handleFilterChange("threshold", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <DateRangePicker 
                startDate={dateRange.startDate} 
                endDate={dateRange.endDate} 
                onChange={setDateRange} 
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-4">
            <div className="w-full md:w-96 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, code..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
            
            <Button 
              variant="secondary" 
              onClick={() => {
                setFilters({ departments: [], batches: [], sections: [], semesters: [], threshold: 75 });
                setSearch("");
                setDateRange({ startDate: "", endDate: "" });
              }}
              className="text-sm"
            >
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Summary Stats */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white border border-gray-100 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 capitalize">Total {activeTab}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{pagination.total}</p>
            </Card>
            {data.length > 0 && data[0].hasOwnProperty('attendancePercentage') && (
               <Card className="bg-white border border-gray-100 shadow-sm">
                 <h3 className="text-sm font-medium text-gray-500">Avg Attendance (Current Page)</h3>
                 <p className="text-2xl font-bold text-gray-900 mt-1">
                   {(data.reduce((sum, item) => sum + (item.attendancePercentage || 0), 0) / data.length).toFixed(1)}%
                 </p>
               </Card>
            )}
            {data.length > 0 && data[0].hasOwnProperty('defaulters') && (
               <Card className="bg-white border border-gray-100 shadow-sm">
                 <h3 className="text-sm font-medium text-gray-500">Total Defaulters (Current Page)</h3>
                 <p className="text-2xl font-bold text-red-600 mt-1">
                   {data.reduce((sum, item) => sum + (item.defaulters || 0), 0)}
                 </p>
               </Card>
            )}
          </div>
        )}

        {/* Data Table */}
        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              Loading report data...
            </div>
          ) : viewMode === "graphical" ? (
            <div className="p-6 bg-gray-50">
              <ReportGraphicalView data={data} activeTab={activeTab} />
            </div>
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
                Showing page <span className="font-medium text-gray-900">{pagination.page}</span> of <span className="font-medium text-gray-900">{pagination.pages}</span> ({pagination.total} total)
              </span>
              <div className="flex gap-2">
                <button 
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 shadow-sm"
                >
                  Previous
                </button>
                <button 
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 shadow-sm"
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
          <div className="py-12 flex justify-center">
             <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            {drillDownModal.records.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No attendance records found for the selected period.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drillDownModal.records.map((rec, idx) => {
                     const dateObj = new Date(rec.date);
                     const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                     return (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{dateObj.toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{timeStr}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{rec.classCode} - {rec.className}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2.5 py-1 text-xs rounded-full font-medium ${
                            rec.status === "Present" ? "bg-green-100 text-green-800" :
                            rec.status === "Absent" ? "bg-red-100 text-red-800" :
                            rec.status === "Leave" ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {rec.status}
                          </span>
                        </td>
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

export default AdminReports;
