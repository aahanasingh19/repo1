const pool = require("../config/postgres.config.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "codeforge_jwt_secret_key_2024";
const JWT_EXPIRY = "7d";
const SALT_ROUNDS = 12;

class AuthService {
  async register(username, email, password) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check for existing user
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1 OR username = $2",
        [email, username]
      );
      if (existingUser.rows.length > 0) {
        throw { statusCode: 409, message: "User already exists with this email or username" };
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const result = await client.query(
        `INSERT INTO users (username, email, password_hash)
         VALUES ($1, $2, $3) RETURNING id, username, email, created_at`,
        [username, email, passwordHash]
      );

      // Initialize user stats
      await client.query(
        "INSERT INTO user_stats (user_id) VALUES ($1)",
        [result.rows[0].id]
      );

      await client.query("COMMIT");

      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
        expiresIn: JWT_EXPIRY,
      });

      return { user, token };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async login(email, password) {
    const result = await pool.query(
      "SELECT id, username, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      throw { statusCode: 401, message: "Invalid email or password" };
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      throw { statusCode: 401, message: "Invalid email or password" };
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    return {
      user: { id: user.id, username: user.username, email: user.email },
      token,
    };
  }

  async getProfile(userId) {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.created_at,
              COALESCE(s.total_submissions, 0) AS total_submissions,
              COALESCE(s.accepted_submissions, 0) AS accepted_submissions,
              COALESCE(s.problems_solved, 0) AS problems_solved
       FROM users u
       LEFT JOIN user_stats s ON u.id = s.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw { statusCode: 404, message: "User not found" };
    }

    return result.rows[0];
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      throw { statusCode: 401, message: "Invalid or expired token" };
    }
  }
}

module.exports = new AuthService();
