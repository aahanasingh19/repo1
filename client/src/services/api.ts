import { ApiResponse, AuthResponse, Problem, Submission, LeaderboardEntry } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const PROBLEM_API = import.meta.env.VITE_PROBLEM_API || 'http://localhost:3000';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

// ——— Auth ———

export async function registerUser(username: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function getProfile() {
  const res = await fetch(`${API_BASE}/api/v1/auth/profile`, {
    headers: getHeaders(),
  });
  return handleResponse<any>(res);
}

// ——— Problems ———

export async function getProblems() {
  const res = await fetch(`${PROBLEM_API}/api/v1/problems`);
  return handleResponse<Problem[]>(res);
}

export async function getProblem(id: string) {
  const res = await fetch(`${PROBLEM_API}/api/v1/problems/${id}`);
  return handleResponse<Problem>(res);
}

// ——— Submissions ———

export async function submitCode(problemId: string, code: string, language: string, userId: string) {
  const res = await fetch(`${API_BASE}/api/v1/submission`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ problemId, code, language, userId }),
  });
  return handleResponse<Submission>(res);
}

export async function getSubmissions(userId: string) {
  const res = await fetch(`${API_BASE}/api/v1/submission/${userId}`, {
    headers: getHeaders(),
  });
  return handleResponse<Submission[]>(res);
}

// ——— Leaderboard ———

export async function getLeaderboard(limit = 50, offset = 0) {
  const res = await fetch(
    `${API_BASE}/api/v1/leaderboard?limit=${limit}&offset=${offset}`,
    { headers: getHeaders() }
  );
  return handleResponse<{ rankings: LeaderboardEntry[]; total: number }>(res);
}
