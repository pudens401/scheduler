// routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController.js');
const {authMiddleware,roleMiddleware} = require('../middlewares/auth.js');

const User = require('../models/User');
const Notification = require('../models/Notification');



// Get schedule by deviceId (any authenticated user) API route
router.get('schedule/:deviceId', scheduleController.getScheduleByDevice);

// Update schedule by deviceId (only farmer or caretaker allowed)
router.put(
  'schedule/:deviceId',
  authMiddleware,
  roleMiddleware(['farmer', 'caretaker']),
  scheduleController.updateScheduleByDevice
);

// Dashboard route for patient
// This will render the EJS page with schedule and notifications
// Render EJS page
router.get('/dashboard/patient/:id', async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId);
  const deviceId = user.deviceId;

  // Fetch data from DB using existing controller logic
  const schedule = await scheduleController.getScheduleByDeviceData(deviceId); // helper function
  const notification = [ // sample, can also fetch from DB
    { text: 'Medication taken at 8:00 AM', type: 'success', time: 'Today, 8:02 AM' }
  ];

  let notifications = await Notification.find({ deviceId: deviceId }).sort({ createdAt: -1 });
  notifications = notifications.map(n => ({
    text: n.message,
    type: n.type,
    read: n.read,
    time: n.createdAt.toLocaleString()
  }));

  res.render('patientDashboard', {
    deviceId,
    scheduleData: schedule.times.map(t => ({
      time24: t.time, // preformatted for input
      medication: t.medication
    })),
    notifications,
    user: { name: user.name, role: user.role }
  });
});

// API endpoint to update schedule
router.put('/schedule/:deviceId', scheduleController.updateScheduleByDevice);



module.exports = router;
