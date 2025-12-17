import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProblems } from '../services/api';
import { Problem } from '../types';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444',
};

export default function Problems() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getProblems();
      setProblems(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  const filtered = problems.filter((p) => {
    const matchesDifficulty = filter === 'all' || p.difficulty?.toLowerCase() === filter;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchesDifficulty && matchesSearch;
  });

  if (loading) {
    return (
      <div className="loading-fullscreen">
        <div className="spinner" />
        <p>Loading problems...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Problems</h1>
        <p className="page-subtitle">{problems.length} problems available</p>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search problems..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-buttons">
          {['all', 'easy', 'medium', 'hard'].map((level) => (
            <button
              key={level}
              className={`filter-btn ${filter === level ? 'active' : ''}`}
              onClick={() => setFilter(level)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button className="btn btn-ghost btn-sm" onClick={loadProblems}>Retry</button>
        </div>
      )}

      {!error && filtered.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>No problems found</p>
        </div>
      )}

      <div className="problems-list">
        {filtered.map((problem) => (
          <Link key={problem._id} to={`/problems/${problem._id}`} className="problem-card">
            <div className="problem-info">
              <h3 className="problem-title">{problem.title}</h3>
              <span className="problem-meta">
                {problem.testCases?.length || 0} test cases
              </span>
            </div>
            <span
              className="difficulty-badge"
              style={{ backgroundColor: DIFFICULTY_COLORS[problem.difficulty?.toLowerCase()] || '#6b7280' }}
            >
              {problem.difficulty || 'Unknown'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
