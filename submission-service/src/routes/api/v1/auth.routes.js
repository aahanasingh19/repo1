const { register, login, getProfile } = require("../../../controllers/auth.controller.js");
const authMiddleware = require("../../../middleware/authMiddleware.js");

async function authRoutes(fastify, options) {
  fastify.post("/register", register);
  fastify.post("/login", login);
  fastify.get("/profile", { preHandler: [authMiddleware] }, getProfile);
}

module.exports = authRoutes;
