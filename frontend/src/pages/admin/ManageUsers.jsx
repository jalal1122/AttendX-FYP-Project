import { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import userAPI from "../../services/userAPI";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import CreateUserModal from "../../components/modals/CreateUserModal";
import {
  DEPARTMENT_OPTIONS,
  SEMESTER_OPTIONS,
  getBatchOptions,
} from "../../constants/academicOptions";

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({
    name: "",
    email: "",
    rollNo: "",
    department: "",
    semester: "",
    batch: "",
    year: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalMode, setCreateModalMode] = useState("single");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    mobileNumber: "",
    info: {},
  });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [roleModalNewRole, setRoleModalNewRole] = useState("student");

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const filtersStateMap = (state) => ({
    name: state.name?.trim(),
    email: state.email?.trim(),
    rollNo: state.rollNo?.trim(),
    department: state.department?.trim(),
    semester: state.semester?.trim(),
    batch: state.batch?.trim(),
    year: state.year?.trim(),
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const query = {};
      if (activeTab !== "all") query.role = activeTab;

      const activeFilters = filtersStateMap(filters);
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) query[key] = value;
      });

      const response = await userAPI.getAllUsers(query);
      setUsers(response.data.users || []);
      response.data.users;
    } catch (error) {
      console.error("Error fetching users:", error);
      setMessage({ type: "error", text: "Failed to load users" });
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}?`)) {
      return;
    }

    try {
      await userAPI.deleteUser(userId);
      setMessage({ type: "success", text: "User deleted successfully" });
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to delete user",
      });
    }
  };

  const handleResetDevice = async (userId, userName) => {
    if (
      !window.confirm(
        `Reset device binding for ${userName}? They will be able to bind a new device on next attendance.`,
      )
    ) {
      return;
    }

    try {
      await userAPI.resetUserDevice(userId);
      setMessage({
        type: "success",
        text: "Device binding reset successfully",
      });
    } catch (error) {
      console.error("Error resetting user device:", error);
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Failed to reset user device binding",
      });
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || "",
      mobileNumber: user.mobileNumber || "",
      info: {
        rollNo: user.info?.rollNo || "",
        semester: user.info?.semester || "",
        department: user.info?.department || "",
        ...user.info,
      },
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    try {
      await userAPI.updateUser(editingUser._id, editFormData);
      setMessage({ type: "success", text: "User updated successfully" });
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update user",
      });
    }
  };

  const handleRoleChangeClick = (user) => {
    setRoleModalUser(user);
    setRoleModalNewRole(user.role);
    setShowRoleModal(true);
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    if (!roleModalUser || roleModalNewRole === roleModalUser.role) {
      setShowRoleModal(false);
      return;
    }

    try {
      await userAPI.updateUserRole(roleModalUser._id, roleModalNewRole);
      setMessage({ type: "success", text: "User role updated successfully" });
      setShowRoleModal(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update role",
      });
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700";
      case "teacher":
        return "bg-blue-100 text-blue-700";
      case "student":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                User Management
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage all users in the system
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  setCreateModalMode("single");
                  setShowCreateModal(true);
                }}
              >
                + Create User
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateModalMode("bulk");
                  setShowCreateModal(true);
                }}
              >
                Bulk Student Import
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/admin/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message.text && (
          <div
            className={`mb-4 p-4 rounded-md ${
              message.type === "error"
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Role tabs */}
        <Card className="mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                activeTab === "all"
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              All Users
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                activeTab === "admin"
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              Admins
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("student")}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                activeTab === "student"
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              Students
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("teacher")}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                activeTab === "teacher"
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              Teachers
            </button>
          </div>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => updateFilter("name", e.target.value)}
                placeholder="Filter by name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="text"
                value={filters.email}
                onChange={(e) => updateFilter("email", e.target.value)}
                placeholder="Filter by email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Roll Number
              </label>
              <input
                type="text"
                value={filters.rollNo}
                onChange={(e) => updateFilter("rollNo", e.target.value)}
                placeholder="Filter by roll number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) => updateFilter("department", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All departments</option>
                {DEPARTMENT_OPTIONS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semester
              </label>
              <select
                value={filters.semester}
                onChange={(e) => updateFilter("semester", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All semesters</option>
                {SEMESTER_OPTIONS.map((semester) => (
                  <option key={semester} value={semester}>
                    {semester}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch
              </label>
              <select
                value={filters.batch}
                onChange={(e) => updateFilter("batch", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All batches</option>
                {getBatchOptions().map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <input
                type="text"
                value={filters.year}
                onChange={(e) => updateFilter("year", e.target.value)}
                placeholder="Filter by year"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveTab("all");
                setFilters({
                  name: "",
                  email: "",
                  rollNo: "",
                  department: "",
                  semester: "",
                  batch: "",
                  year: "",
                });
              }}
            >
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Users Table */}
        {loading ? (
          <Card>
            <p className="text-center text-gray-500 py-8">Loading users...</p>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">No users found</p>
          </Card>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 break-all">
                      {user._id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getRoleBadgeColor(
                          user.role,
                        )}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.info?.semester
                        ? `Semester ${user.info.semester}`
                        : user.info?.department || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-primary-600 hover:text-primary-800 inline-flex items-center"
                        title="Edit user"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRoleChangeClick(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Role
                      </button>
                      <button
                        onClick={() => handleResetDevice(user._id, user.name)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Reset device binding"
                      >
                        Reset Device
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id, user.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create User Modal */}
        <CreateUserModal
          isOpen={showCreateModal}
          initialMode={createModalMode}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setMessage({ type: "success", text: "User created successfully" });
            fetchUsers();
          }}
        />

        {/* Edit User Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          title="Edit User"
        >
          <form onSubmit={handleUpdateUser}>
            <div className="space-y-4">
              <Input
                label="User ID"
                value={editingUser?._id || ""}
                disabled
                className="bg-gray-100 cursor-not-allowed break-all"
              />

              {/* Email (Read-only) */}
              <Input
                label="Email (Cannot be changed)"
                value={editingUser?.email || ""}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />

              {/* Name */}
              <Input
                label="Name"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                required
              />

              {/* Mobile Number */}
              <Input
                label="Mobile Number"
                value={editFormData.mobileNumber}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    mobileNumber: e.target.value,
                  })
                }
              />

              {/* Role-specific fields */}
              {editingUser?.role === "student" && (
                <>
                  <Input
                    label="Roll Number"
                    value={editFormData.info?.rollNo || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        info: { ...editFormData.info, rollNo: e.target.value },
                      })
                    }
                  />
                  <Input
                    label="Semester"
                    type="number"
                    min="1"
                    max="8"
                    value={editFormData.info?.semester || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        info: {
                          ...editFormData.info,
                          semester: e.target.value,
                        },
                      })
                    }
                  />
                </>
              )}

              {(editingUser?.role === "teacher" ||
                editingUser?.role === "admin") && (
                <Input
                  label="Department"
                  value={editFormData.info?.department || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      info: {
                        ...editFormData.info,
                        department: e.target.value,
                      },
                    })
                  }
                />
              )}

              <p className="text-xs text-gray-500">
                Note: Email and password cannot be changed here. Users must use
                the password reset feature to change their password.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>

        {/* Role Change Modal */}
        <Modal
          isOpen={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setRoleModalUser(null);
          }}
          title="Change User Role"
        >
          <form onSubmit={handleRoleSubmit}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Change role for <strong>{roleModalUser?.name}</strong>. Current role is <strong>{roleModalUser?.role}</strong>.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Role
                </label>
                <select
                  value={roleModalNewRole}
                  onChange={(e) => setRoleModalNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowRoleModal(false);
                  setRoleModalUser(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                Update Role
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default ManageUsers;
