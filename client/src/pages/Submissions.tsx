import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSubmissions } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Submission } from '../types';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  SUCCESS: { bg: '#dcfce7', text: '#166534' },
  WA: { bg: '#fee2e2', text: '#991b1b' },
  TLE: { bg: '#fef3c7', text: '#92400e' },
  RE: { bg: '#fee2e2', text: '#991b1b' },
  MLE: { bg: '#fef3c7', text: '#92400e' },
  PENDING: { bg: '#e5e7eb', text: '#374151' },
};

export default function Submissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getSubmissions(user.id)
      .then((res) => setSubmissions(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="loading-fullscreen">
        <div className="spinner" />
        <p>Loading submissions...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Submissions</h1>
        <p className="page-subtitle">{submissions.length} total submissions</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!error && submissions.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <p>No submissions yet</p>
          <Link to="/problems" className="btn btn-primary">Solve a Problem</Link>
        </div>
      )}

      {submissions.length > 0 && (
        <div className="submissions-table-wrapper">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Language</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => {
                const style = STATUS_STYLES[sub.status] || STATUS_STYLES.PENDING;
                return (
                  <tr key={sub.id}>
                    <td>
                      <Link to={`/problems/${sub.problem_id}`} className="problem-link">
                        {sub.problem_id.substring(0, 8)}...
                      </Link>
                    </td>
                    <td><span className="lang-tag">{sub.language}</span></td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: style.bg, color: style.text }}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(sub.created_at).toLocaleString()}
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
