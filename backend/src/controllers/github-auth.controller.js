const axios = require('axios');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// Étape 1 : rediriger l'utilisateur vers GitHub pour autorisation
function redirectToGithub(req, res) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: 'repo read:user user:email',
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

// Étape 2 : GitHub redirige ici avec un "code" à échanger contre un token
async function githubCallback(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Code manquant' });
    }

    // Échange du code contre un access_token GitHub
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL,
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ error: 'Échec de l\'échange du token GitHub' });
    }

    // Récupération du profil GitHub de l'utilisateur
    const profileResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const githubProfile = profileResponse.data;

    // GitHub ne renvoie pas toujours l'email dans /user (si privé), donc on le récupère à part si besoin
    let email = githubProfile.email;
    if (!email) {
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const primaryEmail = emailsResponse.data.find((e) => e.primary);
      email = primaryEmail ? primaryEmail.email : `${githubProfile.id}@github.local`;
    }

    // Crée l'utilisateur s'il n'existe pas, ou met à jour son token s'il existe déjà
    const user = await prisma.user.upsert({
      where: { githubId: String(githubProfile.id) },
      update: {
        githubAccessToken: access_token,
        githubUsername: githubProfile.login,
      },
      create: {
        email,
        githubId: String(githubProfile.id),
        githubUsername: githubProfile.login,
        githubAccessToken: access_token,
      },
    });

    // Génère un token JWT pour ton appli (comme pour le login classique)
    const appToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Redirige vers le frontend avec le token (le frontend le récupérera depuis l'URL)
   res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${appToken}`);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur lors de l\'authentification GitHub' });
  }
}

module.exports = { redirectToGithub, githubCallback };