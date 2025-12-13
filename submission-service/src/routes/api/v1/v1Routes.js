const submissionRoutes = require("./submission.routes.js");
const authRoutes = require("./auth.routes.js");
const leaderboardRoutes = require("./leaderboard.routes.js");

async function v1Routes(fastify, options) {
  fastify.register(authRoutes, { prefix: "/auth" });
  fastify.register(submissionRoutes, { prefix: "/submission" });
  fastify.register(leaderboardRoutes, { prefix: "/leaderboard" });
}

module.exports = v1Routes;
