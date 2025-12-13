const { getLeaderboard } = require("../../../controllers/leaderboard.controller.js");

async function leaderboardRoutes(fastify, options) {
  fastify.get("/", getLeaderboard);
}

module.exports = leaderboardRoutes;
