import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Card from "../ui/Card";

const COLORS = {
  present: "#10b981",
  absent: "#ef4444",
  late: "#f59e0b",
  leave: "#3b82f6"
};

const ReportGraphicalView = ({ data, activeTab }) => {
  // Aggregate overall stats
  const overallStats = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        acc.present += item.presentCount || item.totalPresent || 0;
        acc.absent += item.absentCount || item.totalAbsent || 0;
        acc.late += item.lateCount || item.totalLate || 0;
        acc.leave += item.leaveCount || item.totalLeave || 0;
        return acc;
      },
      { present: 0, absent: 0, late: 0, leave: 0 }
    );
  }, [data]);

  const pieData = [
    { name: "Present", value: overallStats.present, color: COLORS.present },
    { name: "Absent", value: overallStats.absent, color: COLORS.absent },
    { name: "Late", value: overallStats.late, color: COLORS.late },
    { name: "Leave", value: overallStats.leave, color: COLORS.leave },
  ].filter((item) => item.value > 0);

  // Bar chart data for comparing entities
  const barData = useMemo(() => {
    // Limit to top 20 items to prevent overcrowding
    const itemsToProcess = data.slice(0, 20);
    return itemsToProcess.map((item) => ({
      name: item.name || item.code || "Unknown",
      Present: item.presentCount || item.totalPresent || 0,
      Absent: item.absentCount || item.totalAbsent || 0,
      Late: item.lateCount || item.totalLate || 0,
      Leave: item.leaveCount || item.totalLeave || 0,
      AttendancePct: item.attendancePercentage || 0,
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500">No data available to generate charts.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Overall Attendance Distribution */}
      <Card className="bg-white">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Overall Distribution</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, "Sessions"]} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Entity Comparison */}
      <Card className="bg-white">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">
          {activeTab} Comparison (Top 20)
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="Present" stackId="a" fill={COLORS.present} />
              <Bar dataKey="Late" stackId="a" fill={COLORS.late} />
              <Bar dataKey="Leave" stackId="a" fill={COLORS.leave} />
              <Bar dataKey="Absent" stackId="a" fill={COLORS.absent} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Attendance % Comparison */}
      <Card className="bg-white lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">
          {activeTab} Attendance Percentage
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-45} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} formatter={(val) => `${val.toFixed(2)}%`} />
              <Bar dataKey="AttendancePct" name="Attendance %" fill="#4F46E5" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.AttendancePct >= 75 ? "#10b981" : "#ef4444"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default ReportGraphicalView;
