import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { notificationService } from "../services/notificationService";
import { calculateRiskLevel } from "../services/riskEngine";
import {
  alertApi,
  notificationApi,
  emergencyApi,
  resourcesApi,
} from "../services/api";
import { useLocation } from "react-router-dom";
import { AlertContext } from "./alertContextStore";
import { hasActiveSession } from "./session";
export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [emergencyAreasLoading, setEmergencyAreasLoading] = useState(false);
  const [emergencyAreasError, setEmergencyAreasError] = useState("");
  const [emergencyAreas, setEmergencyAreas] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const location = useLocation();
  const [resourcesError, setResourcesError] = useState("");
  const [resources, setResources] = useState([]);
  const [thresholds, setThresholds] = useState({
    critical: 80,
    high: 65,
    moderate: 40,
  });
  const extractData = useCallback((response) => {
    if (response && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  }, []);
  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError("");
    try {
      const response = await alertApi.getAlerts();
      const data = extractData(response);
      setAlerts(data);
    } catch (error) {
      console.error("[AlertContext] Failed to load alerts:", error);
      setAlerts([]);
      setAlertsError(error.message || "Unable to load alerts.");
    } finally {
      setAlertsLoading(false);
    }
  }, [extractData]);
  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const response = await notificationApi.getNotifications();
      const data = extractData(response);
      setNotifications(data);
    } catch (error) {
      console.error("[AlertContext] Failed to load notifications:", error);
      setNotifications([]);
      setNotificationsError(error.message || "Unable to load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }, [extractData]);
  const loadEmergencyAreas = useCallback(async () => {
    setEmergencyAreasLoading(true);
    setEmergencyAreasError("");
    try {
      const response = await emergencyApi.getPrioritisedAreas();
      const data = extractData(response);
      setEmergencyAreas(data);
    } catch (error) {
      console.error("[AlertContext] Failed to load emergency areas:", error);
      setEmergencyAreas([]);
      setEmergencyAreasError(error.message || "Unable to load emergency response areas.");
    } finally {
      setEmergencyAreasLoading(false);
    }
  }, [extractData]);
  const loadResources = useCallback(async () => {
    setResourcesLoading(true);
    setResourcesError("");
    try {
      const response = await resourcesApi.getResources();
      const data = extractData(response);
      setResources(data);
    } catch (error) {
      console.error("[AlertContext] Failed to load resources:", error);
      setResources([]);
      setResourcesError(error.message || "Unable to load resources.");
    } finally {
      setResourcesLoading(false);
    }
  }, [extractData]);
  useEffect(() => {
    if (!hasActiveSession()) {
      return undefined;
    }
    const start = setTimeout(() => {
      void loadAlerts();
      void loadNotifications();
      void loadEmergencyAreas();
      void loadResources();
    }, 0);
    return () => clearTimeout(start);
  }, [location.key, loadAlerts, loadNotifications, loadEmergencyAreas, loadResources]);
  const updateAlertStatus = async (id, status) => {
    if (!id) {
      return;
    }
    try {
      await alertApi.updateAlertStatus(id, status);
      setAlerts((previousAlerts) =>
        previousAlerts.map((alert) =>
          alert._id === id || alert.id === id
            ? {
                ...alert,
                status,
              }
            : alert,
        ),
      );
    } catch (error) {
      console.error(`Failed to update alert to ${status}:`, error);
      throw error;
    }
  };
  const acknowledgeAlert = async (id) => {
    await updateAlertStatus(id, "Acknowledged");
  };
  const resolveAlert = async (id) => {
    await updateAlertStatus(id, "Resolved");
  };
  const escalateAlert = async (id) => {
    await updateAlertStatus(id, "Escalated");
  };
  const updateThresholds = (newThresholds) => {
    setThresholds(newThresholds);
    setAlerts((previousAlerts) =>
      previousAlerts.map((alert) => {
        if (typeof alert.riskScore !== "number") {
          return alert;
        }
        return {
          ...alert,
          riskLevel: calculateRiskLevel(alert.riskScore, newThresholds),
        };
      }),
    );
  };
  const dispatchEmergencyUnit = async (areaId, unitName) => {
    if (!areaId) {
      throw new Error("Emergency area ID is required.");
    }
    if (!unitName || !unitName.trim()) {
      throw new Error("Response unit is required.");
    }
    try {
      const response = await emergencyApi.dispatchTeam(areaId, unitName.trim());
      await loadEmergencyAreas();
      await loadResources();
      return response;
    } catch (error) {
      console.error("[AlertContext] Dispatch failed:", error);
      throw error;
    }
  };
  const markNotificationRead = async (id) => {
    if (!id) {
      return;
    }
    try {
      await notificationApi.markAsRead(id);
      setNotifications((previousNotifications) =>
        previousNotifications.map((notification) =>
          notification._id === id || notification.id === id
            ? {
                ...notification,
                read: true,
              }
            : notification,
        ),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      throw error;
    }
  };
  const markAllNotificationsRead = () => {
    setNotifications((previousNotifications) =>
      previousNotifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    );
  };
  const sendCustomNotification = async (payload = {}) => {
    try {
      const response = await notificationApi.sendBroadcast({
        channel: payload.channel || "in_app",
        type: payload.type || "info",
        title: {
          en: payload.titleEn || payload.title || "Notification",
          hi: payload.titleHi || payload.titleEn || payload.title || "सूचना",
        },
        message: {
          en: payload.messageEn || payload.message || "",
          hi: payload.messageHi || payload.messageEn || payload.message || "",
        },
        targetAudience: payload.targetAudience || "General Public",
      });
      const savedNotification = response?.data;
      if (savedNotification) {
        setNotifications((previousNotifications) => [
          savedNotification,
          ...previousNotifications,
        ]);
      }
      if (payload.channel === "browser" || payload.type === "critical") {
        try {
          await notificationService.sendBrowserNotification(
            payload.titleEn || payload.title || "SENETRY Alert",
            {
              body: payload.messageEn || payload.message || "",
              tag: "cascade-custom",
            },
          );
        } catch (browserError) {
          console.warn("Browser notification unavailable:", browserError);
        }
      }
      return savedNotification;
    } catch (error) {
      console.error("Failed to send notification:", error);
      throw error;
    }
  };
  const contextValue = {
    alerts,
    alertsLoading,
    alertsError,
    loadAlerts,
    acknowledgeAlert,
    resolveAlert,
    escalateAlert,
    notifications,
    notificationsLoading,
    notificationsError,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    sendCustomNotification,
    emergencyAreas,
    emergencyAreasLoading,
    emergencyAreasError,
    loadEmergencyAreas,
    dispatchEmergencyUnit,
    resources,
    resourcesLoading,
    resourcesError,
    loadResources,
    thresholds,
    updateThresholds,
  };
  return (
    <AlertContext.Provider value={contextValue}>
      {children}
    </AlertContext.Provider>
  );
};
