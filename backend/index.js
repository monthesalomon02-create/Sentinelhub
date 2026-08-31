const express = require('express');
const authRoutes = require('./src/routes/auth.routes');
const githubRoutes = require('./src/routes/github.routes');
const projectRoutes = require('./src/routes/project.routes');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/projects', projectRoutes);
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SentinelHub API running on port ${PORT}`);
});