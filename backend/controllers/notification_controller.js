const { validateBroadcast } = require("../services/broadcastInput");
const Notification = require("../models/notification");
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { returnDocument: "after" }
    );
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }
    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { read: false },
      { $set: { read: true } }
    );
    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};
const sendBroadcast = async (req, res) => {
  try {
    const checked = validateBroadcast(req.body);
    if (!checked.ok) {
      return res.status(400).json({
        success: false,
        message: checked.message,
      });
    }
    const { channel, type, title, message, targetAudience } = checked.value;
    const notification = await Notification.create({
      channel,
      type,
      title,
      message,
      targetAudience,
      read: false,
      delivered: true,
    });
    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error sending broadcast notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send notification",
    });
  }
};
module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendBroadcast,
};