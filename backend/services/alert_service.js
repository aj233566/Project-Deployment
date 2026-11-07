const Alert = require("../models/alert");
const Notification = require("../models/notification");
const LEVEL_RANK = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  CRITICAL: 3,
};
async function processRiskAlert({
  location,
  multiHazard,
}) {
  const score = multiHazard?.compositeScore;
  const zoneType = multiHazard?.redZone;
  if (!location || !Number.isFinite(score) || !["ORANGE", "RED"].includes(zoneType)) {
    return null;
  }
  const level = zoneType === "RED" ? "CRITICAL" : "HIGH";
  const leadingHazard = (multiHazard.hazards || [])
    .filter((hazard) => Number.isFinite(hazard.score))
    .sort((left, right) => right.score - left.score)[0];
  const contributors = (multiHazard.explanation?.majorContributors || []).map((item) => ({
    key: `${item.hazardType}:${item.factor}`,
    label: `${item.hazardType}: ${item.factor}`,
    level: item.score >= 75 ? "CRITICAL" : item.score >= 50 ? "HIGH" : "MODERATE",
    contribution: item.score,
    reason: item.reason,
  }));
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const fingerprint =
    `multi_hazard:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
  let alert = await Alert.findOne({
    fingerprint,
    status: {
      $in: ["Active", "Acknowledged", "Escalated"],
    },
  });
  const previousLevel = alert?.riskLevel || null;
  if (!alert) {
    alert = await Alert.create({
      fingerprint,
      disasterType: "multi_hazard",
      hazardType: leadingHazard?.hazardType || null,
      zoneType,
      location: {
        name: location.name || "Unknown location",
        latitude,
        longitude,
      },
      riskScore: score,
      riskLevel: level,
      aiConfidence: null,
      majorContributors: contributors,
      recommendations: contributors.map((item) => item.reason),
      status: "Active",
      source: "risk_engine",
    });
    await createNotification({
      alert,
      reason: "new",
    });
    console.log(
      `🚨 NEW ${level} ALERT CREATED: ${location.name}`
    );
    return alert;
  }
  alert.riskScore = score;
  alert.riskLevel = level;
  alert.hazardType = leadingHazard?.hazardType || null;
  alert.zoneType = zoneType;
  alert.aiConfidence = null;
  alert.majorContributors = contributors;
  alert.recommendations = contributors.map((item) => item.reason);
  await alert.save();
  if (
    LEVEL_RANK[level] >
    LEVEL_RANK[previousLevel]
  ) {
    await createNotification({
      alert,
      reason: "escalated",
    });
    console.log(
      `🚨 ALERT ESCALATED: ${location.name} → ${level}`
    );
  }
  return alert;
}
async function createNotification({
  alert,
  reason,
}) {
  const isCritical =
    alert.riskLevel === "CRITICAL";
  const disasterName =
    formatDisasterType(alert.disasterType);
  let titleEn;
  let messageEn;
  if (reason === "escalated") {
    titleEn =
      `Risk Escalated: ${disasterName}`;
    messageEn =
      `${alert.location.name} risk increased to ${alert.riskLevel} (${alert.riskScore}/100).`;
  } else {
    titleEn =
      `${alert.riskLevel} Early Warning: ${disasterName}`;
    messageEn =
      `${alert.location.name} has reached ${alert.riskLevel} risk (${alert.riskScore}/100).`;
  }
  const notification =
    await Notification.create({
      alertId: alert._id,
      channel: "in_app",
      type: isCritical
        ? "critical"
        : "warning",
      title: {
        en: titleEn,
        hi:
          isCritical
            ? `गंभीर प्रारंभिक चेतावनी: ${disasterName}`
            : `प्रारंभिक चेतावनी: ${disasterName}`,
      },
      message: {
        en: messageEn,
        hi:
          `${alert.location.name} में जोखिम स्तर ${alert.riskLevel} (${alert.riskScore}/100) है।`,
      },
      targetAudience:
        "Authority & Emergency Response",
      read: false,
      delivered: true,
    });
  return notification;
}
function formatDisasterType(type) {
  return String(type || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}
module.exports = {
  processRiskAlert,
};