const express = require('express');
const router = express.Router();

const userController = require('../controllers/UserController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// Public routes (no auth)
router.post('/signup', userController.signup);
router.post('/login', userController.login);

// Protected routes (auth required)
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);

// Caretaker-only route
router.get('/patients', authMiddleware, roleMiddleware(['caretaker']), userController.getAllPatients);

module.exports = router;
