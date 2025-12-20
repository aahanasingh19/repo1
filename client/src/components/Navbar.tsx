import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <span className="brand-icon">⚡</span>
          <span className="brand-text">CodeForge</span>
        </Link>
      </div>
      <div className="navbar-links">
        <Link to="/problems" className="nav-link">Problems</Link>
        <Link to="/leaderboard" className="nav-link">Leaderboard</Link>
        {user ? (
          <>
            <Link to="/submissions" className="nav-link">My Submissions</Link>
            <div className="nav-user">
              <span className="nav-username">{user.username}</span>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm">Logout</button>
            </div>
          </>
        ) : (
          <div className="nav-auth">
            <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
