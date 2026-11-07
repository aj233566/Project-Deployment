import { useState } from "react";
import { Bell, CheckCheck, Plus, Search, Send } from "lucide-react";
import { useAlerts } from "../../context/useAlerts";
import NotificationCard from "./NotificationCard";
import ChannelConfig from "./ChannelConfig";
import Modal from "../common/Modal";
import "../../css/notifications.css";
export const NotificationCenter = () => {
  const {
    notifications = [],
    markNotificationRead,
    markAllNotificationsRead,
    sendCustomNotification,
  } = useAlerts();
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTitle, setComposeTitle] = useState("");
  const [composeMessage, setComposeMessage] = useState("");
  const [composeChannel, setComposeChannel] = useState("in_app");
  const [composeType, setComposeType] = useState("warning");
  const [composeTarget, setComposeTarget] = useState("All NER Responders");
  const filteredNotifs = notifications.filter((notification) => {
    if (channelFilter !== "ALL" && notification.channel !== channelFilter) {
      return false;
    }
    if (showUnreadOnly && notification.read) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const title =
        typeof notification.title === "string"
          ? notification.title
          : notification.title?.en || "";
      const message =
        typeof notification.message === "string"
          ? notification.message
          : notification.message?.en || "";
      const target = notification.targetAudience || "";
      const searchableText = `${title} ${message} ${target}`.toLowerCase();
      return searchableText.includes(term);
    }
    return true;
  });
  const unreadCount = notifications.filter((notification) => !notification.read)
    .length;
  const handleSendBroadcast = async (event) => {
    event.preventDefault();
    const title = composeTitle.trim();
    const message = composeMessage.trim();
    if (!title || !message) {
      return;
    }
    try {
      await sendCustomNotification({
        channel: composeChannel,
        type: composeType,
        title,
        message,
        targetAudience: composeTarget,
      });
      setComposeTitle("");
      setComposeMessage("");
      setComposeChannel("in_app");
      setComposeType("warning");
      setComposeTarget("All NER Responders");
      setIsComposeOpen(false);
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };
  return (
    <div className="container-fluid p-0 notif-hub-container">

      <ChannelConfig />


      <div className="ops-panel">
        <div className="ops-panel-header">
          <div>
            <h2 className="ops-panel-title">
              <Bell size={18} color="var(--info)" />

              <span>Notification Center</span>
            </h2>
          </div>

          <div className="d-flex align-items-center gap-2">
            {unreadCount > 0 && (
              <button
                className="btn-ops btn-ops-sm"
                onClick={markAllNotificationsRead}
              >
                <CheckCheck size={13} />

                <span>Mark All Read ({unreadCount})</span>
              </button>
            )}

            <button
              className="btn-ops btn-ops-sm btn-ops-primary"
              onClick={() => setIsComposeOpen(true)}
            >
              <Plus size={13} />

              <span>New Broadcast</span>
            </button>
          </div>
        </div>


        <div className="alert-filter-bar d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div className="filter-left-group d-flex align-items-center flex-wrap gap-2">
            <button
              className={`filter-chip-btn ${
                channelFilter === "ALL" ? "active" : ""
              }`}
              onClick={() => setChannelFilter("ALL")}
            >
              All Channels ({notifications.length})
            </button>

            <button
              className={`filter-chip-btn ${
                channelFilter === "in_app" ? "active" : ""
              }`}
              onClick={() => setChannelFilter("in_app")}
            >
              In-App
            </button>

            <button
              className={`filter-chip-btn ${
                channelFilter === "browser" ? "active" : ""
              }`}
              onClick={() => setChannelFilter("browser")}
            >
              Browser Push
            </button>

            <button
              className={`filter-chip-btn ${showUnreadOnly ? "active" : ""}`}
              onClick={() => setShowUnreadOnly((previous) => !previous)}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div
            style={{
              position: "relative",
              width: "220px",
              maxWidth: "100%",
            }}
          >
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "11px",
                color: "var(--text-muted)",
              }}
            />

            <input
              type="text"
              className="ops-input"
              style={{
                paddingLeft: "32px",
              }}
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>


        {filteredNotifs.length === 0 ? (
          <div className="ops-card text-center p-4 text-muted-custom">
            <Bell size={28} className="mb-2 opacity-50" />

            <p className="m-0">No notifications found.</p>
          </div>
        ) : (
          <div className="notif-list-container">
            {filteredNotifs.map((notification) => {
              const notificationId = notification.id || notification._id;
              return (
                <NotificationCard
                  key={notificationId}
                  notification={notification}
                  onMarkRead={markNotificationRead}
                />
              );
            })}
          </div>
        )}
      </div>


      <Modal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        title="New Notification Broadcast"
      >
        <form onSubmit={handleSendBroadcast}>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="broadcast-form-group">
                <label>Delivery Channel</label>

                <select
                  className="ops-select"
                  value={composeChannel}
                  onChange={(event) => setComposeChannel(event.target.value)}
                >
                  <option value="in_app">In-App Notification</option>

                  <option value="browser">Browser Push</option>
                </select>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="broadcast-form-group">
                <label>Severity Level</label>

                <select
                  className="ops-select"
                  value={composeType}
                  onChange={(event) => setComposeType(event.target.value)}
                >
                  <option value="critical">Critical</option>

                  <option value="warning">Warning</option>

                  <option value="info">Informational</option>
                </select>
              </div>
            </div>

            <div className="col-12">
              <div className="broadcast-form-group">
                <label>Target Audience</label>

                <input
                  type="text"
                  className="ops-input"
                  value={composeTarget}
                  onChange={(event) => setComposeTarget(event.target.value)}
                  placeholder="e.g. Citizens of Mangan and Chungthang"
                />
              </div>
            </div>

            <div className="col-12">
              <div className="broadcast-form-group">
                <label>Notification Title</label>

                <input
                  type="text"
                  className="ops-input"
                  required
                  value={composeTitle}
                  onChange={(event) => setComposeTitle(event.target.value)}
                  placeholder="Evacuation Advisory"
                />
              </div>
            </div>

            <div className="col-12">
              <div className="broadcast-form-group">
                <label>Message</label>

                <textarea
                  className="ops-input"
                  rows={4}
                  required
                  value={composeMessage}
                  onChange={(event) => setComposeMessage(event.target.value)}
                  placeholder="Enter detailed emergency guidance..."
                />
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button
              type="button"
              className="btn-ops"
              onClick={() => setIsComposeOpen(false)}
            >
              Cancel
            </button>

            <button type="submit" className="btn-ops btn-ops-primary">
              <Send size={13} />

              <span>Send Notification</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default NotificationCenter;
