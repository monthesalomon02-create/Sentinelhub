const express = require('express');
const requireAuth = require('../middleware/auth.middleware');
const { createProject, listProjects, getProject } = require('../controllers/project.controller');

const router = express.Router();

router.post('/', requireAuth, createProject);
router.get('/', requireAuth, listProjects);
router.get('/:id', requireAuth, getProject);

module.exports = router;