const mongoose = require("mongoose");
const Profile = require("../models/Profile");
const Log = require("../models/Log");

async function findOwnedProfileOr404(id, userId) {
    const p = await Profile.findById(id).lean();
    if (!p) return null;
    if (p.userId.toString() !== userId) return null;
    return p;
}

async function listProfiles(req, res, next) {
    try {
        const profiles = await Profile.find({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ data: profiles });
    } catch (err) {
        return next(err);
    }
}

async function createProfile(req, res, next) {
    try {
        const { name, dob, type = "general", active, notes, sex, dueDate } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "name is required" });
        }

        const profile = await Profile.create({
            userId: req.user.userId,
            name: name.trim(),
            dob,
            type,     // must match your enum: "general" | "pregnancy" | "child"
            active,
            notes,
            sex,
            dueDate,
        });

        return res.status(201).json({ data: profile });
    } catch (err) {
        console.error("Create profile error:", err);
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: "Validation failed", details: err.errors });
        }
        return next(err);
    }
}

async function getProfile(req, res, next) {
    try {
        const p = await findOwnedProfileOr404(req.params.id, req.user.userId);
        if (!p) return res.status(404).json({ message: "Not found" });
        return res.status(200).json({ data: p });
    } catch (err) {
        return next(err);
    }
}

async function updateProfile(req, res, next) {
    try {
        const { id } = req.params;
        const update = {};
        const fields = ["name", "dob", "type", "active", "notes", "sex", "dueDate"];
        for (const f of fields) if (req.body[f] !== undefined) update[f] = req.body[f];

        const updated = await Profile.findOneAndUpdate(
            { _id: id, userId: req.user.userId },
            { $set: update },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) return res.status(404).json({ message: "Not found" });
        return res.status(200).json({ data: updated });
    } catch (err) {
        return next(err);
    }
}

async function deleteProfile(req, res, next) {
    try {
        const { id } = req.params;
        const result = await Profile.deleteOne({ _id: id, userId: req.user.userId });
        if (result.deletedCount === 0) return res.status(404).json({ message: "Not found" });
        return res.status(204).send();
    } catch (err) {
        return next(err);
    }
}

async function weightStats(req, res, next) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ message: "Not found" });
        }

        const p = await findOwnedProfileOr404(req.params.id, req.user.userId)
        if (!p || p.userId.toString() !== req.user.userId) {
            return res.status(404).json({ message: "Not found" });
        }

        const latestDesc = await Log.find({
            profileId: req.params.id,
            category: "weight"
        }).sort({ date: -1 }).limit(30).lean();

        const series = [...latestDesc].reverse().map(l => ({ date: l.date, value: l.value }));

        const values = series.map(s => s.value).filter(v => typeof v === "number");
        const latest = values.length ? values[values.length - 1] : null;
        const min = values.length ? Math.min(...values) : null;
        const max = values.length ? Math.max(...values) : null;
        const avg = values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null;

        return res.status(200).json({ series, stats: { latest, min, max, avg, count: values.length } });
    } catch (err) {
        return next(err);
    }
}

async function getSummaryStats(req, res, next) {
    try {
        const p = await findOwnedProfileOr404(req.params.id, req.user.userId);
        if (!p) return res.status(404).json({ message: "Not found" });

        const stats = await Log.aggregate([
            { $match: { profileId: new mongoose.Types.ObjectId(req.params.id) } },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    latest: { $max: "$date" }
                }
            }
        ]);

        return res.status(200).json({ data: stats });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    findOwnedProfileOr404,
    listProfiles,
    createProfile,
    getProfile,
    updateProfile,
    deleteProfile,
    getSummaryStats,
    weightStats
};