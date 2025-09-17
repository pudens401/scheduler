// Send current time to MQTT
router.get('/device/set-time/:deviceId', deviceController.setTime);
const express = require('express');
const router = express.Router();

const deviceController = require('../controllers/deviceController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// Public ringer action (no auth)
router.post('/device/ringer-action', deviceController.ringerAction);

// Public GET endpoints for ringer actions
router.get('/device/ring/:deviceId', deviceController.ringGet);
router.get('/device/silent/:deviceId', deviceController.silentGet);

// All routes require authentication
// router.use(authMiddleware);

// Patient and farmer can get their own device info
// router.get('/me', roleMiddleware(['patient', 'farmer']), deviceController.getOwnDevice);

// Caretaker can get all patient devices
// router.get('/patients', roleMiddleware(['caretaker']), deviceController.getAllPatientDevices);

module.exports = router;
