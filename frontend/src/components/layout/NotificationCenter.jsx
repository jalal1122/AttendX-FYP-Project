import { useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertCircle, Info, Clock } from "lucide-react";
import moment from "moment";

/**
 * Notification Center Component
 * Displays recent alerts and notifications
 */
const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("csit_attendance_notifications");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
        setUnreadCount(parsed.filter((n) => !n.read).length);
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("csit_attendance_notifications", JSON.stringify(notifications));
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-sky-500" />;
    }
  };

  const getBackgroundColor = (type, read) => {
    if (read) return "bg-slate-50";
    switch (type) {
      case "success":
        return "bg-emerald-50";
      case "warning":
        return "bg-amber-50";
      case "error":
        return "bg-rose-50";
      case "info":
      default:
        return "bg-sky-50";
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors duration-200"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-rose-500 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Notification Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-slate-100 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-500">
                    {unreadCount} unread
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-sky-500 hover:text-sky-600 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No notifications</p>
                  <p className="text-sm text-slate-400 mt-1">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 transition-colors duration-200 hover:bg-slate-50 ${
                        getBackgroundColor(notification.type, notification.read)
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              notification.read
                                ? "text-slate-600"
                                : "text-slate-900 font-medium"
                            }`}
                          >
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <p className="text-xs text-slate-400">
                              {moment(notification.timestamp).fromNow()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                          className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-slate-100">
                <button
                  onClick={clearAll}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium py-2 hover:bg-slate-50 rounded-lg transition-colors duration-200"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Helper function to add notifications (can be called from anywhere)
export const addNotification = (message, type = "info") => {
  const notification = {
    id: Date.now() + Math.random(),
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const stored = localStorage.getItem("csit_attendance_notifications");
  const existing = stored ? JSON.parse(stored) : [];
  const updated = [notification, ...existing].slice(0, 50); // Keep last 50

  localStorage.setItem("csit_attendance_notifications", JSON.stringify(updated));

  // Dispatch custom event to update UI
  window.dispatchEvent(new Event("csit_attendance_notification_update"));
};

export default NotificationCenter;
