import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Components
import Home from './components/Home';
import ZapScanner from './components/tools/ZapScanner';
import NmapScanner from './components/tools/NmapScanner';
import WiresharkAnalyzer from './components/tools/WiresharkAnalyzer';
import JohnTheRipper from './components/tools/JohnTheRipper';

function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="ll-nav">
        <div className="ll-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <h1 className="ll-brand" style={{ fontSize: 18, margin: 0 }}>
                <span className="ll-accent">●</span> LinkLens
              </h1>
              <div style={{ display: 'flex', gap: 12 }}>
                <NavLink to="/">Home</NavLink>
                <NavLink to="/zap">OWASP ZAP</NavLink>
                <NavLink to="/nmap">Nmap</NavLink>
                <NavLink to="/wireshark">Wireshark</NavLink>
                <NavLink to="/john">John the Ripper</NavLink>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="ll-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/zap" element={<ZapScanner />} />
          <Route path="/nmap" element={<NmapScanner />} />
          <Route path="/wireshark" element={<WiresharkAnalyzer />} />
          <Route path="/john" element={<JohnTheRipper />} />
        </Routes>
      </main>
    </div>
  );
}

// Helper component for navigation links
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="ll-link">
      {children}
    </Link>
  );
}

export default App;
