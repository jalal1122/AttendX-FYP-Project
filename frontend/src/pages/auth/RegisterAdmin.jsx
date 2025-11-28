import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authAPI from "../../services/authAPI";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Card from "../../components/ui/Card";

const RegisterAdmin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    adminSecret: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(""); // Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.adminSecret
    ) {
      setError("All fields are required");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await authAPI.createAdmin(
        formData.name,
        formData.email,
        formData.password,
        formData.adminSecret
      );

      // Success toast (you can use a toast library)
      alert("✅ Admin account created successfully! Please login to continue.");

      // Redirect to login
      navigate("/login");
    } catch (err) {
      console.error("Admin creation error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to create admin account. Please check your secret key."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Secret Admin Portal
            </h1>
            <p className="text-gray-600 text-sm">
              Bootstrap the first admin account. Requires secret key.
            </p>
          </div>

          {/* Warning Banner */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800 font-semibold">
                  Restricted Access
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  This page is for initial system setup only. You must know the
                  admin secret key.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
              <p className="text-sm font-medium">❌ {error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter admin name"
              required
              disabled={loading}
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@attendx.com"
              required
              disabled={loading}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Admin Secret Key"
                type={showSecret ? "text" : "password"}
                name="adminSecret"
                value={formData.adminSecret}
                onChange={handleChange}
                placeholder="Enter the secret key from .env"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
              >
                {showSecret ? "🙈" : "🔑"}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                This key is defined in the backend .env file (ADMIN_SECRET)
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Admin..." : "🚀 Create Admin Account"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Login
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-800 font-semibold mb-2">
              💡 Setup Instructions:
            </p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Ensure ADMIN_SECRET is set in backend .env</li>
              <li>Fill the form with admin details</li>
              <li>Enter the correct secret key</li>
              <li>Submit to create the first admin</li>
              <li>Login with the created credentials</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RegisterAdmin;
