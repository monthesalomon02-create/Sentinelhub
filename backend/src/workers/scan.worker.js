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
const { ESLint } = require('eslint');
const js = require('@eslint/js');
const sonarjs = require('eslint-plugin-sonarjs');
const yaml = require('js-yaml'); 

const execAsync = promisify(exec);
// Cherche tous les dossiers contenant un fichier donné (ex: package.json, Dockerfile),
// en excluant node_modules, .git et autres dossiers non pertinents
async function findDirsWithFile(rootPath, targetFile, maxDepth = 3) {
  const excluded = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
  const found = [];

  async function walk(dir, depth) {
    if (depth > maxDepth) return;

    const entries = await fs.readdir(dir, { withFileTypes: true });

    const hasTarget = entries.some((e) => e.isFile() && e.name === targetFile);
    if (hasTarget) {
      found.push(dir);
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !excluded.has(entry.name)) {
        await walk(path.join(dir, entry.name), depth + 1);
      }
    }
  }

  await walk(rootPath, 0);
  return found;
}

async function runNpmAuditInDir(dirPath) {
  try {
    await execAsync('npm install --package-lock-only --no-audit --ignore-scripts', {
      cwd: dirPath,
      timeout: 60000,
    });
  } catch (err) {
    // On continue même si ça échoue partiellement
  }

  try {
    const { stdout } = await execAsync('npm audit --json', {
      cwd: dirPath,
      timeout: 60000,
    });
    return JSON.parse(stdout);
  } catch (err) {
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

async function runNpmAudit(repoPath) {
  const dirsWithPackageJson = await findDirsWithFile(repoPath, 'package.json');

  if (dirsWithPackageJson.length === 0) {
    return { found: false, locations: [] };
  }

  const results = [];
  for (const dir of dirsWithPackageJson) {
    const relativePath = path.relative(repoPath, dir) || '.';
    const audit = await runNpmAuditInDir(dir);
    results.push({ location: relativePath, audit });
  }

  return { found: true, locations: results };
}
async function runGitleaks(repoPath) {
  try {
    const reportPath = path.join(repoPath, 'gitleaks-report.json');
    await execAsync(
      `gitleaks git --report-format json --report-path "${reportPath}" --exit-code 0`,
      { cwd: repoPath, timeout: 60000 }
    );

    const reportExists = await fs.pathExists(reportPath);
    if (!reportExists) {
      return { secretsFound: 0, findings: [] };
    }

    const findings = await fs.readJson(reportPath);

    // On ne garde que les infos utiles (jamais le secret en clair !)
    const sanitizedFindings = findings.map((f) => ({
      description: f.Description,
      file: f.File,
      line: f.StartLine,
      rule: f.RuleID,
      commit: f.Commit,
    }));

    return { secretsFound: sanitizedFindings.length, findings: sanitizedFindings };
  } catch (err) {
    return { error: err.message, secretsFound: 0, findings: [] };
  }
}

async function runEslint(repoPath) {
  try {
    const eslint = new ESLint({
      cwd: repoPath,
      overrideConfigFile: true,
      overrideConfig: [
        js.configs.recommended,
        {
          plugins: { sonarjs },
          rules: { ...sonarjs.configs.recommended.rules },
          languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
              window: 'readonly',
              document: 'readonly',
              console: 'readonly',
              process: 'readonly',
              module: 'readonly',
              require: 'readonly',
            },
          },
        },
      ],
      errorOnUnmatchedPattern: false,
    });

    const results = await eslint.lintFiles(['**/*.js', '**/*.jsx']);
    return summarizeEslint(results);
  } catch (err) {
    return { error: err.message };
  }
}

function summarizeEslint(eslintOutput) {
  let errorCount = 0;
  let warningCount = 0;
  const issues = [];

  for (const file of eslintOutput) {
    errorCount += file.errorCount;
    warningCount += file.warningCount;

    for (const msg of file.messages) {
      issues.push({
        file: file.filePath.split(/[\\/]/).slice(-3).join('/'), // chemin relatif court
        line: msg.line,
        rule: msg.ruleId,
        severity: msg.severity === 2 ? 'error' : 'warning',
        message: msg.message,
      });
    }
  }

  return {
    errorCount,
    warningCount,
    filesAnalyzed: eslintOutput.length,
    issues: issues.slice(0, 50), // on limite pour ne pas exploser la taille du résultat stocké
  };
}
async function runHadolintInDir(dirPath) {
  try {
    const { stdout } = await execAsync('hadolint --format json Dockerfile', {
      cwd: dirPath,
      timeout: 30000,
    });
    const findings = JSON.parse(stdout);
    return findings.map((f) => ({
      line: f.line,
      level: f.level,
      rule: f.code,
      message: f.message,
    }));
  } catch (err) {
    if (err.stdout) {
      try {
        const findings = JSON.parse(err.stdout);
        return findings.map((f) => ({
          line: f.line,
          level: f.level,
          rule: f.code,
          message: f.message,
        }));
      } catch {
        return [];
      }
    }
    return [];
  }
}

