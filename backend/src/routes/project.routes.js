const express = require('express');
const requireAuth = require('../middleware/auth.middleware');
const { createProject, listProjects, getProject, triggerScan, listScans, getScan } = require('../controllers/project.controller');

const router = express.Router();

router.post('/', requireAuth, createProject);
router.get('/', requireAuth, listProjects);
router.get('/:id', requireAuth, getProject);
router.post('/:id/scan', requireAuth, triggerScan);
router.get('/:id/scans', requireAuth, listScans);
router.get('/:id/scans/:scanId', requireAuth, getScan);

module.exports = router;