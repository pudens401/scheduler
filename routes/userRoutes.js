const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');

// Public routes (no auth)
router.get('/signup', userController.showSignupForm);
router.post('/signup', userController.signup);


router.get('/login', userController.showLoginForm);
router.post('/login', userController.login);
router.post('/logout', userController.logout);


// Protected routes (auth required)
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);

// Caretaker-only route
router.get('/patients', authMiddleware, roleMiddleware(['caretaker']), userController.getAllPatients);

module.exports = router;
