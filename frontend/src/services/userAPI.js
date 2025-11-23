import api from "./api";

// User API endpoints (Admin only)
export const userAPI = {
  // Get all users
  getAllUsers: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.role) params.append("role", filters.role);
    if (filters.search) params.append("search", filters.search);

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

  // Create user (with FormData for file upload)
  createUser: async (formData) => {
    const response = await api.post("/user/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

export default userAPI;
