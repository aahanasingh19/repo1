import { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/api';
import { LeaderboardEntry } from '../types';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getLeaderboard(50, 0)
      .then((res) => setEntries(res.data.rankings || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-fullscreen">
        <div className="spinner" />
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Leaderboard</h1>
        <p className="page-subtitle">Top performers on CodeForge</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!error && entries.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🏆</span>
          <p>No rankings yet. Be the first to solve a problem!</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="leaderboard-table-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>Problems Solved</th>
                <th>Accepted</th>
                <th>Total</th>
                <th>Acceptance Rate</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isMe = user?.id === entry.id;
                const rate = entry.total > 0
                  ? ((entry.accepted / entry.total) * 100).toFixed(1)
                  : '0.0';
                return (
                  <tr key={entry.id} className={isMe ? 'highlight-row' : ''}>
                    <td>
                      <span className={`rank-badge rank-${entry.rank <= 3 ? entry.rank : 'default'}`}>
                        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                      </span>
                    </td>
                    <td className="username-cell">
                      {entry.username}
                      {isMe && <span className="you-badge">You</span>}
                    </td>
                    <td><strong>{entry.solved}</strong></td>
                    <td className="accepted-cell">{entry.accepted}</td>
                    <td>{entry.total}</td>
                    <td>
                      <div className="rate-bar-wrapper">
                        <div className="rate-bar" style={{ width: `${rate}%` }} />
                        <span className="rate-text">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
