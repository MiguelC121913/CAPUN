/**
 * @file passwordController.js
 * @description Handles the two-step password recovery flow:
 *   1. requestPasswordReset — generates a one-time token and emails a reset link to the user
 *   2. resetPassword        — validates the token and replaces the user's password
 *
 * The reset link is built from FRONTEND_URL so it works in both local development
 * (http://localhost:5500) and production (GitHub Pages URL).
 */
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Nodemailer transport — requires a Gmail App Password (not the account password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Generates a cryptographically secure reset token, persists it on the user
 * record with a 1-hour expiry window, and sends an email containing the reset link.
 *
 * @param {import('express').Request}  req - Body: { email }
 * @param {import('express').Response} res
 *   - 200: email sent successfully
 *   - 404: no account found for that email
 *   - 500: mail transport or database error
 * @returns {Promise<void>}
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No existe una cuenta con ese email",
      });
    }

    // 32 random bytes → 64 hex chars; collision probability is negligible for this use case
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + 3600000; // 1 hour from now

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5500";
    const resetUrl = `${baseUrl}/pages/reset-password.html?token=${resetToken}`;

    const mailOptions = {
      from: "CAPUN <no-reply@capun.edu.mx>",
      to: user.email,
      subject: "Recuperación de contraseña - CAPUN",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3498db;">Recuperación de contraseña</h2>
          <p>Hola ${user.name},</p>
          <p>Has solicitado restablecer tu contraseña en CAPUN.</p>
          <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #3498db; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p>Este enlace expirará en 1 hora.</p>
          <p>Si no solicitaste este cambio, ignora este correo.</p>
          <hr>
          <p style="color: #777; font-size: 12px;">
            CAPUN - Centro de Atención Psicopedagógica<br>
            Email: soporte@capun.edu.mx
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Surface the token in development logs to allow testing without a real inbox
    console.log("📧 Reset token (dev):", resetToken);
    console.log("🔗 Reset URL:", resetUrl);

    res.json({
      success: true,
      message: "Se ha enviado un correo con instrucciones",
      token: process.env.NODE_ENV === "development" ? resetToken : undefined,
    });
  } catch (error) {
    console.error("Error en recuperación:", error);
    res.status(500).json({
      success: false,
      message: "Error al procesar la solicitud",
    });
  }
};

/**
 * Validates the reset token passed in the request body, checks that it has not
 * expired, replaces the password with a fresh hash, and clears the token fields
 * to prevent the same link from being reused.
 *
 * @param {import('express').Request}  req - Body: { token, newPassword }
 * @param {import('express').Response} res
 *   - 200: password updated successfully
 *   - 400: token not found or expired
 *   - 500: database error
 * @returns {Promise<void>}
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Single query: find user whose token matches AND has not expired yet
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token inválido o expirado",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Clear both token fields so the reset link cannot be reused
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({
      success: true,
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    console.error("Error en reset:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar la contraseña",
    });
  }
};
