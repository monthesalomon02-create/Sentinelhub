import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

function computeSecuritySummary(results) {
  if (!results) return null;

  // Compte les vulnérabilités de dépendances (toutes locations confondues)
  let critical = 0, high = 0, moderate = 0, low = 0;
  results.dependencies?.locations?.forEach((loc) => {
    const v = loc.audit?.metadata?.vulnerabilities;
    if (v) {
      critical += v.critical || 0;
      high += v.high || 0;
      moderate += v.moderate || 0;
      low += v.low || 0;
    }
  });

  const secretsFound = results.secrets?.secretsFound || 0;

  // Score sécurité : pénalise selon la gravité
  let securityScore = 100 - (critical * 20 + high * 10 + moderate * 5 + low * 2 + secretsFound * 15);
  securityScore = Math.max(0, Math.min(100, securityScore));

  // Score qualité de code
  const errorCount = results.codeQuality?.errorCount || 0;
  const warningCount = results.codeQuality?.warningCount || 0;
  let codeQualityScore = 100 - (errorCount * 3 + warningCount * 1);
  codeQualityScore = Math.max(0, Math.min(100, codeQualityScore));

  // Statut Docker
  const dockerIssues = results.docker?.locations?.some((loc) => loc.issues.length > 0);
  const dockerStatus = !results.docker?.dockerfileFound ? 'none' : dockerIssues ? 'warning' : 'ok';

  // Statut CI/CD
  const cicdIssues = results.cicd?.workflows?.some((wf) => wf.issues.length > 0 || wf.parseError);
  const cicdStatus = !results.cicd?.found ? 'none' : cicdIssues ? 'warning' : 'ok';

  return {
    critical, high, moderate, low,
    securityScore, codeQualityScore,
    dockerStatus, cicdStatus,
  };
}

