const axios = require('axios');
const prisma = require('../lib/prisma');

async function listRepos(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (!user || !user.githubAccessToken) {
      return res.status(400).json({ error: 'Aucun compte GitHub connecté' });
    }

    const response = await axios.get('https://api.github.com/user/repos', {
      headers: { Authorization: `Bearer ${user.githubAccessToken}` },
      params: {
        sort: 'updated',
        per_page: 50,
      },
    });

    // On ne renvoie que les infos utiles au frontend
    const repos = response.data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      description: repo.description,
      language: repo.language,
      updatedAt: repo.updated_at,
      defaultBranch: repo.default_branch,
    }));

    res.json({ repos });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des repos GitHub' });
  }
}

module.exports = { listRepos };