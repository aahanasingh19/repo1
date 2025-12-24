export interface User {
  id: string;
  username: string;
  email: string;
  created_at?: string;
  total_submissions?: number;
  accepted_submissions?: number;
  problems_solved?: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Problem {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  testCases: TestCase[];
  codeStubs: CodeStub[];
  editorial?: string;
  createdAt?: string;
}

export interface TestCase {
  input: string;
  output: string;
}

export interface CodeStub {
  language: string;
  startSnippet: string;
  endSnippet: string;
  userSnippet: string;
}

export interface Submission {
  id: string;
  user_id: string;
  problem_id: string;
  language: string;
  status: string;
  response: TestCaseResult[] | null;
  execution_time_ms: number | null;
  created_at: string;
}

export interface TestCaseResult {
  input: string;
  expected: string;
  actual: string;
  status: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  accepted: number;
  total: number;
  solved: number;
  rank: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  error: unknown;
  data: T;
}
