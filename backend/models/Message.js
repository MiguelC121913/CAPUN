/**
 * @file Message.js
 * @description Mongoose model for internal messaging between parents and staff.
 *
 * A message targets either a specific user (`toUser`) or all members of a
 * given role (`toRole`). Both are optional at the schema level, but at least
 * one should be set by the sender. This supports both 1-to-1 replies (teacher
 * responding to a specific parent) and role-wide broadcasts (admin announcing
 * to all parents).
 */
const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // direct reply to a specific user
  },
  toRole: {
    type: String,
    enum: ["admin", "teacher", "parent"], // broadcast to all users with this role
  },
  content: { type: String, required: true },
  date: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }, // drives unread-badge rendering on the frontend
});

module.exports = mongoose.model("Message", MessageSchema);
