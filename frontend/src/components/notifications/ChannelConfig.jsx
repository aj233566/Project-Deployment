import { useState } from "react";
import { Bell, Send, ShieldCheck } from "lucide-react";
import { notificationService } from "../../services/notificationService";
export const ChannelConfig = () => {
  const [pushStatus, setPushStatus] = useState(() => {
    try {
      return notificationService.getPermission();
    } catch {
      return "default";
    }
  });
  const [testResult, setTestResult] = useState(null);
  const handleEnablePush = async () => {
    try {
      const result = await notificationService.requestPermission();
      setPushStatus(result?.permission || "default");
    } catch (error) {
      console.error("Unable to request notification permission:", error);
      setTestResult("Unable to request browser notification permission.");
      setTimeout(() => setTestResult(null), 4000);
    }
  };
  const handleTestPush = () => {
    try {
      const success = notificationService.sendBrowserNotification(
        "SENETRY Test Notification",
        {
          body: "SENETRY browser notifications are active.",
          tag: "cascade-net-test-push",
        },
      );
      if (success) {
        setTestResult("Browser notification sent successfully.");
      } else {
        setTestResult(
          "Browser notification could not be sent. Check your permission settings.",
        );
      }
    } catch (error) {
      console.error("Browser notification error:", error);
      setTestResult("Browser notification failed.");
    }
    setTimeout(() => setTestResult(null), 4000);
  };
  return (
    <div className="ops-panel mb-4">
      <div className="ops-panel-header">
        <h3 className="ops-panel-title">
          <ShieldCheck size={18} color="var(--info)" />

          <span>Notification Delivery Channels</span>
        </h3>
      </div>

      <div className="row g-3">

        <div className="col-12 col-sm-6">
          <div className="channel-status-card h-100">
            <div className="channel-icon-avatar">
              <Send size={18} />
            </div>

            <div className="channel-info">
              <h4>In-App Notifications</h4>

              <p
                style={{
                  color: "var(--safe)",
                }}
              >
                ● Backend Notification Service
              </p>
            </div>
          </div>
        </div>


        <div className="col-12 col-sm-6">
          <div className="channel-status-card h-100">
            <div
              className="channel-icon-avatar"
              style={{
                color: "var(--info)",
              }}
            >
              <Bell size={18} />
            </div>

            <div className="channel-info w-100">
              <h4>Browser Push</h4>

              {pushStatus === "granted" ? (
                <div className="d-flex align-items-center justify-content-between gap-1 mt-1">
                  <span
                    style={{
                      color: "var(--safe)",
                      fontSize: "1.131rem",
                    }}
                  >
                    ● Enabled
                  </span>

                  <button
                    className="btn-ops btn-ops-sm"
                    style={{
                      fontSize: "1.1rem",
                    }}
                    onClick={handleTestPush}
                  >
                    Test
                  </button>
                </div>
              ) : pushStatus === "denied" ? (
                <span
                  style={{
                    color: "var(--critical)",
                    fontSize: "1.131rem",
                  }}
                >
                  ● Permission Denied
                </span>
              ) : (
                <button
                  className="btn-ops btn-ops-sm btn-ops-primary mt-1"
                  style={{
                    fontSize: "1.131rem",
                  }}
                  onClick={handleEnablePush}
                >
                  Enable Notifications
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {testResult && (
        <div
          className="mt-3 p-2 rounded"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderLeft: "3px solid var(--info)",
            fontSize: "1.226rem",
            color: "var(--text-primary)",
          }}
        >
          {testResult}
        </div>
      )}
    </div>
  );
};
export default ChannelConfig;
