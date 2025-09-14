// routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController.js');
const {authMiddleware,roleMiddleware} = require('../middlewares/auth.js');

const User = require('../models/User');
const Notification = require('../models/Notification');
const Schedule = require('../models/Schedule.js');



// Get schedule by deviceId (any authenticated user) API route
router.get('/schedule/:deviceId', scheduleController.getScheduleByDevice);

// Update schedule by deviceId (public)
router.put('/schedule/:deviceId', scheduleController.updateScheduleByDevice);

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


// Example data (replace with DB query)


router.get('/dashboard/caretaker/:id', async (req, res) => {
  const caretakerId = req.params.id;
  const caretaker = await User.findById(caretakerId);
  const caretakerName = caretaker.name;
  const patients = await User.find({ role: 'patient' })
        .select('-password')
        .populate('device', '-__v -createdAt -updatedAt');

  const schedules = await Schedule.find();

  let notifications = await Notification.find();
  notifications = notifications.map(n => ({
    text: n.message,
    type: n.type,
    read: n.read,
    time: n.createdAt.toLocaleString()
  }));
    // Render the caretaker dashboard with patients and notifications
  res.render('caretakerDashboard', {
    caretakerId,
    caretakerName,
    patients,
    notifications,
    schedules
  });
});



router.get('/dashboard/farmer/:id', async (req, res) => {
  const { id } = req.params;
  // Example data (replace with DB query)
  const farmer = await User.findById(id);
  let schedule = await Schedule.findOne({ deviceId: farmer.deviceId });
  let foodLevel = Math.floor(Math.random()*100); // Simulated food level
  let notifications = await Notification.find({ deviceId: farmer.deviceId })
   notifications = notifications
    .map(n => ({
      text: n.message,
      type: n.type,
      read: n.read,
      time: n.createdAt.toLocaleString()
    }));
  const farmerData = {
    schedule: schedule ? schedule.times : [],
    foodLevel: foodLevel,
    notifications: notifications,
    deviceId: farmer.deviceId,
    lastFeeding: 'Today, 07:00 AM'
  };
  // Fetch farmer data by id (replace this mock)
  res.render('farmerDashboard', farmerData);
});

router.get('/dashboard/ringer/:id', async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  const deviceId = user.deviceId;

  // Load schedule (if any)
  const schedule = await Schedule.findOne({ deviceId });
  const scheduleData = (schedule?.times || []).map(t => ({
    time24: t.time,
    action: t.action || 'ring',
  }));

  res.render('ringerDashboard', {
    deviceId,
    scheduleData,
    user: { name: user.name, role: user.role },
  });
});

module.exports = router;
