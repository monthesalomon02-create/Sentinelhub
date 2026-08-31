const express = require('express');
const { register, login } = require('../controllers/auth.controller');
const { redirectToGithub, githubCallback } = require('../controllers/github-auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/github', redirectToGithub);
router.get('/github/callback', githubCallback);

module.exports = router;