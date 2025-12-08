const pool = require("../config/postgres.config.js");

async function getLeaderboard(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(
      "SELECT * FROM leaderboard LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    const countResult = await pool.query("SELECT COUNT(*) FROM users");

    return res.status(200).send({
      success: true,
      message: "Leaderboard fetched",
      error: {},
      data: {
        rankings: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
      },
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Failed to fetch leaderboard",
      error: error.message,
      data: {},
    });
  }
}

module.exports = { getLeaderboard };
