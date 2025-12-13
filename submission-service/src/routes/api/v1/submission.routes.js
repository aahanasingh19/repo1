const {
  getSubmissions,
  createSubmission,
} = require("../../../controllers/submission.controller.js");
const rateLimiter = require("../../../middleware/rateLimiter.js");
const authMiddleware = require("../../../middleware/authMiddleware.js");

async function submissionRoutes(fastify, options) {
  // All submission routes require authentication
  fastify.post(
    "/",
    { preHandler: [authMiddleware, rateLimiter] },
    createSubmission
  );
  fastify.get(
    "/:userId",
    { preHandler: [authMiddleware] },
    getSubmissions
  );
}

module.exports = submissionRoutes;
