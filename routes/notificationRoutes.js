const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// POST a new notification from an IoT device (NO AUTH)
router.post(
  '/notifications/:deviceId',
  notificationController.postNotificationFromIoT
);

// GET all notifications for a device (AUTH)
router.get(
  '/notifications/:deviceId',
  notificationController.getNotificationsByDevice
);

// PATCH: mark a notification as read (AUTH)
router.patch(
  '/notifications/mark-read/:id',
  notificationController.markAsRead
);

module.exports = router;
