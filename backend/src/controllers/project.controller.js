const prisma = require('../lib/prisma');

async function createProject(req, res) {
  try {
    const { name, githubRepo } = req.body;

    if (!name || !githubRepo) {
      return res.status(400).json({ error: 'Nom et repo GitHub requis' });
    }

    // Vérifie que ce repo n'est pas déjà connecté par cet utilisateur
    const existingProject = await prisma.project.findFirst({
      where: { githubRepo, userId: req.userId },
    });

    if (existingProject) {
      return res.status(409).json({ error: 'Ce repo est déjà connecté' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        githubRepo, // format attendu: "owner/repo", ex. "monthesalomon02-create/jobmatch-ai"
        userId: req.userId,
      },
    });

    res.status(201).json({ project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function listProjects(req, res) {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ projects });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getProject(req, res) {
  try {
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId: req.userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Projet introuvable' });
    }

    res.json({ project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = { createProject, listProjects, getProject };