import { Routes, Route } from 'react-router-dom';
import AuthCallback from './pages/AuthCallback';

function Dashboard() {
  return <h1>Dashboard (à construire)</h1>;
}

function Login() {
  return (
    <div>
      <h1>Connexion</h1>
      <a href="http://localhost:5000/api/auth/github">Se connecter avec GitHub</a>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;