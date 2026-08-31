import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

function Dashboard() {
  const [repos, setRepos] = useState([]);
  const [connectedRepos, setConnectedRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectingId, setConnectingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [reposData, projectsData] = await Promise.all([
        apiFetch('/github/repos'),
        apiFetch('/projects'),
      ]);

      setRepos(reposData.repos);
      setConnectedRepos(projectsData.projects.map((p) => p.githubRepo));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(repo) {
    try {
      setConnectingId(repo.id);
      await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: repo.name,
          githubRepo: repo.fullName,
        }),
      });
      setConnectedRepos((prev) => [...prev, repo.fullName]);
    } catch (err) {
      setError(err.message);
    } finally {
      setConnectingId(null);
    }
  }

  if (loading) return <p className="p-8">Chargement de tes repos...</p>;
  if (error) return <p className="p-8 text-red-600">Erreur : {error}</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Tes repos GitHub</h1>
      <ul className="space-y-3">
        {repos.map((repo) => {
          const isConnected = connectedRepos.includes(repo.fullName);
          return (
            <li
              key={repo.id}
              className="flex items-center justify-between border rounded-lg p-4"
            >
              <div>
                <p className="font-medium">{repo.fullName}</p>
                <p className="text-sm text-gray-500">
                  {repo.language || 'Langage inconnu'} • MAJ le{' '}
                  {new Date(repo.updatedAt).toLocaleDateString()}
                </p>
              </div>
              {isConnected ? (
                <span className="text-green-600 text-sm font-medium">
                  ✓ Connecté
                </span>
              ) : (
                <button
                  onClick={() => handleConnect(repo)}
                  disabled={connectingId === repo.id}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {connectingId === repo.id ? 'Connexion...' : 'Connecter'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Dashboard;