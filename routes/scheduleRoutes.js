// routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController.js');
const {authMiddleware,roleMiddleware} = require('../middlewares/auth.js');


// Get schedule by deviceId (any authenticated user)
router.get('/:deviceId', authMiddleware, scheduleController.getScheduleByDevice);

// Update schedule by deviceId (only farmer or caretaker allowed)
router.put(
  '/:deviceId',
  authMiddleware,
  roleMiddleware(['farmer', 'caretaker']),
  scheduleController.updateScheduleByDevice
);

module.exports = router;
