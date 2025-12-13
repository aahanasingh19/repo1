const authService = require("../services/AuthService.js");

/**
 * JWT authentication middleware for Fastify.
 * Extracts token from Authorization header and attaches decoded user to request.
 */
async function authMiddleware(request, reply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.code(401).send({
      success: false,
      message: "Authentication required",
      error: "Missing or invalid Authorization header",
      data: {},
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = authService.verifyToken(token);
    request.user = decoded;
  } catch (error) {
    return reply.code(401).send({
      success: false,
      message: error.message || "Invalid token",
      error: "Authentication failed",
      data: {},
    });
  }
}

module.exports = authMiddleware;
