const express = require('express');
const requireAuth = require('../middleware/auth.middleware');
const { listRepos } = require('../controllers/github.controller');

const router = express.Router();

router.get('/repos', requireAuth, listRepos);

module.exports = router;