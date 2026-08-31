import { Routes, Route } from 'react-router-dom';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';

function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-6">Inspecteur Mr Code</h1>
        <a href="http://localhost:5000/api/auth/github" className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800">
          Se connecter avec GitHub
        </a>
      </div>
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