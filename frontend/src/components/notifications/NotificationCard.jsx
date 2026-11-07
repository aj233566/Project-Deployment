import {
  Bell,
  Smartphone,
  Mail,
  Send,
  Check,
  Clock,
  Users,
  ShieldAlert,
  AlertTriangle,
  Info,
} from "lucide-react";
export const NotificationCard = ({ notification, onMarkRead }) => {
  const getText = (value) => {
    if (!value) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    return value.en || "";
  };
  const getChannelIcon = (channel) => {
    switch (String(channel || "").toLowerCase()) {
      case "push":
        return <Bell size={13} />;
      case "sms":
        return <Smartphone size={13} />;
      case "email":
        return <Mail size={13} />;
      case "in_app":
      default:
        return <Send size={13} />;
    }
  };
  const getChannelLabel = (channel) => {
    switch (String(channel || "").toLowerCase()) {
      case "push":
        return "Browser Push";
      case "sms":
        return "SMS";
      case "email":
        return "Email";
      case "in_app":
      default:
        return "In-App";
    }
  };
  const getSeverityIcon = (type) => {
    const normalizedType = String(type || "info").toLowerCase();
    if (normalizedType === "critical") {
      return <ShieldAlert size={16} color="var(--critical)" />;
    }
    if (normalizedType === "warning") {
      return <AlertTriangle size={16} color="var(--high-risk)" />;
    }
    return <Info size={16} color="var(--info)" />;
  };
  const getTimestamp = () => {
    const timestamp = notification.timestamp || notification.createdAt;
    if (!timestamp) {
      return "Time unavailable";
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return "Time unavailable";
    }
    return date.toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  };
  const notificationId = notification.id || notification._id;
  return (
    <div className={`notif-feed-card ${!notification.read ? "unread" : ""}`}>
      <div
        style={{
          marginTop: "2px",
        }}
      >
        {getSeverityIcon(notification.type)}
      </div>

      <div className="notif-main-body">
        <div className="notif-title-row">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              className={`notif-channel-badge ${
                notification.channel || "in_app"
              }`}
            >
              {getChannelIcon(notification.channel)}

              <span>{getChannelLabel(notification.channel)}</span>
            </span>

            <h3>{getText(notification.title) || "Notification"}</h3>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {!notification.read && (
              <button
                className="btn-ops btn-ops-sm"
                onClick={() => onMarkRead(notificationId)}
                title="Mark as read"
              >
                <Check size={12} />

                <span>Mark Read</span>
              </button>
            )}
          </div>
        </div>

        <p className="notif-message-text">{getText(notification.message)}</p>

        <div className="notif-meta-row">
          <div className="notif-meta-item">
            <Clock size={12} />

            <span>{getTimestamp()}</span>
          </div>

          {notification.targetAudience && (
            <div className="notif-meta-item">
              <Users size={12} />

              <span>{notification.targetAudience}</span>
            </div>
          )}

          {notification.delivered != null && (
            <div className="notif-meta-item">
              <span
                style={{
                  color: notification.delivered
                    ? "var(--safe)"
                    : "var(--warning)",
                }}
              >
                {notification.delivered ? "Delivered" : "Pending"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default NotificationCard;
