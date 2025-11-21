-- CodeForge: Distributed Code Execution Platform
-- PostgreSQL Schema

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Execution logs table
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id VARCHAR(255),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  memory_usage_bytes BIGINT,
  exit_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  problem_id VARCHAR(255) NOT NULL,
  code TEXT NOT NULL,
  language VARCHAR(20) NOT NULL CHECK (language IN ('CPP', 'JAVA', 'PYTHON')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SUCCESS', 'RE', 'TLE', 'WA', 'MLE', 'UNKNOWN')),
  execution_time_ms INTEGER,
  response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_problem_id ON submissions(problem_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);

-- User stats for leaderboard (updated transactionally with submissions)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  total_submissions INTEGER DEFAULT 0,
  accepted_submissions INTEGER DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard view for efficient ranking queries
CREATE OR REPLACE VIEW leaderboard AS
  SELECT
    u.id,
    u.username,
    COALESCE(s.accepted_submissions, 0) AS accepted,
    COALESCE(s.total_submissions, 0) AS total,
    COALESCE(s.problems_solved, 0) AS solved,
    RANK() OVER (ORDER BY COALESCE(s.problems_solved, 0) DESC, COALESCE(s.accepted_submissions, 0) DESC) AS rank
  FROM users u
  LEFT JOIN user_stats s ON u.id = s.user_id
  ORDER BY rank ASC;
