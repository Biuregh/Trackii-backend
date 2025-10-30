const mongoose = require("mongoose");
const Profile = require("../models/Profile");
const Prescription = require("../models/Prescription");

async function ownsProfile(userId, profileId) {
    if (!mongoose.Types.ObjectId.isValid(profileId)) return false;
    const p = await Profile.findById(profileId).select("userId").lean();
    return !!(p && p.userId.toString() === userId);
}

async function findOwnedRxOr404(rxId, userId) {
    if (!mongoose.Types.ObjectId.isValid(rxId)) return null;
    const rx = await Prescription.findById(rxId).lean();
    if (!rx) return null;
    const ok = await ownsProfile(userId, rx.profileId);
    return ok ? rx : null;
}

async function listPrescriptions(req, res, next) {
    try {
        const profileId = req.params.id;
        const userId = req.user.userId;

        const owned = await ownsProfile(userId, profileId);
        if (!owned) return res.status(404).json({ message: "Not found" });

        const filter = { profileId };
        if (req.query.active !== undefined) filter.active = req.query.active;

        const limit = req.query.limit ?? 25;
        const page = req.query.page ?? 1;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            Prescription.find(filter).sort({ startDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
            Prescription.countDocuments(filter)
        ]);

        res.json({ data, meta: { total, page, pages: Math.ceil(total / limit), limit } });
    } catch (err) {
        next(err);
    }
}

async function createPrescription(req, res, next) {
    try {
        const { profileId, name, dosage, frequency, startDate, endDate, active, notes } = req.body;
        const userId = req.user.userId;

        const owned = await ownsProfile(userId, profileId);
        if (!owned) return res.status(404).json({ message: "Not found" });

        const rx = await Prescription.create({
            profileId,
            name,
            dosage,
            frequency,
            startDate: startDate ?? new Date(),
            endDate,
            active: active ?? true,
            notes
        });

        res.status(201).json({ data: rx });
    } catch (err) {
        next(err);
    }
}

async function updatePrescription(req, res, next) {
    try {
        const rx = await findOwnedRxOr404(req.params.id, req.user.userId);
        if (!rx) return res.status(404).json({ message: "Not found" });

        const updates = {};
        const fields = ["name", "dosage", "frequency", "startDate", "endDate", "active", "notes"];
        for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];

        const updated = await Prescription.findByIdAndUpdate(rx._id, { $set: updates }, { new: true });
        res.json({ data: updated });
    } catch (err) {
        next(err);
    }
}

async function deletePrescription(req, res, next) {
    try {
        const rx = await findOwnedRxOr404(req.params.id, req.user.userId);
        if (!rx) return res.status(404).json({ message: "Not found" });

        await Prescription.deleteOne({ _id: rx._id });
        res.status(204).send();
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listPrescriptions,
    createPrescription,
    updatePrescription,
    deletePrescription
};
