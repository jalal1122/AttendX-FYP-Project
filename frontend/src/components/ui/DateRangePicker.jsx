import { useState } from "react";

/**
 * Reusable DateRangePicker Component
 * Supports preset ranges (this week, month, year, semester, overall)
 * and custom date selection via two date inputs.
 *
 * Props:
 *   startDate: string (YYYY-MM-DD or "")
 *   endDate: string (YYYY-MM-DD or "")
 *   onChange: ({ startDate: string, endDate: string }) => void
 *   presets?: Array<{ label: string, value: string }>
 *   showPresets?: boolean
 *   className?: string
 */

const DEFAULT_PRESETS = [
  { label: "This Week", value: "thisWeek" },
  { label: "This Month", value: "thisMonth" },
  { label: "This Semester", value: "thisSemester" },
  { label: "This Year", value: "thisYear" },
  { label: "Overall", value: "overall" },
];

const DateRangePicker = ({
  startDate = "",
  endDate = "",
  onChange,
  presets = DEFAULT_PRESETS,
  showPresets = true,
  className = "",
}) => {
  const [activePreset, setActivePreset] = useState(null);

  const handlePreset = (presetValue) => {
    const now = new Date();
    let start, end;

    switch (presetValue) {
      case "thisWeek": {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        start = weekStart.toISOString().split("T")[0];
        end = now.toISOString().split("T")[0];
        break;
      }
      case "thisMonth": {
        start = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        end = now.toISOString().split("T")[0];
        break;
      }
      case "thisSemester": {
        const month = now.getMonth();
        const semesterStart =
          month >= 7
            ? new Date(now.getFullYear(), 7, 1)
            : new Date(now.getFullYear(), 0, 1);
        start = semesterStart.toISOString().split("T")[0];
        end = now.toISOString().split("T")[0];
        break;
      }
      case "thisYear": {
        start = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
        end = now.toISOString().split("T")[0];
        break;
      }
      case "overall":
      default:
        start = "";
        end = "";
        break;
    }

    setActivePreset(presetValue);
    onChange({ startDate: start, endDate: end });
  };

  const handleStartDate = (value) => {
    setActivePreset(null);
    onChange({ startDate: value, endDate });
  };

  const handleEndDate = (value) => {
    setActivePreset(null);
    onChange({ startDate, endDate: value });
  };

  const handleClear = () => {
    setActivePreset(null);
    onChange({ startDate: "", endDate: "" });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Preset Buttons */}
      {showPresets && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePreset(preset.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activePreset === preset.value
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Date Inputs */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={handleClear}
            className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default DateRangePicker;
