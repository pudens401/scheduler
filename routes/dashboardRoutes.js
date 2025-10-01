const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Schedule = require('../models/Schedule');

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
      console.log('First notification:', notifications[0]);
      console.log('Notification fields:', notifications[0] ? Object.keys(notifications[0].toObject()) : 'No notifications');
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

// Ringer dashboard (public)
router.get('/dashboard/ringer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate('device');
    if (!user || !user.device) return res.status(404).send('User or device not found');

    const deviceId = user.device.deviceId;
    const schedule = await Schedule.findOne({ deviceId });
    const scheduleData = (schedule?.times || []).map(t => ({
      time: t.time,
      action: t.action || 'ring',
    }));

    res.render('ringerDashboard', { user, deviceId, scheduleData });
  } catch (err) {
    console.error('Ringer dashboard error:', err);
    res.status(500).send('Error loading ringer dashboard');
  }
});

module.exports = router;