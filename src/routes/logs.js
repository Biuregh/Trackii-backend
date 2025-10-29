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