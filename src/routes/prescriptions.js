const router = require("express").Router();
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const authGuard = require("../middleware/authGuard");
const Profile = require("../models/Profile");
const Prescription = require("../models/Prescription");

router.use(authGuard);

function sendValidation(res, errors) {
    return res.status(422).json({ errors: errors.array() });
}

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

router.get(
    "/profiles/:id/prescriptions",
    [
        param("id").notEmpty(),
        query("active").optional().isBoolean().toBoolean(),
        query("limit").optional().isInt({ min: 1, max: 200 }).toInt(),
        query("page").optional().isInt({ min: 1 }).toInt()
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return sendValidation(res, errors);

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
);

router.post(
    "/",
    [
        body("profileId").notEmpty().withMessage("profileId required"),
        body("name").trim().notEmpty().withMessage("name required"),
        body("dosage").trim().notEmpty().withMessage("dosage required"),
        body("frequency").trim().notEmpty().withMessage("frequency required"),
        body("startDate").optional().isISO8601().toDate(),
        body("endDate").optional().isISO8601().toDate(),
        body("active").optional().isBoolean().toBoolean(),
        body("notes").optional().isString().trim()
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return sendValidation(res, errors);

            const { profileId } = req.body;
            const owned = await ownsProfile(req.user.userId, profileId);
            if (!owned) return res.status(404).json({ message: "Not found" });

            const rx = await Prescription.create({
                profileId,
                name: req.body.name,
                dosage: req.body.dosage,
                frequency: req.body.frequency,
                startDate: req.body.startDate ?? new Date(),
                endDate: req.body.endDate,
                active: req.body.active ?? true,
                notes: req.body.notes
            });

            res.status(201).json({ data: rx });
        } catch (err) {
            next(err);
        }
    }
);

router.patch(
    "/:id",
    [
        param("id").notEmpty(),
        body("name").optional().isString().trim(),
        body("dosage").optional().isString().trim(),
        body("frequency").optional().isString().trim(),
        body("startDate").optional().isISO8601().toDate(),
        body("endDate").optional().isISO8601().toDate(),
        body("active").optional().isBoolean().toBoolean(),
        body("notes").optional().isString().trim()
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return sendValidation(res, errors);

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
);

router.delete(
    "/:id",
    [param("id").notEmpty()],
    async (req, res, next) => {
        try {
            const rx = await findOwnedRxOr404(req.params.id, req.user.userId);
            if (!rx) return res.status(404).json({ message: "Not found" });

            await Prescription.deleteOne({ _id: rx._id });
            res.status(204).send();
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;