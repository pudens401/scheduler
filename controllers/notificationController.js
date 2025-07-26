// controllers/notificationController.js

const Notification = require('../models/Notification');
const Device = require('../models/Device');
const User = require('../models/User');

// Get notifications for a device (patient/farmer/caretaker)
exports.getNotificationsByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate device exists
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Access control:
    // Patient/Farmer can access only their own device notifications
    // Caretaker can access notifications of patient devices only
    if (userRole === 'patient' || userRole === 'farmer') {
      const user = await User.findById(userId);
      if (!user.device.equals(device._id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === 'caretaker') {
      // Caretaker can only access patient devices notifications
      if (device.ownerType !== 'patient') {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const notifications = await Notification.find({ device: device._id }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Post notification from IoT device (no auth, secured by other means like API key or token)
exports.postNotificationFromIoT = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { message, type } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message is required and must be a string' });
    }

    // Find device
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const notification = new Notification({
      device: device._id,
      message,
      type: type || 'info',
    });

    await notification.save();

    res.status(201).json({ message: 'Notification created' });
  } catch (error) {
    console.error('Error posting notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark notification as read (patient/farmer/caretaker)
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params; // notification ID
    const userId = req.user.id;
    const userRole = req.user.role;

    const notification = await Notification.findById(id).populate('device');
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check access
    const device = notification.device;
    const user = await User.findById(userId);

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (userRole === 'patient' || userRole === 'farmer') {
      if (!user.device.equals(device._id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === 'caretaker') {
      if (device.ownerType !== 'patient') {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    notification.read = true;
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
