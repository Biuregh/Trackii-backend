const router = require("express").Router();
const { body, param, query, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const authGuard = require("../middleware/authGuard");
const Profile = require("../models/Profile");
const Log = require("../models/Log");

router.use(authGuard);

function sendValidation(res, errors) {
    return res.status(422).json({ errors: errors.array() });
}

async function ownsProfile(userId, profileId) {
    if (!mongoose.Types.ObjectId.isValid(profileId)) return false;
    const p = await Profile.findById(profileId).select("userId").lean();
    return !!(p && p.userId.toString() === userId);
}

async function findOwnedLogOr404(logId, userId) {
    if (!mongoose.Types.ObjectId.isValid(logId)) return null;
    const log = await Log.findById(logId).lean();
    if (!log) return null;
    const ok = await ownsProfile(userId, log.profileId);
    return ok ? log : null;
}

// --- routes ---

router.get(
    "/profiles/:id/logs",
    [
        param("id").notEmpty(),
        query("type").optional().isIn(["weight", "meal", "water", "feed", "sleep", "growth"]),
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
            if (req.query.type) filter.category = req.query.type;

            const limit = req.query.limit ?? 25;
            const page = req.query.page ?? 1;
            const skip = (page - 1) * limit;

            const [data, total] = await Promise.all([
                Log.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
                Log.countDocuments(filter)
            ]);

            res.json({
                data,
                meta: { total, page, pages: Math.ceil(total / limit), limit }
            });
        } catch (err) {
            next(err);
        }
    }
);

router.post(
    "/",
    [
        body("profileId").notEmpty().withMessage("profileId required"),
        body("category").isIn(["weight", "meal", "water", "feed", "sleep", "growth"]).withMessage("invalid category"),
        body("value").optional().isFloat().withMessage("value must be a number"),
        body("date").optional().isISO8601().toDate(),
        body("startTime").optional().isISO8601().toDate(),
        body("endTime").optional().isISO8601().toDate(),
        body("notes").optional().isString().trim()
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return sendValidation(res, errors);

            const { profileId, category, value, date, startTime, endTime, notes } = req.body;

            const owned = await ownsProfile(req.user.userId, profileId);
            if (!owned) return res.status(404).json({ message: "Not found" });

            const log = await Log.create({
                profileId, category, value, date, startTime, endTime, notes
            });

            res.status(201).json({ data: log });
        } catch (err) {
            next(err);
        }
    }
);

router.patch(
    "/:id",
    [
        param("id").notEmpty(),
        body("category").optional().isIn(["weight", "meal", "water", "feed", "sleep", "growth"]),
        body("value").optional().isFloat(),
        body("date").optional().isISO8601().toDate(),
        body("startTime").optional().isISO8601().toDate(),
        body("endTime").optional().isISO8601().toDate(),
        body("notes").optional().isString().trim()
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return sendValidation(res, errors);

            const log = await findOwnedLogOr404(req.params.id, req.user.userId);
            if (!log) return res.status(404).json({ message: "Not found" });

            // whitelist and apply only provided fields
            const updates = {};
            const fields = ["category", "value", "date", "startTime", "endTime", "notes"];
            for (const f of fields) {
                if (req.body[f] !== undefined) updates[f] = req.body[f];
            }

            const updated = await Log.findByIdAndUpdate(log._id, { $set: updates }, { new: true });
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
            const log = await findOwnedLogOr404(req.params.id, req.user.userId);
            if (!log) return res.status(404).json({ message: "Not found" });

            await Log.deleteOne({ _id: log._id });
            res.status(204).send();
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;