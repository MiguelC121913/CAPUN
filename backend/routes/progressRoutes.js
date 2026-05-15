/**
 * @file progressRoutes.js
 * @description Routes for the teacher progress-tracking dashboard.
 * All routes require JWT authentication (applied once via router.use).
 *
 * NOTE: This router is not currently mounted in server.js. The teacher panel
 * uses /api/teacher/* routes defined inline in server.js. This file is the
 * planned home for the Progress feature once the Progress model is implemented.
 *
 *   GET  /statistics        — role-aware dashboard stats (parent vs teacher/admin)
 *   GET  /children          — full student roster (teacher/admin only)
 *   POST /progress          — log a new progress entry (teacher/admin only)
 *   GET  /progress/:childId — progress history for one child (with ownership check)
 */
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  createProgress,
  getChildProgress,
  getAllChildren,
  getStatistics,
} = require("../controllers/progressController");

// Apply auth middleware to every route in this file
router.use(auth);

/** GET /api/progress/statistics — Auth: required (response varies by role) */
router.get("/statistics", getStatistics);

/** GET /api/progress/children — Auth: required (teacher/admin) */
router.get("/children", getAllChildren);

/** POST /api/progress/progress — Auth: required (teacher/admin) */
router.post("/progress", createProgress);

/** GET /api/progress/progress/:childId — Auth: required (parent sees own child only) */
router.get("/progress/:childId", getChildProgress);

module.exports = router;
