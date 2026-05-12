const express = require('express');
const router = express.Router();
const buildsController = require('../controllers/buildsController');
const { checkAuth } = require('../controllers/authController');

router.get('/', checkAuth, buildsController.getBuilds);
router.get('/:id', checkAuth, buildsController.getBuildById);
router.post('/', checkAuth, buildsController.saveBuild);

module.exports = router;
