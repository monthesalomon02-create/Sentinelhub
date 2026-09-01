require('dotenv').config();
const { Worker } = require('bullmq');
const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const connection = require('../lib/redis');
const prisma = require('../lib/prisma');

const execAsync = promisify(exec);

async function runNpmAudit(repoPath) {
  try {
    // Génère un package-lock.json sans installer les node_modules (plus rapide, suffisant pour audit)
    await execAsync('npm install --package-lock-only --no-audit --ignore-scripts', {
      cwd: repoPath,
      timeout: 60000,
    });
  } catch (err) {
    // On continue même si ça échoue partiellement (repo sans package.json valide, etc.)
  }

  try {
    const { stdout } = await execAsync('npm audit --json', {
      cwd: repoPath,
      timeout: 60000,
    });
    return JSON.parse(stdout);
  } catch (err) {
    // npm audit renvoie un exit code != 0 dès qu'il y a des vulnérabilités,
    // ce qui fait "échouer" execAsync même si la sortie JSON est valide.
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout);
      } catch {
        return { error: 'Impossible de parser le résultat npm audit' };
      }
    }
    return { error: err.message };
  }
}

async function processScan(job) {
  const { scanId, githubRepo } = job.data;
  const tempDir = path.join(os.tmpdir(), `scan-${scanId}`);

  try {
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: 'running', startedAt: new Date() },
    });

    // Récupère le token GitHub du propriétaire du projet (pour cloner même les repos privés)
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { project: { include: { user: true } } },
    });

    const token = scan.project.user.githubAccessToken;
    const cloneUrl = `https://${token}@github.com/${githubRepo}.git`;

    // Clone dans un dossier temporaire
    await fs.ensureDir(tempDir);
    const git = simpleGit();
    await git.clone(cloneUrl, tempDir, ['--depth', '1']);

    // Analyse : dépendances (npm audit)
    const auditResults = await runNpmAudit(tempDir);

    const results = {
      dependencies: auditResults,
    };

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'completed',
        results,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Scan ${scanId} failed:`, error.message);
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
      },
    });
  } finally {
    // Nettoyage du dossier temporaire, qu'il y ait eu succès ou échec
    await fs.remove(tempDir).catch(() => {});
  }
}

const worker = new Worker('scan', processScan, { connection, concurrency: 2 });

worker.on('completed', (job) => {
  console.log(`✅ Scan job ${job.id} terminé`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Scan job ${job?.id} échoué:`, err.message);
});

console.log('🔍 Worker de scan démarré, en attente de jobs...');