/**
 * @file User.js
 * @description Mongoose model for user accounts.
 *
 * Three roles exist in the system:
 *   - parent:  can view their child's academic record and exchange messages with staff
 *   - teacher: can update grades, attendance, and achievements for all students
 *   - admin:   full access, including user account management
 *
 * Reset token fields are sparse — only populated during an active password recovery flow
 * and cleared immediately after a successful reset to prevent reuse.
 */
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true, // stored as a bcrypt hash — never in plaintext
  },
  role: {
    type: String,
    enum: ["admin", "teacher", "parent"],
    default: "parent",
  },
  isActive: {
    type: Boolean,
    default: true, // accounts can be soft-disabled without deletion
  },
  lastLogin: {
    type: Date, // updated on every successful authentication
  },
  date: {
    type: Date,
    default: Date.now, // account creation timestamp
  },
  resetPasswordToken: {
    type: String, // single-use cryptographic token for the password recovery flow
  },
  resetPasswordExpires: {
    type: Date, // token is valid for 1 hour after generation
  },
});

module.exports = mongoose.model("User", UserSchema);