function SecuritySummaryCard({ results }) {
  const summary = computeSecuritySummary(results);
  if (!summary) return null;

  const statusIcon = { ok: '✓', warning: '⚠', none: '—' };
  const statusColor = { ok: 'text-green-600', warning: 'text-orange-600', none: 'text-gray-400' };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
      <h3 className="font-bold text-lg mb-4">PROJECT SECURITY</h3>

      <div className="grid grid-cols-2 gap-y-2 mb-4 text-sm">
        <span>Critical</span>
        <span className="text-right font-medium">{summary.critical} 🔴</span>
        <span>High</span>
        <span className="text-right font-medium">{summary.high} 🟠</span>
        <span>Medium</span>
        <span className="text-right font-medium">{summary.moderate} 🟡</span>
        <span>Low</span>
        <span className="text-right font-medium">{summary.low} 🟢</span>
      </div>

      <div className="border-t pt-4 grid grid-cols-2 gap-y-2 text-sm">
        <span>Code Quality</span>
        <span className="text-right font-medium">{summary.codeQualityScore}%</span>
        <span>Security</span>
        <span className="text-right font-medium">{summary.securityScore}%</span>
        <span>Test Coverage</span>
        <span className="text-right font-medium text-gray-400">N/A</span>
        <span>Docker</span>
        <span className={`text-right font-medium ${statusColor[summary.dockerStatus]}`}>
          {statusIcon[summary.dockerStatus]}
        </span>
        <span>CI/CD</span>
        <span className={`text-right font-medium ${statusColor[summary.cicdStatus]}`}>
          {statusIcon[summary.cicdStatus]}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-gray-100 text-gray-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-1 rounded text-sm font-medium ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

function ScanResults({ results }) {
  if (!results) return null;
  const dependencies = results.dependencies;
  const secrets = results.secrets;
  const codeQuality = results.codeQuality;
  const docker = results.docker;
  const cicd = results.cicd;

  return (
    <div className="mt-3 space-y-3">
      <div className="bg-gray-50 rounded p-4">
        <h4 className="font-medium mb-2">Dépendances</h4>
        {dependencies?.found ? (
          <div className="space-y-3">
            {dependencies.locations.map((loc, i) => {
              const meta = loc.audit?.metadata;
              const vulns = meta?.vulnerabilities;
              return (
                <div key={i}>
                  <p className="text-sm font-medium text-gray-600 mb-1">📁 {loc.location}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm pl-4">
                    <p>Total dépendances : {meta?.dependencies?.total ?? '—'}</p>
                    <p>Vulnérabilités totales : {vulns?.total ?? 0}</p>
                    <p className="text-red-600">Critical : {vulns?.critical ?? 0}</p>
                    <p className="text-orange-600">High : {vulns?.high ?? 0}</p>
                    <p className="text-yellow-600">Moderate : {vulns?.moderate ?? 0}</p>
                    <p className="text-blue-600">Low : {vulns?.low ?? 0}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucun package.json trouvé.</p>
        )}
      </div>

      <div className="bg-gray-50 rounded p-4">
        <h4 className="font-medium mb-2">Secrets exposés</h4>
        {secrets ? (
          secrets.secretsFound > 0 ? (
            <div>
              <p className="text-red-600 font-medium text-sm mb-2">
                ⚠ {secrets.secretsFound} secret(s) détecté(s)
              </p>
              <ul className="space-y-1 text-sm">
                {secrets.findings.map((f, i) => (
                  <li key={i} className="text-gray-700">
                    <span className="font-mono">{f.file}:{f.line}</span> — {f.rule}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-green-600 text-sm">✓ Aucun secret détecté</p>
          )
        ) : (
          <p className="text-sm text-gray-500">Pas de données.</p>
        )}
      </div>

      <div className="bg-gray-50 rounded p-4">
        <h4 className="font-medium mb-2">Qualité de code</h4>
        {codeQuality ? (
          <div>
            <div className="grid grid-cols-3 gap-2 text-sm mb-2">
              <p>Fichiers analysés : {codeQuality.filesAnalyzed}</p>
              <p className="text-red-600">Erreurs : {codeQuality.errorCount}</p>
              <p className="text-yellow-600">Warnings : {codeQuality.warningCount}</p>
            </div>
            {codeQuality.issues?.length > 0 && (
              <ul className="space-y-1 text-sm mt-2">
                {codeQuality.issues.map((issue, i) => (
                  <li key={i} className="text-gray-700">
                    <span className="font-mono">{issue.file}:{issue.line}</span> — {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Pas de données.</p>
        )}
      </div>

      <div className="bg-gray-50 rounded p-4">
        <h4 className="font-medium mb-2">Docker</h4>
        {docker?.dockerfileFound ? (
          <div className="space-y-3">
            {docker.locations.map((loc, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-gray-600 mb-1">📁 {loc.location}</p>
                {loc.issues.length > 0 ? (
                  <ul className="space-y-1 text-sm pl-4">
                    {loc.issues.map((issue, j) => (
                      <li key={j} className="text-gray-700">
                        <span className="uppercase text-xs font-medium text-orange-600">{issue.level}</span>{' '}
                        L{issue.line} ({issue.rule}) — {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-green-600 text-sm pl-4">✓ Aucun problème détecté</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucun Dockerfile trouvé.</p>
        )}
      </div>

      <div className="bg-gray-50 rounded p-4">
        <h4 className="font-medium mb-2">Configuration CI/CD</h4>
        {cicd?.found ? (
          <div className="space-y-3">
            {cicd.workflows.map((wf, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-gray-600 mb-1">⚙ {wf.file}</p>
                {wf.parseError ? (
                  <p className="text-red-600 text-sm pl-4">Erreur de parsing : {wf.parseError}</p>
                ) : wf.issues.length > 0 ? (
                  <ul className="space-y-1 text-sm pl-4">
                    {wf.issues.map((issue, j) => (
                      <li key={j} className="text-gray-700">
                        <span className="uppercase text-xs font-medium text-orange-600">{issue.severity}</span>{' '}
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-green-600 text-sm pl-4">✓ Aucun problème détecté</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucun workflow GitHub Actions trouvé.</p>
        )}
      </div>
    </div>
  );
}

function ScanCard({ scan }) {
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState(null);

  async function handleExplain() {
    try {
      setExplaining(true);
      setError(null);
      const data = await apiFetch(`/projects/${scan.projectId}/scans/${scan.id}/explain`, {
        method: 'POST',
      });
      setExplanation(data.explanation);
    } catch (err) {
      setError(err.message);
    } finally {
      setExplaining(false);
    }
  }

  return (
    <li className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {new Date(scan.createdAt).toLocaleString()}
        </span>
        <StatusBadge status={scan.status} />
      </div>
      {scan.status === 'failed' && (
        <p className="text-red-600 text-sm mt-2">{scan.errorMessage}</p>
      )}
      {scan.status === 'completed' && (
        <>
          <ScanResults results={scan.results} />
          {!explanation && (
            <button
              onClick={handleExplain}
              disabled={explaining}
              className="mt-3 bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {explaining ? 'Analyse en cours...' : '✨ Expliquer ce scan (IA)'}
            </button>
          )}
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          {explanation && (
            <div className="mt-3 bg-purple-50 border border-purple-200 rounded p-4">
              <h4 className="font-medium mb-2 text-purple-900">✨ Explication IA</h4>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{explanation}</div>
            </div>
          )}
        </>
      )}
    </li>
  );
}

function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [projectData, scansData] = await Promise.all([
        apiFetch(`/projects/${id}`),
        apiFetch(`/projects/${id}/scans`),
      ]);
      setProject(projectData.project);
      setScans(scansData.scans);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTriggerScan() {
    try {
      setTriggering(true);
      await apiFetch(`/projects/${id}/scan`, { method: 'POST' });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setTriggering(false);
    }
  }

  if (loading) return <p className="p-8">Chargement...</p>;
  if (error) return <p className="p-8 text-red-600">Erreur : {error}</p>;

  const latestCompletedScan = scans.find((s) => s.status === 'completed');

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link to="/dashboard" className="text-blue-600 text-sm">&larr; Retour</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <button
          onClick={handleTriggerScan}
          disabled={triggering}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {triggering ? 'Lancement...' : 'Lancer un scan'}
        </button>
      </div>
      <p className="text-gray-500 mb-6">{project.githubRepo}</p>

      {latestCompletedScan && <SecuritySummaryCard results={latestCompletedScan.results} />}

      <h2 className="text-lg font-semibold mb-3">Historique des scans</h2>
      {scans.length === 0 ? (
        <p className="text-gray-500">Aucun scan encore lancé.</p>
      ) : (
        <ul className="space-y-4">
          {scans.map((scan) => (
            <ScanCard key={scan.id} scan={scan} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProjectDetail;