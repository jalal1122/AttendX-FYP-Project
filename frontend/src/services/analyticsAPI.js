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

  // Get student report for a specific class
  getStudentReport: async (studentId, classId) => {
    const response = await api.get(
      `/analytics/student/${studentId}?classId=${classId}`
    );
    return response.data;
  },

  // Get list of defaulters (students below threshold)
  getDefaulters: async (classId, threshold = 75) => {
    const response = await api.get(
      `/analytics/class/${classId}/defaulters?threshold=${threshold}`
    );
    return response.data;
  },

  // Get teacher statistics
  getTeacherStats: async () => {
    const response = await api.get(`/analytics/teacher/stats`);
    return response.data;
  },
};

export default analyticsAPI;
