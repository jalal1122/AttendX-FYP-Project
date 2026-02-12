import { useState, useEffect } from "react";
import {
  Activity,
  Database,
  Mail,
  Server,
  Wifi,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import moment from "moment";

/**
 * System Health Widget
 * Displays system status and health metrics
 */
const SystemHealthWidget = () => {
  const [systemStats, setSystemStats] = useState({
    serviceStatus: "online",
    databaseStatus: "connected",
    emailsSent: 0,
    systemLoad: "normal",
    uptime: "99.9%",
    lastCheck: new Date().toISOString(),
  });

  // Simulate system health check
  useEffect(() => {
    const checkSystemHealth = () => {
      // In a real app, this would make an API call to /api/v1/system/health
      setSystemStats({
        serviceStatus: "online",
        databaseStatus: "connected",
        emailsSent: parseInt(localStorage.getItem("attendx_emails_sent") || "0"),
        systemLoad: "normal",
        uptime: "99.9%",
        lastCheck: new Date().toISOString(),
      });
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
      case "connected":
      case "normal":
        return "text-emerald-500";
      case "warning":
        return "text-amber-500";
      case "error":
      case "offline":
      case "disconnected":
        return "text-rose-500";
      default:
        return "text-slate-500";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "online":
      case "connected":
      case "normal":
        return <CheckCircle className="w-5 h-5" />;
      case "warning":
        return <AlertCircle className="w-5 h-5" />;
      case "error":
      case "offline":
      case "disconnected":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const healthMetrics = [
    {
      label: "Service Status",
      value: systemStats.serviceStatus,
      icon: <Server className="w-5 h-5" />,
      status: systemStats.serviceStatus,
    },
    {
      label: "Database",
      value: systemStats.databaseStatus,
      icon: <Database className="w-5 h-5" />,
      status: systemStats.databaseStatus,
    },
    {
      label: "System Load",
      value: systemStats.systemLoad,
      icon: <Activity className="w-5 h-5" />,
      status: systemStats.systemLoad,
    },
    {
      label: "Network",
      value: "stable",
      icon: <Wifi className="w-5 h-5" />,
      status: "online",
    },
  ];

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="heading-3">System Health</h3>
            <p className="text-sm text-muted">
              Last checked {moment(systemStats.lastCheck).fromNow()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-online" />
          <span className="text-sm font-medium text-emerald-600">
            All Systems Operational
          </span>
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {healthMetrics.map((metric, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className={`${getStatusColor(metric.status)}`}>
                {metric.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {metric.label}
                </p>
                <p
                  className={`text-xs font-semibold uppercase ${getStatusColor(
                    metric.status
                  )}`}
                >
                  {metric.value}
                </p>
              </div>
            </div>
            <div className={getStatusColor(metric.status)}>
              {getStatusIcon(metric.status)}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-sky-500" />
            <p className="text-2xl font-bold text-slate-900">
              {systemStats.emailsSent}
            </p>
          </div>
          <p className="text-xs text-muted">Emails Sent</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-2xl font-bold text-slate-900">
              {systemStats.uptime}
            </p>
          </div>
          <p className="text-xs text-muted">Uptime</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-amber-500" />
            <p className="text-2xl font-bold text-slate-900 capitalize">
              {systemStats.systemLoad}
            </p>
          </div>
          <p className="text-xs text-muted">Load Status</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">System Performance</p>
          <button className="text-sm text-sky-500 hover:text-sky-600 font-medium transition-colors duration-200">
            View Detailed Logs →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthWidget;
