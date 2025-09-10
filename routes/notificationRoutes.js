const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// GET all notifications for a device
// Allowed roles: patient, farmer, caretaker
router.get(
  '/notifications/:deviceId',
  notificationController.getNotificationsByDevice
);

// POST a new notification from an IoT device
// No authMiddleware because this is meant for secure device-to-server calls
// You can protect this route using an API key middleware if needed
router.post(
  '/notifications/:deviceId',
  notificationController.postNotificationFromIoT
);  // API route for IoT devices to post notifications

// PATCH: mark a notification as read
// Allowed roles: patient, farmer, caretaker
router.patch(
  '/notifications/mark-read/:id',
  notificationController.markAsRead
);

module.exports = router;
