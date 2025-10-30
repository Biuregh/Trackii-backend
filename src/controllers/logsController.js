const mongoose = require("mongoose");
const Profile = require("../models/Profile");
const Log = require("../models/Log");

async function ownsProfile(userId, profileId) {
  if (!mongoose.Types.ObjectId.isValid(profileId)) return false;
  const p = await Profile.findById(profileId).select("userId").lean();
  return !!(p && p.userId.toString() === userId);
}

async function findOwnedLogOr404(logId, userId) {
  if (!mongoose.Types.ObjectId.isValid(logId)) return null;
  const log = await Log.findById(logId);
  if (!log) return null;
  const ok = await ownsProfile(userId, log.profileId);
  return ok ? log : null;
}

async function listLogs(req, res, next) {
  try {
    const profileId = req.params.id;
    const userId = req.user.userId;

    const owned = await ownsProfile(userId, profileId);
    if (!owned) return res.status(404).json({ message: "Not found" });

    const filter = { profileId };
    if (req.query.type) filter.category = req.query.type;

    const limit = req.query.limit ?? 25;
    const page = req.query.page ?? 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Log.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      Log.countDocuments(filter)
    ]);

    return res.status(200).json({
      data,
      meta: { total, page, pages: Math.ceil(total / limit), limit }
    });
  } catch (err) {
    return next(err);
  }
}

async function createLog(req, res, next) {
  try {
    const { profileId, category, value, date, startTime, endTime, notes } = req.body;
    const userId = req.user.userId;

    const owned = await ownsProfile(userId, profileId);
    if (!owned) return res.status(404).json({ message: "Not found" });

    if ((category === "weight" || category === "water") && (value === undefined || Number(value) <= 0)) {
      return res.status(422).json({ message: "value must be a positive number for weight/water" });
    }

    const log = await Log.create({ profileId, category, value, date, startTime, endTime, notes });
    return res.status(201).json({ data: log });
  } catch (err) {
    return next(err);
  }
}

async function updateLog(req, res, next) {
  try {
    const log = await findOwnedLogOr404(req.params.id, req.user.userId);
    if (!log) return res.status(404).json({ message: "Not found" });

    if (req.body.category && !["weight", "meal", "water", "feed", "sleep", "growth"].includes(req.body.category)) {
      return res.status(422).json({ message: "invalid category" });
    }

    if ((req.body.category === "weight" || req.body.category === "water" ||
      log.category === "weight" || log.category === "water") &&
      req.body.value !== undefined && Number(req.body.value) <= 0) {
      return res.status(422).json({ message: "value must be a positive number for weight/water" });
    }

    const updates = {};
    ["category", "value", "date", "startTime", "endTime", "notes"].forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const updated = await Log.findByIdAndUpdate(log._id, { $set: updates }, { new: true });
    return res.status(200).json({ data: updated });
  } catch (err) {
    return next(err);
  }
}

async function deleteLog(req, res, next) {
  try {
    const log = await findOwnedLogOr404(req.params.id, req.user.userId);
    if (!log) return res.status(404).json({ message: "Not found" });

    await log.deleteOne();
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  ownsProfile,
  findOwnedLogOr404,
  listLogs,
  createLog,
  updateLog,
  deleteLog
};
