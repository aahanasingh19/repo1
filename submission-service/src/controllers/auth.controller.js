const { StatusCodes } = require("http-status-codes");
const authService = require("../services/AuthService.js");

async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Username, email, and password are required",
        error: "Missing fields",
        data: {},
      });
    }

    if (password.length < 6) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Password must be at least 6 characters",
        error: "Weak password",
        data: {},
      });
    }

    const result = await authService.register(username, email, password);
    return res.status(StatusCodes.CREATED).send({
      success: true,
      message: "Registration successful",
      error: {},
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).send({
      success: false,
      message: error.message || "Registration failed",
      error: error.message,
      data: {},
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        success: false,
        message: "Email and password are required",
        error: "Missing fields",
        data: {},
      });
    }

    const result = await authService.login(email, password);
    return res.status(StatusCodes.OK).send({
      success: true,
      message: "Login successful",
      error: {},
      data: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).send({
      success: false,
      message: error.message || "Login failed",
      error: error.message,
      data: {},
    });
  }
}

async function getProfile(req, res) {
  try {
    const profile = await authService.getProfile(req.user.userId);
    return res.status(StatusCodes.OK).send({
      success: true,
      message: "Profile fetched",
      error: {},
      data: profile,
    });
  } catch (error) {
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).send({
      success: false,
      message: error.message || "Failed to fetch profile",
      error: error.message,
      data: {},
    });
  }
}

module.exports = { register, login, getProfile };
