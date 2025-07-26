const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// GET all notifications for a device
// Allowed roles: patient, farmer, caretaker
router.get(
  '/:deviceId',
  authMiddleware,
  roleMiddleware(['patient', 'farmer', 'caretaker']),
  notificationController.getNotificationsByDevice
);

// POST a new notification from an IoT device
// No authMiddleware because this is meant for secure device-to-server calls
// You can protect this route using an API key middleware if needed
router.post(
  '/:deviceId',
  notificationController.postNotificationFromIoT
);

// PATCH: mark a notification as read
// Allowed roles: patient, farmer, caretaker
router.patch(
  '/mark-read/:id',
  authMiddleware,
  roleMiddleware(['patient', 'farmer', 'caretaker']),
  notificationController.markAsRead
);

module.exports = router;
