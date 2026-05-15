/**
 * @file Event.js
 * @description Mongoose model for school events and announcements.
 * Events are visible to all authenticated users and are created/deleted by teachers and admins.
 */
const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true }, // the date the event takes place, not the creation date
  description: String,                  // optional extended details shown in the event card
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // audit trail: tracks which staff member published the event
  },
});

module.exports = mongoose.model("Event", EventSchema);
