/**
 * @file progressController.js
 * @description Handlers for the teacher progress-tracking feature.
 *
 * NOTE: This controller is not currently active in production. It is wired
 * through routes/progressRoutes.js, which is not yet mounted in server.js.
 * It also references '../models/Progress' — a model that does not yet exist
 * in the codebase. This file is the planned foundation for a dedicated
 * Progress feature separate from the boleta-based grading system.
 */
const Progress = require("../models/Progress");
const Child = require("../models/child");
const User = require("../models/User");

/**
 * Creates a new progress entry for a student in a specific therapeutic area.
 * Only teachers and admins are permitted to register progress records.
 *
 * @param {import('express').Request}  req
 *   Body: { childId, area, activity, score, observations, evidence? }
 *   req.user must be set by auth middleware ({ id, role }).
 * @param {import('express').Response} res
 *   - 201: progress record created
 *   - 403: caller is not a teacher or admin
 *   - 404: child not found
 * @returns {Promise<void>}
 */
exports.createProgress = async (req, res) => {
  try {
    const { childId, area, activity, score, observations, evidence } = req.body;
    const teacherId = req.user.id;

    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Solo maestros pueden registrar progresos",
      });
    }

    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Niño no encontrado",
      });
    }

    const newProgress = new Progress({
      child: childId,
      area,
      activity,
      score: parseInt(score),
      observations,
      evidence: evidence || [],
      teacher: teacherId,
      date: new Date(),
    });

    await newProgress.save();

    res.status(201).json({
      success: true,
      message: "Progreso registrado exitosamente",
      progress: newProgress,
    });
  } catch (error) {
    console.error("Error al crear progreso:", error);
    res.status(500).json({
      success: false,
      message: "Error al registrar progreso",
    });
  }
};

/**
 * Returns the full progress history for a given child.
 * Access control: parents may only retrieve their own child's records;
 * teachers and admins can access any child's records.
 *
 * @param {import('express').Request}  req
 *   Params: { childId }. req.user set by auth middleware.
 * @param {import('express').Response} res
 *   - 200: progress list sorted newest-first
 *   - 403: parent attempting to access another parent's child
 *   - 404: child not found
 * @returns {Promise<void>}
 */
exports.getChildProgress = async (req, res) => {
  try {
    const { childId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const child = await Child.findById(childId);
    if (!child) {
      return res.status(404).json({
        success: false,
        message: "Niño no encontrado",
      });
    }

    // Compare as strings to avoid ObjectId reference equality pitfalls
    const isParent = child.parentId.toString() === userId;
    const isTeacherOrAdmin = userRole === "teacher" || userRole === "admin";

    if (!isParent && !isTeacherOrAdmin) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para ver estos progresos",
      });
    }

    const progressList = await Progress.find({ child: childId })
      .populate("teacher", "name email")
      .sort({ date: -1 });

    res.json({
      success: true,
      progress: progressList,
    });
  } catch (error) {
    console.error("Error al obtener progresos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener progresos",
    });
  }
};

/**
 * Returns all children in the system for the teacher panel's student list.
 * Restricted to teachers and admins — parents have no need for the full roster.
 *
 * @param {import('express').Request}  req - req.user set by auth middleware.
 * @param {import('express').Response} res
 *   - 200: children array with populated parent info
 *   - 403: caller is not teacher or admin
 * @returns {Promise<void>}
 */
exports.getAllChildren = async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado",
      });
    }

    const children = await Child.find()
      .populate("parentId", "name email")
      .sort({ childName: 1 });

    res.json({
      success: true,
      children,
    });
  } catch (error) {
    console.error("Error al obtener niños:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener lista de niños",
    });
  }
};

/**
 * Returns role-aware dashboard statistics.
 *
 * Parents receive stats scoped to their own child(ren).
 * Teachers and admins receive aggregate system-wide stats, including a
 * MongoDB aggregation pipeline that groups progress entries by therapeutic
 * area (lenguaje, motor, social, cognitivo, etc.) for the bar chart widget.
 *
 * @param {import('express').Request}  req - req.user set by auth middleware.
 * @param {import('express').Response} res - 200 with role-specific statistics object.
 * @returns {Promise<void>}
 */
exports.getStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let statistics = {};

    if (userRole === "parent") {
      const children = await Child.find({ parentId: userId });
      const childrenIds = children.map((child) => child._id);

      const totalProgress = await Progress.countDocuments({
        child: { $in: childrenIds },
      });

      // "Recent" is defined as the last 30 days for the parent activity widget
      const recentProgress = await Progress.countDocuments({
        child: { $in: childrenIds },
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      });

      statistics = {
        totalChildren: children.length,
        totalProgress,
        recentProgress,
        children: children.map((child) => ({
          id: child._id,
          name: child.childName,
          age: child.age,
          diagnosis: child.diagnosis,
        })),
      };
    } else if (userRole === "teacher" || userRole === "admin") {
      const totalChildren = await Child.countDocuments();
      const totalParents = await User.countDocuments({ role: "parent" });
      const totalProgress = await Progress.countDocuments();

      // Aggregation: count progress records per therapeutic area for the chart widget
      const progressByArea = await Progress.aggregate([
        { $group: { _id: "$area", count: { $sum: 1 } } },
      ]);

      statistics = {
        totalChildren,
        totalParents,
        totalProgress,
        progressByArea,
        // "Recent" is 7 days for the teacher's weekly activity summary
        recentProgress: await Progress.countDocuments({
          date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
      };
    }

    res.json({
      success: true,
      statistics,
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas",
    });
  }
};
