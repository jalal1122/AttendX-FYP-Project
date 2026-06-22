import api from "./api";

const analyticsAPI = {
  // Get class analytics with weekly/monthly trends
  getClassAnalytics: async (
    classId,
    period = "weekly",
    startDate = null,
    endDate = null
  ) => {
    let url = `/analytics/class/${classId}?period=${period}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    const response = await api.get(url);
    return response.data;
  },

  // Get student report for a specific class or with range filter
  getStudentReport: async (studentId, rangeOrClassId) => {
    // If rangeOrClassId is a range parameter (week, month, semester, all)
    if (
      ["week", "month", "semester", "all"].includes(rangeOrClassId) ||
      !rangeOrClassId
    ) {
      const range = rangeOrClassId || "all";
      const response = await api.get(
        `/analytics/student/${studentId}?range=${range}`
      );
      return response.data;
    }
    // Otherwise, it's a classId (backward compatibility)
    const response = await api.get(
      `/analytics/student/${studentId}?classId=${rangeOrClassId}`
    );
    return response.data;
  },

  // Export student transcript
  exportStudentReport: async (studentId, format = "xlsx") => {
    const response = await api.get(
      `/analytics/export?type=student_transcript&targetId=${studentId}&format=${format}`,
      { responseType: "blob" }
    );
    return response.data;
  },

  // Export class matrix
  exportClassMatrix: async (classId, startDate, endDate, format = "xlsx") => {
    let url = `/analytics/export?type=class_matrix&targetId=${classId}&format=${format}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    const response = await api.get(url, { responseType: "blob" });
    return response.data;
  },

  // Get list of defaulters (students below threshold)
  getDefaulters: async (classId, threshold = 75) => {
    const response = await api.get(
      `/analytics/class/${classId}/defaulters?minPercentage=${threshold}`
    );
    return response.data;
  },

  // Get class student stats
  getClassStudentStats: async (classId) => {
    const response = await api.get(`/analytics/class/${classId}/students`);
    return response.data;
  },

  // Get teacher statistics
  getTeacherStats: async () => {
    const response = await api.get(`/analytics/teacher/stats`);
    return response.data;
  },

  // Get detailed attendance records for export
  getDetailedAttendance: async (classId, startDate = null, endDate = null) => {
    let url = `/attendance/class/${classId}/detailed`;
    const params = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (params.length > 0) url += `?${params.join("&")}`;
    const response = await api.get(url);
    return response.data;
  },

  // --- Phase 2: Admin Reports ---
  getAdminReports: async (type, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    const response = await api.get(`/analytics/admin/${type}?${query.toString()}`);
    return response.data;
  },

  getStudentAttendanceDetail: async (studentId, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    const response = await api.get(`/analytics/admin/students/${studentId}/attendance?${query.toString()}`);
    return response.data;
  },

  getClassAttendanceDetail: async (classId, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    const response = await api.get(`/analytics/admin/classes/${classId}/attendance?${query.toString()}`);
    return response.data;
  },

  getAdminReportsExcel: async (type, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    query.append("export", "true");
    const response = await api.get(`/analytics/admin/${type}?${query.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

export default analyticsAPI;
