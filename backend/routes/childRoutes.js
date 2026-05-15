/**
 * @file childRoutes.js
 * @description Routes for creating and retrieving a parent's child record.
 * These routes are scoped to the parent role — parents manage their own child's entry.
 *
 * NOTE: This router is not currently mounted in server.js. Child data access for
 * the production dashboard is handled by GET /api/my-child-data in server.js.
 * Kept here as the planned modular replacement for that inline route.
 *
 *   POST /add — create a new child record linked to the authenticated parent
 *   GET  /    — list all children belonging to the authenticated parent
 */
const express = require("express");
const router = express.Router();
const Child = require("../models/child");
const auth = require("../middleware/auth");

/**
 * POST /api/children/add
 * Creates a new child record and links it to the authenticated parent's account.
 * Auth: required (parent)
 * Body: { childName, age, diagnosis }
 * Response 200: { message, child }
 */
router.post("/add", auth, async (req, res) => {
  try {
    const { childName, age, diagnosis } = req.body;

    const newChild = new Child({
      parentId: req.user.id,
      childName,
      age,
      diagnosis,
    });

    await newChild.save();
    res.json({ message: "Hijo registrado correctamente", child: newChild });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al registrar hijo" });
  }
});

/**
 * GET /api/children/
 * Returns all children linked to the currently authenticated parent.
 * Auth: required (parent)
 * Response 200: Child[]
 */
router.get("/", auth, async (req, res) => {
  try {
    const children = await Child.find({ parentId: req.user.id });
    res.json(children);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener hijos" });
  }
});

module.exports = router;
