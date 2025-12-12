const pool = require("../config/postgres.config.js");

/**
 * PostgreSQL-backed submission repository.
 * Uses transactions to atomically insert submissions and update user statistics.
 */
class SubmissionRepository {
  async createSubmission(submission) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertQuery = `
        INSERT INTO submissions (user_id, problem_id, code, language, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const result = await client.query(insertQuery, [
        submission.userId,
        submission.problemId,
        submission.code,
        submission.language,
        "PENDING",
      ]);

      // Atomically update user submission stats (upsert)
      const statsQuery = `
        INSERT INTO user_stats (user_id, total_submissions)
        VALUES ($1, 1)
        ON CONFLICT (user_id) DO UPDATE SET
          total_submissions = user_stats.total_submissions + 1,
          updated_at = NOW()
      `;
      await client.query(statsQuery, [submission.userId]);

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Failed to create submission:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getSubmissions(userId) {
    const query = `
      SELECT id, user_id, problem_id, language, status, response, execution_time_ms, created_at
      FROM submissions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async updateSubmissionStatus(submissionId, status, response) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const updateQuery = `
        UPDATE submissions
        SET status = $1, response = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      const result = await client.query(updateQuery, [
        status,
        JSON.stringify(response || null),
        submissionId,
      ]);

      // If accepted, atomically increment accepted count and track solved problems
      if (status === "SUCCESS" && result.rows.length > 0) {
        const sub = result.rows[0];

        // Increment accepted_submissions
        await client.query(
          `INSERT INTO user_stats (user_id, accepted_submissions)
           VALUES ($1, 1)
           ON CONFLICT (user_id) DO UPDATE SET
             accepted_submissions = user_stats.accepted_submissions + 1,
             updated_at = NOW()`,
          [sub.user_id]
        );

        // Track unique problems solved
        const solvedCheck = await client.query(
          `SELECT 1 FROM submissions
           WHERE user_id = $1 AND problem_id = $2 AND status = 'SUCCESS' AND id != $3
           LIMIT 1`,
          [sub.user_id, sub.problem_id, submissionId]
        );

        if (solvedCheck.rows.length === 0) {
          // First accepted submission for this problem — increment problems_solved
          await client.query(
            `UPDATE user_stats SET problems_solved = problems_solved + 1, updated_at = NOW()
             WHERE user_id = $1`,
            [sub.user_id]
          );
        }
      }

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Failed to update submission status:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = SubmissionRepository;
