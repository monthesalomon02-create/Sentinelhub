import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Link, useNavigate } from 'react-router-dom';

function Dashboard() {
  const [repos, setRepos] = useState([]);
  const [connectedRepos, setConnectedRepos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const navigate = useNavigate();

function handleLogout() {
  localStorage.removeItem('token');
  navigate('/login');
}

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
      setProjects(projectsData.projects);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(repo) {
  try {
    setConnectingId(repo.id);
    const data = await apiFetch('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: repo.name,
        githubRepo: repo.fullName,
      }),
    });
    setConnectedRepos((prev) => [...prev, repo.fullName]);
    setProjects((prev) => [...prev, data.project]);
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
      <div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold">Tes repos GitHub</h1>
  <button
    onClick={handleLogout}
    className="text-ink-600 text-sm hover:text-ink-800"
  >
    Déconnexion
  </button>
</div>
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
  <Link
    to={`/projects/${projects.find((p) => p.githubRepo === repo.fullName)?.id}`}
    className="text-terracotta-600 text-sm font-medium hover:text-terracotta-700 hover:underline"
  >
    ✓ Voir le projet
  </Link>
) : (
                <button
                  onClick={() => handleConnect(repo)}
                  disabled={connectingId === repo.id}
                 className="bg-terracotta-500 text-white px-4 py-2 rounded hover:bg-terracotta-600 disabled:opacity-50"
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