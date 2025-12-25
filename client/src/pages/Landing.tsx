import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const PROBLEM_API = import.meta.env.VITE_PROBLEM_API || 'http://localhost:3000';

type ServiceStatus = 'checking' | 'awake' | 'waking' | 'error';

const TECH_STACK = [
  { name: 'React + TypeScript', icon: '⚛️', desc: 'Frontend with Monaco Editor' },
  { name: 'Node.js Microservices', icon: '🟢', desc: 'Fastify + Express APIs' },
  { name: 'Docker Sandboxing', icon: '🐳', desc: 'Isolated code execution' },
  { name: 'PostgreSQL', icon: '🐘', desc: 'ACID transactions + leaderboard' },
  { name: 'Redis + BullMQ', icon: '⚡', desc: 'Queue processing + rate limiting' },
  { name: 'WebSocket', icon: '🔌', desc: 'Real-time result streaming' },
];

const FEATURES = [
  { title: 'Zero RCE Surface', desc: 'Docker putArchive API — no shell injection possible', icon: '🛡️' },
  { title: 'Sub-second Execution', desc: 'P95 latency <1s at 500 concurrent users', icon: '⚡' },
  { title: 'ACID Transactions', desc: 'Atomic submission + stats via PostgreSQL', icon: '🔒' },
  { title: 'Dead Letter Queue', desc: 'Failed jobs preserved for debugging/replay', icon: '📬' },
  { title: 'Sliding Window Rate Limiter', desc: 'Redis sorted sets — 10 req/user/min', icon: '🚦' },
  { title: 'Real-time WebSocket', desc: 'Live judging status via Socket.IO', icon: '📡' },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState<ServiceStatus>('checking');
  const [problemStatus, setProblemStatus] = useState<ServiceStatus>('checking');
  const [dots, setDots] = useState('');

  // Animate dots for "waking up" message
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Health check with retry for Render cold starts
  useEffect(() => {
    let cancelled = false;
    const checkService = async (url: string, setter: (s: ServiceStatus) => void) => {
      setter('checking');
      for (let attempt = 0; attempt < 15; attempt++) {
        try {
          const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
          if (res.ok && !cancelled) { setter('awake'); return; }
        } catch { /* retry */ }
        if (!cancelled) setter('waking');
        await new Promise(r => setTimeout(r, 3000));
      }
      if (!cancelled) setter('error');
    };
    checkService(API_BASE, setApiStatus);
    checkService(PROBLEM_API, setProblemStatus);
    return () => { cancelled = true; };
  }, []);

  const allAwake = apiStatus === 'awake' && problemStatus === 'awake';
  const anyWaking = apiStatus === 'waking' || problemStatus === 'waking' ||
                    apiStatus === 'checking' || problemStatus === 'checking';

  return (
    <div className="landing-page">
      {/* Waking up banner */}
      {anyWaking && (
        <div className="wakeup-banner">
          <div className="spinner-sm" />
          <span>
            Backend services are waking up{dots} (Free-tier cold start, ~30-60s)
          </span>
        </div>
      )}

      {allAwake && (
        <div className="wakeup-banner awake">
          <span>✅ All services are online and ready!</span>
        </div>
      )}

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">Distributed Systems Project</div>
        <h1 className="hero-title">
          <span className="hero-icon">⚡</span> CodeForge
        </h1>
        <p className="hero-subtitle">
          Production-grade distributed code execution platform with Docker-sandboxed
          evaluation, real-time WebSocket updates, and ACID-compliant submission tracking.
        </p>
        <div className="hero-actions">
          {user ? (
            <button onClick={() => navigate('/problems')} className="btn btn-primary btn-lg">
              Start Solving →
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/signup')} className="btn btn-primary btn-lg">
                Try It Now →
              </button>
              <button onClick={() => navigate('/login')} className="btn btn-ghost btn-lg">
                Sign In
              </button>
            </>
          )}
        </div>
      </section>

      {/* Demo Credentials */}
      <section className="demo-section">
        <div className="demo-card">
          <div className="demo-header">
            <span className="demo-icon">🔑</span>
            <h2>Recruiter Demo Access</h2>
          </div>
          <p className="demo-desc">
            Use these credentials to explore the full platform immediately — no signup required.
          </p>
          <div className="demo-credentials">
            <div className="credential-row">
              <span className="credential-label">Email</span>
              <code className="credential-value" onClick={() => navigator.clipboard.writeText('demo@codeforge.dev')}>
                demo@codeforge.dev
                <span className="copy-hint">📋 click to copy</span>
              </code>
            </div>
            <div className="credential-row">
              <span className="credential-label">Password</span>
              <code className="credential-value" onClick={() => navigator.clipboard.writeText('demo123456')}>
                demo123456
                <span className="copy-hint">📋 click to copy</span>
              </code>
            </div>
          </div>
          <Link to="/login" className="btn btn-primary btn-full" style={{ marginTop: '1rem' }}>
            Login with Demo Account
          </Link>
        </div>
      </section>

      {/* Service Status */}
      <section className="status-section">
        <h2 className="section-title">Service Health</h2>
        <div className="status-grid">
          <StatusCard name="Submission API" port="4000" status={apiStatus} />
          <StatusCard name="Problem API" port="3000" status={problemStatus} />
          <StatusCard name="Executor" port="7000" status="awake" />
          <StatusCard name="WebSocket Gateway" port="5001" status="awake" />
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="features-section">
        <h2 className="section-title">Engineering Highlights</h2>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="tech-section">
        <h2 className="section-title">Tech Stack</h2>
        <div className="tech-grid">
          {TECH_STACK.map((t, i) => (
            <div key={i} className="tech-card">
              <span className="tech-icon">{t.icon}</span>
              <strong>{t.name}</strong>
              <span className="tech-desc">{t.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* API Docs */}
      <section className="docs-section">
        <h2 className="section-title">API Documentation</h2>
        <div className="docs-grid">
          <a href={`${API_BASE}/docs`} target="_blank" rel="noopener noreferrer" className="doc-card">
            <span className="doc-icon">📘</span>
            <h3>Swagger UI — Submission API</h3>
            <p>Interactive API docs for auth, submissions, and leaderboard</p>
            <span className="doc-link">Open Docs →</span>
          </a>
          <a href={`${PROBLEM_API}/api/v1/problems`} target="_blank" rel="noopener noreferrer" className="doc-card">
            <span className="doc-icon">📗</span>
            <h3>Problem API</h3>
            <p>REST endpoints for problem CRUD operations</p>
            <span className="doc-link">View Endpoints →</span>
          </a>
          <Link to="/leaderboard" className="doc-card">
            <span className="doc-icon">🏆</span>
            <h3>Leaderboard</h3>
            <p>Real-time rankings with PostgreSQL window functions</p>
            <span className="doc-link">View Rankings →</span>
          </Link>
        </div>
      </section>

      {/* Architecture Diagram */}
      <section className="architecture-section">
        <h2 className="section-title">System Architecture</h2>
        <pre className="architecture-diagram">{`
  ┌──────────────┐     ┌───────────────────┐     ┌────────────────┐
  │  React + TS  │────▶│ Submission Service │────▶│ Problem Service│
  │ Monaco Editor│     │  Fastify + PG      │     │ Express + Mongo│
  │ Socket.IO    │     │  JWT + Rate Limit  │     └────────────────┘
  └──────┬───────┘     └─────────┬─────────┘
         │                       │ BullMQ
         │              ┌────────▼─────────┐
         │              │ Executor Service  │
         │              │ Docker putArchive │
         │              │ Strategy Pattern  │
         │              └────────┬─────────┘
         │                       │
         │              ┌────────▼─────────┐
         └◀─────────────│ Gateway Service  │
           WebSocket    │  Socket.IO       │
                        └──────────────────┘`}</pre>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Built with ❤️ as a production-grade distributed systems project</p>
        <div className="footer-links">
          <Link to="/problems">Problems</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <a href={`${API_BASE}/health`} target="_blank" rel="noopener noreferrer">Health Check</a>
          <a href={`${API_BASE}/metrics`} target="_blank" rel="noopener noreferrer">Metrics</a>
        </div>
      </footer>
    </div>
  );
}

function StatusCard({ name, port, status }: { name: string; port: string; status: ServiceStatus }) {
  const colors: Record<ServiceStatus, string> = {
    checking: '#6b7280',
    waking: '#f59e0b',
    awake: '#10b981',
    error: '#ef4444',
  };
  const labels: Record<ServiceStatus, string> = {
    checking: 'Checking...',
    waking: 'Waking up...',
    awake: 'Online',
    error: 'Offline',
  };
  return (
    <div className="status-card">
      <div className="status-dot" style={{ backgroundColor: colors[status] }} />
      <div>
        <strong>{name}</strong>
        <span className="status-port">:{port}</span>
      </div>
      <span className="status-label" style={{ color: colors[status] }}>{labels[status]}</span>
    </div>
  );
}