async function runHadolint(repoPath) {
  const dirsWithDockerfile = await findDirsWithFile(repoPath, 'Dockerfile');

  if (dirsWithDockerfile.length === 0) {
    return { dockerfileFound: false, locations: [] };
  }

  const results = [];
  for (const dir of dirsWithDockerfile) {
    const relativePath = path.relative(repoPath, dir) || '.';
    const issues = await runHadolintInDir(dir);
    results.push({ location: relativePath, issues });
  }

  return { dockerfileFound: true, locations: results };
}
async function runCicdAnalysis(repoPath) {
  const workflowsDir = path.join(repoPath, '.github', 'workflows');
  const exists = await fs.pathExists(workflowsDir);

  if (!exists) {
    return { found: false, workflows: [] };
  }

  const files = await fs.readdir(workflowsDir);
  const ymlFiles = files.filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

  if (ymlFiles.length === 0) {
    return { found: false, workflows: [] };
  }

  const workflows = [];

  for (const file of ymlFiles) {
    const filePath = path.join(workflowsDir, file);
    const issues = [];

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = yaml.load(content);

      // Vérifie les versions d'actions non figées (ex: @main, @master, @latest au lieu d'un tag/SHA)
      const actionRefs = [...content.matchAll(/uses:\s*([^\s@]+)@([^\s]+)/g)];
      for (const [, action, ref] of actionRefs) {
        if (['main', 'master', 'latest', 'HEAD'].includes(ref)) {
          issues.push({
            severity: 'warning',
            message: `L'action "${action}" utilise une référence mouvante ("${ref}") plutôt qu'un tag de version figé — risque de supply chain attack.`,
          });
        }
      }

      // Vérifie l'usage de secrets en clair dans des commandes run (pattern basique)
      if (/run:\s*.*\$\{\{\s*secrets\./i.test(content) && /echo|print/i.test(content)) {
        issues.push({
          severity: 'warning',
          message: 'Un secret semble être affiché (echo/print) dans une commande — risque de fuite dans les logs CI.',
        });
      }

      // Vérifie la présence de permissions explicites (bonne pratique de sécurité)
      if (!parsed?.permissions) {
        issues.push({
          severity: 'info',
          message: 'Aucune section "permissions" définie — le workflow utilise les permissions par défaut, potentiellement trop larges.',
        });
      }

      workflows.push({ file, issues, parseError: null });
    } catch (err) {
      workflows.push({ file, issues: [], parseError: err.message });
    }
  }

  return { found: true, workflows };
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
    const cloneUrl = `https://x-access-token:${token}@github.com/${githubRepo}.git`;

    // Nettoie un éventuel résidu d'un scan précédent qui aurait échoué avant le cleanup
    await fs.remove(tempDir);
    await fs.ensureDir(tempDir);

    process.env.GIT_TERMINAL_PROMPT = '0'; // interdit tout prompt interactif Git
    const git = simpleGit({
      config: ['credential.helper='],
      unsafe: {
        allowUnsafeCredentialHelper: true,
      },
    });
    await git.clone(cloneUrl, tempDir, ['--depth', '1']);

    // Analyse : dépendances (npm audit)
    const auditResults = await runNpmAudit(tempDir);

    // Analyse : secrets (gitleaks)
    const gitleaksResults = await runGitleaks(tempDir);

       // Analyse : qualité de code (ESLint)
    const eslintResults = await runEslint(tempDir);

       // Analyse : Dockerfile (Hadolint)
    const dockerResults = await runHadolint(tempDir);

    // Analyse : configuration CI/CD (GitHub Actions)
    const cicdResults = await runCicdAnalysis(tempDir);

    const results = {
      dependencies: auditResults,
      secrets: gitleaksResults,
      codeQuality: eslintResults,
      docker: dockerResults,
      cicd: cicdResults,
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