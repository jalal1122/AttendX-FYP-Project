import api from "./api";

// User API endpoints (Admin only)
export const userAPI = {
  // Get all users
  getAllUsers: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.role) params.append("role", filters.role);
    if (filters.search) params.append("search", filters.search);
    if (filters.department) params.append("department", filters.department);
    if (filters.semester) params.append("semester", filters.semester);
    if (filters.batch) params.append("batch", filters.batch);
    if (filters.year) params.append("year", filters.year);
    if (filters.name) params.append("name", filters.name);
    if (filters.email) params.append("email", filters.email);
    if (filters.rollNo) params.append("rollNo", filters.rollNo);

    const response = await api.get(`/user/all?${params.toString()}`);
    return response.data;
  },

  // Get user statistics
  getUserStats: async () => {
    const response = await api.get("/user/stats");
    return response.data;
  },

  // Get user details
  getUserDetails: async (userId) => {
    const response = await api.get(`/user/${userId}`);
    return response.data;
  },

  // Update user details (name, mobileNumber, info)
  updateUser: async (userId, userData) => {
    const response = await api.put(`/user/${userId}`, userData);
    return response.data;
  },

  // Update user role
  updateUserRole: async (userId, role) => {
    const response = await api.patch(`/user/${userId}/role`, { role });
    return response.data;
  },

  // Delete user
  deleteUser: async (userId) => {
    const response = await api.delete(`/user/${userId}`);
    return response.data;
  },

  // Reset user device binding
  resetUserDevice: async (userId) => {
    const response = await api.post(`/user/${userId}/reset-device`);
    return response.data;
  },

  // Create user (with FormData for file upload)
  createUser: async (formData) => {
    const response = await api.post("/user/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Bulk create student users from a spreadsheet
  bulkCreateStudents: async (formData) => {
    const response = await api.post("/user/bulk-students", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

export default userAPI;
