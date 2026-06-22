import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import axios from "axios";
import { useSelector } from "react-redux";

const ExportModal = ({ isOpen, onClose, defaultType = null, defaultTargetId = null }) => {
  const { token } = useSelector((state) => state.auth);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [reportType, setReportType] = useState(defaultType || "class_matrix");
  const [range, setRange] = useState("semester");
  const format = "xlsx"; // Always Excel
  const [targetId, setTargetId] = useState(defaultTargetId || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const reportTypes = [
    {
      value: "class_matrix",
      label: "Class Attendance Register",
      description: "Detailed attendance matrix for a class (Students × Dates)",
      needsTarget: "classId",
    },
    {
      value: "dept_summary",
      label: "Department Summary",
      description: "Attendance statistics grouped by department",
      needsTarget: false,
    },
  ];

  const ranges = [
    { value: "week", label: "Last 7 Days" },
    { value: "month", label: "Last 30 Days" },
    { value: "semester", label: "Current Semester" },
    { value: "custom", label: "Custom Date Range" },
  ];

  const selectedReportType = reportTypes.find((r) => r.value === reportType);

  const handleNext = () => {
    setError("");
    
    if (step === 1) {
      if (selectedReportType.needsTarget && !targetId) {
        setError(`Please enter ${selectedReportType.needsTarget === "classId" ? "Class ID" : "Student ID"}`);
        return;
      }
      if (range === "custom" && (!startDate || !endDate)) {
        setError("Please select both start and end dates");
        return;
      }
      // Skip step 3 (format selection) since we only have Excel
      handleGenerate();
    }
  };

  const handleBack = () => {
    setError("");
    setStep(step - 1);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");

    try {
      // Build query params
      const params = {
        type: reportType,
        format,
        range,
      };

      if (selectedReportType.needsTarget) {
        params.targetId = targetId;
      }

      if (range === "custom") {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      // Make API call
      const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
      const response = await axios.get(`${baseURL}/analytics/export`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob", // Important for file download
      });

      // Create blob and download
      const blob = new Blob([response.data], {
        type: format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers["content-disposition"];
      let filename = `CSIT_Attendance_Report_${Date.now()}.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Success - close modal
      setLoading(false);
      onClose();
      
      // Reset form
      setStep(1);
      setReportType(defaultType || "class_matrix");
      setRange("semester");
      setTargetId(defaultTargetId || "");
      setStartDate("");
      setEndDate("");
    } catch (err) {
      console.error("Export error:", err);
      setError(err.response?.data?.message || "Failed to generate report. Please try again.");
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Step 1: Select Report Type
      </h3>

      <div className="space-y-3">
        {reportTypes.map((type) => (
          <div
            key={type.value}
            onClick={() => setReportType(type.value)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              reportType === type.value
                ? "border-primary-500 bg-primary-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-start">
              <input
                type="radio"
                checked={reportType === type.value}
                onChange={() => setReportType(type.value)}
                className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <div className="ml-3 flex-1">
                <label className="block text-sm font-medium text-gray-900 cursor-pointer">
                  {type.label}
                </label>
                <p className="text-sm text-gray-500 mt-1">{type.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedReportType?.needsTarget && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {selectedReportType.needsTarget === "classId" ? "Class ID" : "Student ID"} *
          </label>
          <input
            type="text"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder={`Enter ${selectedReportType.needsTarget === "classId" ? "Class" : "Student"} ID`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            {selectedReportType.needsTarget === "classId"
              ? "You can find this in the Class Details page URL"
              : "You can find this in the user profile or Manage Users page"}
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Step 2: Select Date Range
      </h3>

      <div className="space-y-3">
        {ranges.map((r) => (
          <div
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
              range === r.value
                ? "border-primary-500 bg-primary-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                checked={range === r.value}
                onChange={() => setRange(r.value)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <label className="ml-3 block text-sm font-medium text-gray-900 cursor-pointer">
                {r.label}
              </label>
            </div>
          </div>
        ))}
      </div>

      {range === "custom" && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Summary */}
      {renderStep2Summary()}
    </div>
  );

  const renderStep2Summary = () => (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="text-sm font-semibold text-blue-900 mb-2">📋 Report Summary</h4>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>
          <strong>Type:</strong> {selectedReportType?.label}
        </li>
        <li>
          <strong>Range:</strong> {ranges.find((r) => r.value === range)?.label}
        </li>
        <li>
          <strong>Format:</strong> Excel (.xlsx) with beautiful styling
        </li>
        {selectedReportType?.needsTarget && targetId && (
          <li>
            <strong>Target ID:</strong> {targetId}
          </li>
        )}
      </ul>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Excel Report">
      <div className="min-h-[400px]">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold ${
                  step >= s
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-400 border-gray-300"
                }`}
              >
                {s}
              </div>
              {s < 2 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > s ? "bg-primary-600" : "bg-gray-300"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="mb-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="secondary"
            onClick={step === 1 ? onClose : handleBack}
            disabled={loading}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          <Button variant="primary" onClick={handleNext} disabled={loading}>
            {loading ? "Generating Excel..." : step === 1 ? "Next" : "Generate Excel Report"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportModal;
