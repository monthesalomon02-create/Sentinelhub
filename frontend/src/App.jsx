import { Routes, Route } from 'react-router-dom';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';

function InspectorIllustration() {
  return (
    <svg viewBox="0 0 680 520" className="w-80 h-64 md:w-[420px] md:h-80" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="680" height="520" fill="#fdf8f3" />

      <rect x="60" y="80" width="160" height="120" rx="6" fill="#ecdfd2" transform="rotate(-8 140 140)" />
      <rect x="60" y="80" width="60" height="18" rx="4" fill="#ddc9b4" transform="rotate(-8 140 140)" />

      <rect x="470" y="330" width="150" height="110" rx="6" fill="#ecdfd2" transform="rotate(6 545 385)" />
      <rect x="470" y="330" width="56" height="16" rx="4" fill="#ddc9b4" transform="rotate(6 545 385)" />

      <circle cx="90" cy="380" r="6" fill="#c2542f" opacity="0.5" />
      <circle cx="600" cy="130" r="7" fill="#7a9471" opacity="0.5" />
      <circle cx="620" cy="230" r="4" fill="#c2542f" opacity="0.4" />
      <circle cx="70" cy="250" r="5" fill="#7a9471" opacity="0.4" />

      <rect x="330" y="150" width="220" height="150" rx="10" fill="#3d2b1f" />
      <rect x="330" y="150" width="220" height="28" rx="10" fill="#2b1d13" />
      <circle cx="345" cy="164" r="4" fill="#c2542f" />
      <circle cx="358" cy="164" r="4" fill="#ddc9b4" />
      <line x1="350" y1="205" x2="480" y2="205" stroke="#7a9471" strokeWidth="3" strokeLinecap="round" />
      <line x1="350" y1="222" x2="520" y2="222" stroke="#ddc9b4" strokeWidth="3" strokeLinecap="round" />
      <line x1="350" y1="239" x2="440" y2="239" stroke="#c2542f" strokeWidth="3" strokeLinecap="round" />
      <line x1="350" y1="256" x2="500" y2="256" stroke="#ddc9b4" strokeWidth="3" strokeLinecap="round" />
      <line x1="350" y1="273" x2="410" y2="273" stroke="#7a9471" strokeWidth="3" strokeLinecap="round" />

      <rect x="240" y="330" width="380" height="4" fill="#ddc9b4" />

      <g transform="translate(250,180)">
        <ellipse cx="80" cy="330" rx="90" ry="16" fill="#3d2b1f" opacity="0.08" />
        <path d="M 20 140 Q 15 100 60 90 L 100 90 Q 145 100 140 140 L 150 320 L 10 320 Z" fill="#883521" />
        <path d="M 80 90 L 100 90 Q 145 100 140 140 L 150 320 L 100 320 L 90 140 Z" fill="#692817" />
        <rect x="0" y="150" width="20" height="90" rx="8" fill="#883521" />
        <rect x="140" y="150" width="20" height="90" rx="8" fill="#692817" />
        <circle cx="80" cy="55" r="38" fill="#e0ad82" />
        <path d="M 30 45 Q 80 5 130 45 L 130 40 Q 80 2 30 40 Z" fill="#4a2317" />
        <rect x="20" y="30" width="120" height="20" rx="10" fill="#4a2317" />
        <rect x="20" y="42" width="120" height="8" fill="#c2542f" />
        <path d="M 34 48 Q 80 20 126 48 L 126 44 Q 80 16 34 44 Z" fill="#3d2b1f" />
        <circle cx="68" cy="55" r="3" fill="#3d2b1f" />
        <circle cx="94" cy="55" r="3" fill="#3d2b1f" />
        <path d="M 64 68 Q 80 76 98 68" stroke="#3d2b1f" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        <g transform="translate(150,120) rotate(35)">
          <circle cx="0" cy="0" r="42" fill="#f7ede1" fillOpacity="0.55" stroke="#c2542f" strokeWidth="5" />
          <line x1="30" y1="30" x2="70" y2="70" stroke="#883521" strokeWidth="7" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="flex flex-col md:flex-row items-center gap-12 max-w-4xl">
        <InspectorIllustration />
        <div className="text-center md:text-left">
          <h1 className="font-display text-4xl font-semibold text-ink-800 mb-3">
            Inspecteur Mr Code
          </h1>
          <p className="text-ink-600 mb-8 max-w-sm">
            Connecte ton dépôt GitHub et laisse l'inspecteur passer ton code à la loupe : dépendances, secrets, qualité, Docker et CI/CD.
          </p>
          
           <a href="http://localhost:5000/api/auth/github" className="inline-block bg-ink-800 text-white px-6 py-3 rounded-lg hover:bg-ink-900">
  Se connecter avec GitHub
</a>
        </div>
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
      <Route path="/projects/:id" element={<ProjectDetail />} />
    </Routes>
  );
}

export default App;