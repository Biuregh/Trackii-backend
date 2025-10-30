const mongoose = require("mongoose");
const Profile = require("../models/Profile");
const Log = require("../models/Log");

async function findOwnedProfileOr404(id, userId) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const p = await Profile.findById(id);
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
        const { name, dob, type, active, notes, sex, dueDate } = req.body;
        const profile = await Profile.create({
            userId: req.user.userId,
            name,
            dob,
            type,
            active,
            notes,
            sex,
            dueDate
        });
        return res.status(201).json({ data: profile });
    } catch (err) {
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
        const errors = req._validationErrors;
        if (errors && errors.length) return res.status(422).json({ errors });

        const p = await findOwnedProfileOr404(req.params.id, req.user.userId);
        if (!p) return res.status(404).json({ message: "Not found" });

        const { name, dob, type, active } = req.body;
        if (name !== undefined) p.name = name;
        if (dob !== undefined) p.dob = dob;
        if (type !== undefined) p.type = type;
        if (active !== undefined) p.active = active;
        if (req.body.notes !== undefined) p.notes = req.body.notes;
        if (req.body.sex !== undefined) p.sex = req.body.sex;
        if (req.body.type === "pregnancy" && !req.body.dueDate && !p.dueDate) {
            return res.status(422).json({ message: "dueDate required for pregnancy profiles" });
        }
        if (req.body.dueDate !== undefined) p.dueDate = req.body.dueDate;

        await p.save();
        return res.status(200).json({ data: p });
    } catch (err) {
        return next(err);
    }
}

async function deleteProfile(req, res, next) {
    try {
        const p = await findOwnedProfileOr404(req.params.id, req.user.userId);
        if (!p) return res.status(404).json({ message: "Not found" });
        await p.deleteOne();
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

        const p = await Profile.findById(req.params.id).select("userId").lean();
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

module.exports = {
    findOwnedProfileOr404,
    listProfiles,
    createProfile,
    getProfile,
    updateProfile,
    deleteProfile,
    weightStats
};
