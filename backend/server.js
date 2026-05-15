/**
 * @file server.js
 * @description Main entry point for the CAPUN REST API.
 *
 * Architecture overview:
 *   Frontend (GitHub Pages) — attaches JWT to every request via Authorization header
 *     ↓  HTTPS / REST
 *   This Express server — validates tokens, enforces role-based access, queries MongoDB
 *     ↓  Mongoose ODM
 *   MongoDB Atlas — persists users, student records, messages, and events
 *
 * Route groups:
 *   Auth      POST /api/register, POST /api/login
 *   Parent    GET  /api/my-child-data, /api/messages, /api/events
 *   Teacher   GET|PUT|POST|DELETE /api/teacher/*
 *   Admin     GET|POST|PUT|DELETE /api/admin/users/*
 *   Password  POST /api/password/* (delegated to routes/passwordRoutes.js)
 */
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Child = require("./models/Child");
const Message = require("./models/Message");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Restrict to the deployed frontend and local dev server.
// "null" covers file:// origins used when opening HTML files directly in a browser.
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  process.env.FRONTEND_URL,
  "null",
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── BODY PARSING ──────────────────────────────────────────────────────────────
app.use(express.json());

// ── DATABASE ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(err => { console.error("❌ Error MongoDB:", err); process.exit(1); });

// ── JWT SECRET GUARD ──────────────────────────────────────────────────────────
// Fail fast at startup rather than silently issuing unsigned tokens at runtime.
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is not defined in environment variables");
  process.exit(1);
}
const SECRET_KEY = process.env.JWT_SECRET;

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
/**
 * Verifies a JWT sent in the Authorization header and attaches the decoded
 * payload to the request so downstream handlers can read `userId` and
 * `userRole` without an extra database query.
 *
 * The token is expected as a raw JWT string (no "Bearer " prefix), matching
 * how the frontend stores and sends it from localStorage.
 *
 * @param {import('express').Request}      req  - Expects `headers.authorization` to be the raw JWT.
 * @param {import('express').Response}     res  - 403 if token absent; 401 if invalid or expired.
 * @param {import('express').NextFunction} next - Called on successful verification.
 */
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ error: "Token requerido" });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Token inválido" });
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
};

