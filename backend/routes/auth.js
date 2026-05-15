/**
 * @file auth.js
 * @description Extended authentication routes mounted at /api/auth.
 *
 * Provides the full auth surface beyond the basic login/register in server.js:
 *   POST /register        — create a new user account (defaults to parent role)
 *   POST /login           — authenticate and receive a signed JWT
 *   GET  /me              — retrieve the current user's profile from the token
 *   POST /logout          — symbolic; the client is responsible for discarding the token
 *   POST /update-profile  — update name, childName, or email
 *   POST /change-password — change password after verifying the current one
 */
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * POST /api/auth/register
 * Creates a new user account. Accepts multiple name field formats for compatibility
 * with different form implementations across the frontend.
 * Defaults to "parent" role unless a valid role is explicitly provided.
 *
 * Auth: none
 * Body: { name?, nombre?, fullName?, email, password, childName?, role? }
 * Response 201: { success, message, user }
 * Response 400: email already registered or missing required fields
 */
router.post("/register", async (req, res) => {
  try {
    const { name, nombre, fullName, childName, email, password, role } = req.body;

    // Accept multiple name fields so different form versions all work
    const finalName = name || nombre || fullName || "Usuario CAPUN";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email y contraseña son requeridos",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "El email ya está registrado",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const validRoles = ["parent", "teacher", "admin"];
    const finalRole = validRoles.includes(role) ? role : "parent";

    const newUser = new User({
      name: finalName,
      email,
      password: hashedPassword,
      childName: childName || "",
      role: finalRole,
      isActive: true,
    });

    await newUser.save();
    console.log("✅ Usuario registrado:", newUser.email, "Rol:", newUser.role);

    return res.status(201).json({
      success: true,
      message: "Usuario registrado exitosamente",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        childName: newUser.childName,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("❌ Error en registro:", error);
    return res.status(500).json({
      success: false,
      message: "Error en el servidor",
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticates a user and returns a signed JWT with the role embedded in the payload.
 * Embedding the role in the token means downstream middleware can enforce access
 * control without a database lookup on every request.
 *
 * Also updates `lastLogin` on each successful authentication for audit purposes.
 *
 * Auth: none
 * Body: { email, password }
 * Response 200: { success, token, user }
 * Response 400: wrong credentials
 * Response 403: account is disabled
 */
router.post("/login", async (req, res) => {
  try {
    console.log("🔑 Recibiendo login:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email y contraseña son requeridos",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email no encontrado",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Cuenta desactivada. Contacta al administrador.",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: "Contraseña incorrecta",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role || "parent",
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log("✅ Login exitoso para:", user.email, "Rol:", user.role);

    return res.json({
      success: true,
      message: "Login exitoso",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        childName: user.childName,
        role: user.role || "parent",
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("❌ Error en login:", error);
    return res.status(500).json({
      success: false,
      message: "Error en el servidor",
      error: error.message,
    });
  }
});

/**
 * GET /api/auth/me
 * Returns the profile of the currently authenticated user.
 * Reads the token directly from the Authorization header (strips optional "Bearer " prefix)
 * to keep this endpoint self-contained without requiring a separate auth middleware.
 *
 * Auth: JWT in Authorization header
 * Response 200: { success, user } (password excluded)
 * Response 401: token missing or invalid
 */
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token no proporcionado",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    return res.json({ success: true, user });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token inválido o expirado",
    });
  }
});

/**
 * POST /api/auth/logout
 * Symbolic server-side logout — the API is stateless (JWT), so there is no
 * session to invalidate. The client must remove the token from localStorage.
 *
 * Auth: none required
 * Response 200: { success, message }
 */
router.post("/logout", async (req, res) => {
  try {
    return res.json({ success: true, message: "Logout exitoso" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error en el servidor",
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/update-profile
 * Updates the current user's display name, childName, or email.
 * If the email is being changed, checks uniqueness before saving.
 *
 * Auth: JWT in Authorization header
 * Body: { name?, childName?, email? }
 * Response 200: { success, user }
 * Response 400: new email already taken
 */
router.post("/update-profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token no proporcionado",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, childName, email } = req.body;

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    if (name) user.name = name;
    if (childName) user.childName = childName;

    // Only validate uniqueness when the email is actually changing
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "El nuevo email ya está registrado",
        });
      }
      user.email = email;
    }

    await user.save();

    return res.json({
      success: true,
      message: "Perfil actualizado exitosamente",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        childName: user.childName,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error en el servidor",
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/change-password
 * Lets an authenticated user change their own password.
 * Requires the current password as proof of identity before accepting the new one,
 * preventing password changes via a stolen token alone.
 *
 * Auth: JWT in Authorization header
 * Body: { currentPassword, newPassword }
 * Response 200: { success, message }
 * Response 400: current password incorrect or fields missing
 */
router.post("/change-password", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token no proporcionado",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Contraseña actual y nueva contraseña son requeridas",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: "Contraseña actual incorrecta",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.json({
      success: true,
      message: "Contraseña cambiada exitosamente",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error en el servidor",
      error: error.message,
    });
  }
});

module.exports = router;
