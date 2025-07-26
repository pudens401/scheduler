const express = require('express');
const router = express.Router();

const deviceController = require('../controllers/deviceController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// All routes require authentication
router.use(authMiddleware);

// Patient and farmer can get their own device info
router.get('/me', roleMiddleware(['patient', 'farmer']), deviceController.getOwnDevice);

// Caretaker can get all patient devices
router.get('/patients', roleMiddleware(['caretaker']), deviceController.getAllPatientDevices);

// Farmer can update food level
router.put('/food-level', roleMiddleware(['farmer']), deviceController.updateFoodLevel);

// Farmer can trigger manual control actions
router.post('/manual-control', roleMiddleware(['farmer']), deviceController.manualControl);

module.exports = router;
