const fp = require("fastify-plugin");
const fcors = require("@fastify/cors");
const swagger = require("@fastify/swagger");
const swaggerUi = require("@fastify/swagger-ui");

const servicePlugin = require("./services/plugin.services.js");
const repopsitoryPlugin = require("./repositories/plugin.repositories.js");
const apiRoutes = require("./routes/api/apiRoutes");
const systemRoutes = require("./routes/api/v1/system.routes.js");

async function app(fastify, options) {
  await fastify.register(fcors, {
    origin: true,
    credentials: true,
  });

  // Swagger API Documentation
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "CodeForge API",
        description: "Distributed Code Execution Platform — Submission, Auth & Leaderboard API",
        version: "1.0.0",
      },
      servers: [
        { url: "http://localhost:4000", description: "Local" },
      ],
      tags: [
        { name: "Auth", description: "User authentication endpoints" },
        { name: "Submissions", description: "Code submission endpoints" },
        { name: "Leaderboard", description: "User rankings" },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    staticCSP: true,
  });

  await fastify.register(repopsitoryPlugin);
  await fastify.register(servicePlugin);
  await fastify.register(apiRoutes, { prefix: "/api" });
  await fastify.register(systemRoutes);
}

module.exports = fp(app);
