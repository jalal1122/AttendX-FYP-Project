import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import TwoFactorSettings from "../../components/settings/TwoFactorSettings";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Profile & Settings
            </h1>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <Card>
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl font-bold text-primary-600">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {user.name}
                </h2>
                <p className="text-gray-600 mb-2">{user.email}</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    user.role === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : user.role === "teacher"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                </span>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Account Information
                </h3>
                <dl className="space-y-2">
                  {user.info?.rollNo && (
                    <div>
                      <dt className="text-sm text-gray-600">Roll Number</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {user.info.rollNo}
                      </dd>
                    </div>
                  )}
                  {user.info?.department && (
                    <div>
                      <dt className="text-sm text-gray-600">Department</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {user.info.department}
                      </dd>
                    </div>
                  )}
                  {user.info?.semester && (
                    <div>
                      <dt className="text-sm text-gray-600">Semester</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        Semester {user.info.semester}
                      </dd>
                    </div>
                  )}
                  {user.info?.batch && (
                    <div>
                      <dt className="text-sm text-gray-600">Batch</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {user.info.batch}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </Card>
          </div>

          {/* Security Settings */}
          <div className="lg:col-span-2">
            <TwoFactorSettings />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
