/**
 * @file passwordRoutes.js
 * @description Routes for the two-step password recovery flow.
 * Mounted at /api/password in server.js.
 *
 * Both endpoints are intentionally public (no JWT required) — the user
 * cannot authenticate when they have forgotten their password.
 *
 *   POST /forgot-password — generate a reset token and email the recovery link
 *   POST /reset-password  — validate the token and update the password
 */
const express = require("express");
const router = express.Router();
const {
  requestPasswordReset,
  resetPassword,
} = require("../controllers/passwordController");

/** POST /api/password/forgot-password — Auth: none */
router.post("/forgot-password", requestPasswordReset);

/** POST /api/password/reset-password — Auth: none (the token in the body acts as the credential) */
router.post("/reset-password", resetPassword);

module.exports = router;
