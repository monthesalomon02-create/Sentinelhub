const prisma = require('../lib/prisma');
const scanQueue = require('../queues/scan.queue');
const { explainScanResults } = require('../lib/mistral');

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


async function triggerScan(req, res) {
  try {
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId: req.userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Projet introuvable' });
    }

    const scan = await prisma.scan.create({
      data: {
        projectId: project.id,
        status: 'pending',
      },
    });

    await scanQueue.add('run-scan', {
      scanId: scan.id,
      projectId: project.id,
      githubRepo: project.githubRepo,
    });

    res.status(201).json({ scan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
async function listScans(req, res) {
  try {
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId: req.userId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Projet introuvable' });
    }

    const scans = await prisma.scan.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ scans });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getScan(req, res) {
  try {
    const { id, scanId } = req.params;

    const scan = await prisma.scan.findFirst({
      where: { id: scanId, projectId: id, project: { userId: req.userId } },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan introuvable' });
    }

    res.json({ scan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
async function explainScan(req, res) {
  try {
    const { id, scanId } = req.params;

    const scan = await prisma.scan.findFirst({
      where: { id: scanId, projectId: id, project: { userId: req.userId } },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan introuvable' });
    }

    if (scan.status !== 'completed') {
      return res.status(400).json({ error: 'Le scan doit être terminé pour être expliqué' });
    }

    const explanation = await explainScanResults(scan.results);

    res.json({ explanation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la génération de l\'explication' });
  }
}
module.exports = { createProject, listProjects, getProject, triggerScan, listScans, getScan, explainScan };