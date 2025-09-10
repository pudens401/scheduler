const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Patient dashboard route
router.get(
  '/dashboard/patient',
  authMiddleware,
  roleMiddleware(['patient']),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.userId).populate('device');
      const deviceId = user.device.deviceId;
      const scheduleData = user.device.schedule || [];
      // Fetch notifications for this device
      const notifications = await Notification.find({ deviceId });
      console.log('Notifications:', notifications);
      res.render('patientDashboard', {
        user,
        deviceId,
        scheduleData,
        notifications
      });
    } catch (err) {
      res.status(500).send('Error loading dashboard');
    }
  }
);

module.exports = router;