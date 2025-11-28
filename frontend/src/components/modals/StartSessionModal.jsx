import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";

const StartSessionModal = ({ isOpen, onClose, onSubmit, className }) => {
  const [securityConfig, setSecurityConfig] = useState({
    radius: 50,
    qrRefreshRate: 20,
    ipMatchEnabled: true,
    deviceLockEnabled: false,
    manualApproval: false,
  });

  const [type, setType] = useState("Lecture");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ type, securityConfig });
    onClose();
  };

  const handleReset = () => {
    setSecurityConfig({
      radius: 50,
      qrRefreshRate: 20,
      ipMatchEnabled: true,
      deviceLockEnabled: false,
      manualApproval: false,
    });
    setType("Lecture");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Start Session - ${className}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Session Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="Lecture">Lecture</option>
              <option value="Lab">Lab</option>
              <option value="Exam">Exam</option>
            </select>
          </div>

          {/* Geofence Radius */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Geofence Radius: {securityConfig.radius}m
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={securityConfig.radius}
              onChange={(e) =>
                setSecurityConfig({
                  ...securityConfig,
                  radius: parseInt(e.target.value),
                })
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1m (Strict)</span>
              <span>50m (Relaxed)</span>
            </div>
          </div>

          {/* QR Refresh Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QR Code Refresh Rate: {securityConfig.qrRefreshRate}s
            </label>
            <input
              type="range"
              min="5"
              max="60"
              value={securityConfig.qrRefreshRate}
              onChange={(e) =>
                setSecurityConfig({
                  ...securityConfig,
                  qrRefreshRate: parseInt(e.target.value),
                })
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5s (Fast)</span>
              <span>60s (Slow)</span>
            </div>
          </div>

          {/* Security Toggles */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Security Options
            </h4>

            {/* IP Matching */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={securityConfig.ipMatchEnabled}
                onChange={(e) =>
                  setSecurityConfig({
                    ...securityConfig,
                    ipMatchEnabled: e.target.checked,
                  })
                }
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Enforce IP Matching
                </span>
                <p className="text-xs text-gray-500">
                  Students must be on the same network as teacher
                </p>
              </div>
            </label>

            {/* Device Lock */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={securityConfig.deviceLockEnabled}
                onChange={(e) =>
                  setSecurityConfig({
                    ...securityConfig,
                    deviceLockEnabled: e.target.checked,
                  })
                }
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Device Lock (1 Student per Phone)
                </span>
                <p className="text-xs text-gray-500">
                  Prevents buddy punching - one device, one attendance
                </p>
              </div>
            </label>

            {/* Manual Approval */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={securityConfig.manualApproval}
                onChange={(e) =>
                  setSecurityConfig({
                    ...securityConfig,
                    manualApproval: e.target.checked,
                  })
                }
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Require Manual Approval
                </span>
                <p className="text-xs text-gray-500">
                  You must approve each attendance manually (Exam mode)
                </p>
              </div>
            </label>
          </div>

          {/* Preset Buttons */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-600 mb-2">Quick Presets:</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSecurityConfig({
                    radius: 100,
                    qrRefreshRate: 30,
                    ipMatchEnabled: false,
                    deviceLockEnabled: false,
                    manualApproval: false,
                  });
                }}
              >
                🎓 Casual Lecture
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSecurityConfig({
                    radius: 20,
                    qrRefreshRate: 10,
                    ipMatchEnabled: true,
                    deviceLockEnabled: true,
                    manualApproval: true,
                  });
                }}
              >
                📝 Strict Exam
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="flex-1"
          >
            Reset
          </Button>
          <Button type="submit" variant="success" className="flex-1">
            Start Session
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default StartSessionModal;
