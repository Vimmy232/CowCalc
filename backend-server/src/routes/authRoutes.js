const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/keys', authController.checkAuth, authController.requireAdmin, authController.createKey);
router.get('/keys', authController.checkAuth, authController.requireAdmin, authController.listKeys);
router.post('/force-logout', authController.checkAuth, authController.requireAdmin, authController.forceLogoutAll);

module.exports = router;