// ═════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES — public, no token required
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/register
 * Creates a new parent account. If `childName` is supplied, also seeds the
 * linked Child document so the parent dashboard has data to render immediately.
 * Staff accounts (teacher/admin) are created exclusively through the admin panel.
 *
 * Auth: none
 * Body: { email, password, childName? }
 * Response 200: { message }
 * Response 400: email already registered
 */
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, childName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "El correo ya está registrado" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword,
      role: "parent",
      name: req.body.nombre || "Usuario",
    });
    await newUser.save();

    // Automatically create the child record so the dashboard loads without errors
    if (childName) {
      const newChild = new Child({
        parentId: newUser._id,
        name: childName,
        generalStatus: "En proceso",
        areas: {
          lenguaje: { percentage: 0, feedback: "Esperando evaluación" },
          motor: { percentage: 0, feedback: "Esperando evaluación" },
          social: { percentage: 0, feedback: "Esperando evaluación" },
          cognitivo: { percentage: 0, feedback: "Esperando evaluación" },
        },
      });
      await newChild.save();
    }

    res.json({ message: "Usuario registrado con éxito" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

/**
 * POST /api/login
 * Authenticates a user and returns a signed JWT plus profile data.
 * For parent accounts, the child's name is included in the response so the
 * dashboard can display a greeting without a second round-trip.
 *
 * Auth: none
 * Body: { email, password }
 * Response 200: { token, role, name, childName }
 * Response 404: user not found
 * Response 401: wrong password
 */
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ error: "Contraseña incorrecta" });

    // Fetch child name for parents to pre-populate the dashboard greeting
    let childName = "";
    if (user.role === "parent") {
      const child = await Child.findOne({ parentId: user._id });
      if (child) childName = child.name;
    }

    const token = jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, {
      expiresIn: "24h",
    });

    res.json({ token, role: user.role, name: user.name, childName });
  } catch (error) {
    res.status(500).json({ error: "Error en login" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PARENT DASHBOARD ROUTES — JWT required (any role)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/my-child-data
 * Dual-purpose endpoint that returns a student's full academic record.
 *
 * - Parents: resolves to their own child via the JWT userId.
 * - Teachers/Admins: pass `?studentId=<id>` to preview any student's dashboard.
 *
 * This single endpoint serves both roles to avoid duplicating the Child
 * serialization logic across separate parent and staff routes.
 *
 * Auth: required (any role)
 * Query: studentId? — Child _id (teacher/admin only)
 * Response 200: Child document
 * Response 404: no child found for this parent or studentId
 */
app.get("/api/my-child-data", verifyToken, async (req, res) => {
  try {
    let child = null;

    if ((req.userRole === "teacher" || req.userRole === "admin") && req.query.studentId) {
      child = await Child.findById(req.query.studentId);
    } else {
      child = await Child.findOne({ parentId: req.userId });
    }

    if (!child) return res.status(404).json({ message: "No se encontró información del alumno" });

    res.json(child);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener datos" });
  }
});

/**
 * GET /api/events
 * Returns all events sorted chronologically (ascending by date).
 * Auth: required (any role)
 * Response 200: Event[] — empty array if no events exist
 */
app.get("/api/events", verifyToken, async (req, res) => {
  try {
    const Event = require("./models/Event");
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (error) {
    // Graceful fallback so a missing Event collection does not crash the client
    res.json([]);
  }
});

/**
 * POST /api/events
 * Creates a new school event or announcement.
 * Auth: required (teacher/admin — role check enforced by frontend)
 * Body: { title, date, description? }
 * Response 200: { message }
 */
app.post("/api/events", verifyToken, async (req, res) => {
  try {
    const Event = require("./models/Event");
    const { title, date, description } = req.body;
    const newEvent = new Event({ title, date, description });
    await newEvent.save();
    res.json({ message: "Evento creado" });
  } catch (error) {
    res.status(500).json({ error: "Error al crear evento" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// TEACHER ROUTES — JWT required (teacher or admin)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/teacher/students
 * Returns all student records for display in the teacher panel.
 * Auth: required (teacher/admin — role check enforced by frontend)
 * Response 200: Child[]
 */
app.get("/api/teacher/students", verifyToken, async (req, res) => {
  try {
    const students = await Child.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener alumnos" });
  }
});

/**
 * PUT /api/teacher/students/:id/boleta
 * Saves or overwrites a student's grades and attendance stats for a given month.
 *
 * `boleta` is a Mongoose Mixed-type field. Mutating a nested key (e.g.
 * `boleta.grades["sept"]`) does not trigger Mongoose's change-tracking, so
 * `markModified("boleta")` must be called explicitly before `save()` to
 * ensure the update is written to MongoDB.
 *
 * Auth: required (teacher or admin)
 * Params: id — Child document _id
 * Body: { month, grades, attendanceStats, generalStatus? }
 * Response 200: { message, student }
 */
app.put("/api/teacher/students/:id/boleta", verifyToken, async (req, res) => {
  try {
    if (req.userRole !== "teacher" && req.userRole !== "admin")
      return res.status(403).json({ error: "Acceso denegado" });

    const { month, grades, attendanceStats, generalStatus } = req.body;
    const studentId = req.params.id;

    const student = await Child.findById(studentId);
    if (!student) return res.status(404).json({ error: "Alumno no encontrado" });

    if (generalStatus) student.generalStatus = generalStatus;

    if (!student.boleta) student.boleta = { grades: {}, attendanceStats: {} };
    if (!student.boleta.grades) student.boleta.grades = {};
    if (!student.boleta.attendanceStats) student.boleta.attendanceStats = {};

    student.boleta.grades[month] = grades;
    student.boleta.attendanceStats[month] = attendanceStats;

    // Required: notify Mongoose that the Mixed-type field was mutated
    student.markModified("boleta");

    await student.save();
    res.json({ message: "Boleta actualizada correctamente", student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al guardar boleta" });
  }
});

/**
 * POST /api/teacher/students/:id/attendance
 * Appends one attendance entry to the student's daily attendance log.
 * Auth: required (any role with token)
 * Params: id — Child document _id
 * Body: { status } — "Asistió" | "Falta" | "Retardo"
 */
app.post("/api/teacher/students/:id/attendance", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const student = await Child.findById(req.params.id);
    student.attendance.push({ status, date: new Date() });
    await student.save();
    res.json({ message: "Asistencia registrada" });
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

/**
 * POST /api/teacher/students/:id/achievement
 * Adds a named achievement entry to the student's record.
 * Auth: required (any role with token)
 * Params: id — Child document _id
 * Body: { title }
 */
app.post("/api/teacher/students/:id/achievement", verifyToken, async (req, res) => {
  try {
    const { title } = req.body;
    const student = await Child.findById(req.params.id);
    student.achievements.push({ title, date: new Date() });
    await student.save();
    res.json({ message: "Logro agregado" });
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// MESSAGING ROUTES — JWT required (any role)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/messages
 * Returns the calling user's full message thread (sent and received).
 * The $or query ensures both sides of every conversation are visible,
 * which is necessary for the parent's linear chat view.
 *
 * Auth: required (any role)
 * Response 200: Message[] sorted oldest-first for chronological rendering
 */
app.get("/api/messages", verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { from: req.userId },
        { toUser: req.userId },
      ],
    })
      .populate("from", "name role")
      .sort({ date: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Error al cargar mensajes" });
  }
});

/**
 * POST /api/messages
 * Sends a message to a specific user (`toUser`) or to all members of a role (`toRole`).
 * At least one of those two fields should be supplied by the client.
 *
 * Auth: required (any role)
 * Body: { content, toRole?, toUser? }
 * Response 200: { message }
 */
app.post("/api/messages", verifyToken, async (req, res) => {
  try {
    const { content, toRole, toUser } = req.body;
    const newMessage = new Message({ from: req.userId, content, toRole, toUser });
    await newMessage.save();
    res.json({ message: "Mensaje enviado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al enviar" });
  }
});

/**
 * GET /api/teacher/messages
 * Returns the teacher's inbox: all messages addressed to the teacher/admin role,
 * plus replies sent by this specific teacher. Sorted newest-first for inbox rendering.
 *
 * Auth: required (teacher/admin)
 * Response 200: Message[] with populated sender name and optional recipient name
 */
app.get("/api/teacher/messages", verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { toRole: { $in: ["teacher", "admin"] } },
        { from: req.userId },
      ],
    })
      .populate("from", "name email")
      .populate("toUser", "name")
      .sort({ date: -1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Error al leer buzón" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE ROUTES — JWT required
// ═════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/teacher/students/:id/attendance/:itemId
 * Removes one entry from the student's daily attendance log by subdocument _id.
 * Uses MongoDB $pull to atomically remove a single array element.
 * Auth: required (any role with token)
 */
app.delete("/api/teacher/students/:id/attendance/:itemId", verifyToken, async (req, res) => {
  try {
    await Child.updateOne(
      { _id: req.params.id },
      { $pull: { attendance: { _id: req.params.itemId } } }
    );
    res.json({ message: "Asistencia eliminada" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar" });
  }
});

/**
 * DELETE /api/teacher/students/:id/achievement/:itemId
 * Removes one achievement from the student's record by subdocument _id.
 * Auth: required (any role with token)
 */
app.delete("/api/teacher/students/:id/achievement/:itemId", verifyToken, async (req, res) => {
  try {
    await Child.updateOne(
      { _id: req.params.id },
      { $pull: { achievements: { _id: req.params.itemId } } }
    );
    res.json({ message: "Logro eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar" });
  }
});

/**
 * DELETE /api/events/:id
 * Permanently removes an event or announcement.
 * Auth: required (teacher/admin — role check enforced by frontend)
 * Params: id — Event document _id
 */
app.delete("/api/events/:id", verifyToken, async (req, res) => {
  try {
    const Event = require("./models/Event");
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Evento eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar evento" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES — JWT required, admin role enforced server-side
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/users
 * Returns all user accounts. The password field is excluded from the projection
 * so the hash is never transmitted over the wire.
 *
 * Auth: required (admin only)
 * Response 200: User[] (password omitted)
 */
app.get("/api/admin/users", verifyToken, async (req, res) => {
  try {
    if (req.userRole !== "admin") return res.status(403).json({ error: "Acceso denegado" });
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

/**
 * PUT /api/admin/users/:id/reset-password
 * Allows an admin to set a new password for any account directly.
 * Useful when a user cannot complete the email-based recovery flow.
 *
 * Auth: required (admin only)
 * Params: id — User document _id
 * Body: { newPassword } — minimum 6 characters
 */
app.put("/api/admin/users/:id/reset-password", verifyToken, async (req, res) => {
  try {
    if (req.userRole !== "admin") return res.status(403).json({ error: "Acceso denegado" });

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
});

/**
 * POST /api/admin/users
 * Creates a new account for any role. When creating a parent account and
 * `childName` is provided, also seeds a Child document so their dashboard
 * loads without errors on first login.
 *
 * Auth: required (admin only)
 * Body: { name, email, password, role, childName? }
 * Response 200: { message }
 */
app.post("/api/admin/users", verifyToken, async (req, res) => {
  try {
    if (req.userRole !== "admin") return res.status(403).json({ error: "Acceso denegado" });

    const { name, email, password, role, childName } = req.body;

    if (!name || !email || !password) return res.status(400).json({ error: "Faltan datos" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role });
    await newUser.save();

    // Seed child record so the parent dashboard does not show empty state on first visit
    if (role === "parent" && childName) {
      const newChild = new Child({
        parentId: newUser._id,
        name: childName,
        generalStatus: "En proceso",
        areas: {
          lenguaje: { percentage: 10, feedback: "Iniciando" },
          motor: { percentage: 10, feedback: "Iniciando" },
          social: { percentage: 10, feedback: "Iniciando" },
          cognitivo: { percentage: 10, feedback: "Iniciando" },
        },
      });
      await newChild.save();
    }

    res.json({ message: "Usuario creado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear" });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Deletes a user account and cascades the deletion to their linked Child document
 * (if the user was a parent). Prevents orphaned child records in the database.
 *
 * Auth: required (admin only)
 * Params: id — User document _id
 */
app.delete("/api/admin/users/:id", verifyToken, async (req, res) => {
  try {
    if (req.userRole !== "admin") return res.status(403).json({ error: "Acceso denegado" });

    const userId = req.params.id;

    await User.findByIdAndDelete(userId);

    // Cascade delete: remove the child record linked to this parent account (if any)
    await Child.findOneAndDelete({ parentId: userId });

    res.json({ message: "Usuario y datos eliminados correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// PASSWORD RECOVERY ROUTES — delegated to routes/passwordRoutes.js
// ═════════════════════════════════════════════════════════════════════════════
app.use("/api/password", require("./routes/passwordRoutes"));

// ── SERVER ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor CAPUN corriendo en http://localhost:${PORT}`));
