/**
 * @file Child.js
 * @description Mongoose model representing a student's full academic record.
 *
 * The `boleta` field uses a Mixed-type Object schema so grades and attendance
 * can be stored per month using short string keys (e.g. "sept", "oct", "nov").
 * This avoids a rigid monthly schema and lets the academic year expand dynamically
 * without requiring a schema migration each cycle.
 *
 * Important: when updating `boleta`, callers must invoke `markModified('boleta')`
 * before calling `save()` — Mongoose cannot detect mutations inside Mixed-type fields
 * and will silently skip them otherwise.
 */
const mongoose = require("mongoose");

const ChildSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true, // every child record must be linked to a parent account
  },
  name: { type: String, required: true },
  generalStatus: { type: String, default: "En proceso" }, // overall status shown on the parent dashboard header

  boleta: {
    // Monthly grades keyed by short month name, e.g. { "sept": { "Matemáticas": "E", "Arte": "MB" } }
    grades: { type: Object, default: {} },

    // Monthly attendance summary, e.g. { "sept": { "retardos": 3, "faltas": 0, "asistencias": 18 } }
    attendanceStats: { type: Object, default: {} },
  },

  // Granular daily log — used for quick roll calls; complements the monthly boleta summary
  attendanceLog: [
    {
      date: { type: Date, default: Date.now },
      status: { type: String, enum: ["Asistió", "Falta", "Retardo"] },
    },
  ],

  achievements: [
    {
      title: String,
      date: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("Child", ChildSchema);
