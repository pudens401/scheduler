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
      
      // Check if user has a device
      if (!user.device) {
        return res.status(400).send('No device associated with user');
      }
      
      const deviceId = user.device.deviceId;
      const scheduleData = user.device.schedule || [];
      
      // Debug: Log device info
      console.log('Device ID:', deviceId);
      
      // Fetch notifications for this device - using proper query
      const notifications = await Notification.find({ 
        deviceId: deviceId 
      }).sort({ createdAt: -1 }); // Sort by newest first
      
      // Debug: Better logging
      console.log('Found notifications:', notifications.length);
      console.log('Notification details:', notifications.map(n => ({
        id: n._id,
        message: n.message,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt
      })));
      
      res.render('patientDashboard', {
        user,
        deviceId,
        scheduleData,
        notifications: notifications || [] // Ensure it's always an array
      });
    } catch (err) {
      console.error('Dashboard error:', err);
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