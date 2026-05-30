import { useEffect, useState } from "react";
import Button from "../ui/Button";
import userAPI from "../../services/userAPI";
import {
  DEPARTMENT_OPTIONS,
  SEMESTER_OPTIONS,
  getBatchOptions,
} from "../../constants/academicOptions";

const CreateUserModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "single",
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    rollNo: "",
    section: "",
    semester: "",
    department: "",
    batch: "",
    year: "",
    designation: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [bulkSheet, setBulkSheet] = useState(null);
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError("");
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "student",
      rollNo: "",
      section: "",
      semester: "",
      department: "",
      batch: "",
      year: "",
      designation: "",
    });
    setAvatar(null);
    setBulkSheet(null);
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    setMode(initialMode);
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "section" ? value.toUpperCase() : value,
    });
  };

  const handleFileChange = (e) => {
    setAvatar(e.target.files[0]);
  };

  const handleBulkSheetChange = (e) => {
    setBulkSheet(e.target.files?.[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("email", formData.email);
      data.append("password", formData.password);
      data.append("role", formData.role);

      // Build info object based on role
      const info = {};
      if (formData.role === "student") {
        info.rollNo = formData.rollNo;
        info.section = formData.section || undefined;
        info.semester = parseInt(formData.semester);
        info.department = formData.department;
        info.batch = formData.batch;
        info.year = formData.year;
      } else if (formData.role === "teacher") {
        // allow assigning a default section to a teacher if provided
        if (formData.section) info.section = formData.section;
        info.department = formData.department;
        info.designation = formData.designation;
      }

      data.append("info", JSON.stringify(info));

      if (avatar) {
        data.append("avatar", avatar);
      }

      await userAPI.createUser(data);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!bulkSheet) {
        throw new Error("Please choose an Excel or CSV file");
      }

      const data = new FormData();
      data.append("sheet", bulkSheet);

      await userAPI.bulkCreateStudents(data);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create student accounts",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {mode === "bulk" ? "Bulk Student Creation" : "Create New User"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {mode === "bulk"
                  ? "Upload a spreadsheet to create many student accounts at once."
                  : "Create a single account using the same fields as the user model."}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("single");
                setError("");
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                mode === "single"
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              Single User
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("bulk");
                setError("");
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                mode === "bulk"
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              Bulk Students
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {mode === "single" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="create-user-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name *
                  </label>
                  <input
                    id="create-user-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-user-email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email *
                  </label>
                  <input
                    id="create-user-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-user-password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password *
                  </label>
                  <input
                    id="create-user-password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-user-role"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Role *
                  </label>
                  <select
                    id="create-user-role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {/* Profile Picture */}
              <div>
                <label
                  htmlFor="create-user-avatar"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Profile Picture
                </label>
                <input
                  id="create-user-avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Role-specific fields */}
              {formData.role === "student" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label
                      htmlFor="create-user-rollNo"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Roll Number *
                    </label>
                    <input
                      id="create-user-rollNo"
                      type="text"
                      name="rollNo"
                      value={formData.rollNo}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="create-user-semester"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Semester *
                    </label>
                    <select
                      id="create-user-semester"
                      name="semester"
                      value={formData.semester}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select semester</option>
                      {SEMESTER_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="create-user-department"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Department *
                    </label>
                    <select
                      id="create-user-department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select department</option>
                      {DEPARTMENT_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="create-user-batch"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Batch *
                    </label>
                    <select
                      id="create-user-batch"
                      name="batch"
                      value={formData.batch}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select batch</option>
                      {getBatchOptions().map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="create-user-section"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Section (optional)
                    </label>
                    <input
                      id="create-user-section"
                      type="text"
                      name="section"
                      value={formData.section}
                      onChange={handleChange}
                      placeholder="e.g., A"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="create-user-year"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Year *
                    </label>
                    <input
                      id="create-user-year"
                      type="text"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 2025"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {formData.role === "teacher" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label
                      htmlFor="create-user-teacher-department"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Department *
                    </label>
                    <select
                      id="create-user-teacher-department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select department</option>
                      {DEPARTMENT_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="create-user-designation"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Designation *
                    </label>
                    <input
                      id="create-user-designation"
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Assistant Professor"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-800 mb-2">
                  Required spreadsheet columns
                </p>
                <p>
                  name, email, password, rollNo, semester, department, batch,
                  year
                </p>
                <p className="mt-2">
                  Optional column: section. Use one row per student and keep the
                  first row as the header row.
                </p>
                <a
                  href="/templates/bulk-student-import-sample.xlsx"
                  download
                  className="mt-3 inline-flex text-primary-700 hover:text-primary-900 font-medium"
                >
                  Download sample Excel template
                </a>
              </div>

              <div>
                <label
                  htmlFor="bulk-student-sheet"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Excel / CSV File *
                </label>
                <input
                  id="bulk-student-sheet"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBulkSheetChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {bulkSheet && (
                  <p className="mt-2 text-xs text-gray-500">
                    Selected file: {bulkSheet.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? "Creating Students..." : "Create Student Accounts"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateUserModal;
