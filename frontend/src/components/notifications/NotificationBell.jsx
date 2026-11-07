import { useState, useRef, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  ShieldAlert,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAlerts } from "../../context/useAlerts";
export const NotificationBell = () => {
  const {
    notifications = [],
    markNotificationRead,
    markAllNotificationsRead,
  } = useAlerts();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const unreadCount = notifications.filter((notification) => !notification.read)
    .length;
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const getNotificationIcon = (type) => {
    const normalizedType = String(type || "info").toLowerCase();
    if (normalizedType === "critical") {
      return <ShieldAlert size={14} color="var(--critical)" />;
    }
    if (normalizedType === "warning") {
      return <AlertTriangle size={14} color="var(--high-risk)" />;
    }
    return <Info size={14} color="var(--info)" />;
  };
  const getTitle = (title) => {
    if (!title) {
      return "Notification";
    }
    if (typeof title === "string") {
      return title;
    }
    return title.en || "Notification";
  };
  const getMessage = (message) => {
    if (!message) {
      return "";
    }
    if (typeof message === "string") {
      return message;
    }
    return message.en || "";
  };
  const getTimestamp = (notification) => {
    const timestamp = notification.timestamp || notification.createdAt;
    if (!timestamp) {
      return "";
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  return (
    <div className="topbar-bell-wrapper" ref={dropdownRef}>
      <button
        className="bell-btn"
        onClick={() => setIsOpen((previous) => !previous)}
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell size={18} />

        {unreadCount > 0 && (
          <span className="bell-unread-dot">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown-tray">
          <div className="dropdown-tray-header">
            <h4>Notifications ({unreadCount} unread)</h4>

            {unreadCount > 0 && (
              <button
                className="btn-ops btn-ops-sm"
                onClick={markAllNotificationsRead}
                title="Mark all notifications as read"
              >
                <CheckCheck size={13} />

                <span>Mark All Read</span>
              </button>
            )}
          </div>

          <div className="dropdown-tray-list">
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                No notifications
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => {
                const notificationId = notification.id || notification._id;
                return (
                  <div
                    key={notificationId}
                    className={`dropdown-item-row ${
                      !notification.read ? "unread" : ""
                    }`}
                    onClick={() => markNotificationRead(notificationId)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      {getNotificationIcon(notification.type)}

                      <strong
                        style={{
                          fontSize: "1.288rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        {getTitle(notification.title)}
                      </strong>
                    </div>

                    <p
                      style={{
                        fontSize: "1.179rem",
                        color: "var(--text-secondary)",
                        margin: "0 0 4px",
                        lineHeight: 1.35,
                      }}
                    >
                      {getMessage(notification.message)}
                    </p>

                    <span
                      style={{
                        fontSize: "1.07rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {getTimestamp(notification)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="dropdown-tray-footer">
            <Link to="/notifications" onClick={() => setIsOpen(false)}>
              View All Notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
export default NotificationBell;
