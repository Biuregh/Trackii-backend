const router = require("express").Router();
const { body, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const authGuard = require("../middleware/authGuard");
const Profile = require("../models/Profile");
const Log = require("../models/Log");


router.use(authGuard);

function sendValidation(res, errors) {
  return res.status(422).json({ errors: errors.array() });
}

async function findOwnedProfileOr404(id, userId) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const p = await Profile.findById(id);
  if (!p) return null;
  if (p.userId.toString() !== userId) return null;
  return p;
}

router.get("/", async (req, res, next) => {
  try {
    const profiles = await Profile.find({ userId: req.user.userId }).sort({ createdAt: -1 }).lean();
    res.json({ data: profiles });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/stats/weight", async (req, res, next) => {
  try {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Not found" });
    }

    const Profile = require("../models/Profile");
    const p = await Profile.findById(req.params.id).select("userId").lean();
    if (!p || p.userId.toString() !== req.user.userId) {
      return res.status(404).json({ message: "Not found" });
    }

    const latestDesc = await Log.find({
      profileId: req.params.id,
      category: "weight"
    }).sort({ date: -1 }).limit(30).lean();

    const series = [...latestDesc].reverse().map(l => ({
      date: l.date,
      value: l.value
    }));

    const values = series.map(s => s.value).filter(v => typeof v === "number");
    const latest = values.length ? values[values.length - 1] : null;
    const min = values.length ? Math.min(...values) : null;
    const max = values.length ? Math.max(...values) : null;
    const avg = values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null;

    res.json({ series, stats: { latest, min, max, avg, count: values.length } });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("name is required"),
    body("type").optional().isIn(["general", "pregnancy", "child"]).withMessage("invalid type"),
    body("dob").optional().isISO8601().toDate(),
    body("active").optional().isBoolean().toBoolean(),
    body("notes").optional().isString().trim(),
    body("sex").optional().isString().trim(),
    body("dueDate")
      .if(body("type").equals("pregnancy"))
      .exists().withMessage("dueDate required for pregnancy")
      .bail()
      .isISO8601().toDate()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendValidation(res, errors);

      const { name, dob, type, active, notes, sex, dueDate } = req.body;
      const profile = await Profile.create({
        userId: req.user.userId,
        name, dob, type, active, notes, sex, dueDate
      });

      res.status(201).json({ data: profile });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:id",
  [param("id").notEmpty()],
  async (req, res, next) => {
    try {
      const p = await findOwnedProfileOr404(req.params.id, req.user.userId);
      if (!p) return res.status(404).json({ message: "Not found" });
      res.json({ data: p });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id",
  [
    param("id").notEmpty(),
    body("name").optional().trim().notEmpty().withMessage("name cannot be empty"),
    body("type").optional().isIn(["general", "pregnancy", "child"]).withMessage("invalid type"),
    body("dob").optional().isISO8601().toDate(),
    body("active").optional().isBoolean().toBoolean(),
    body("notes").optional().isString().trim(),
    body("sex").optional().isString().trim(),
    body("dueDate").optional().isISO8601().toDate(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendValidation(res, errors);

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

      await p.save();
      res.json({ data: p });
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
      const p = await findOwnedProfileOr404(req.params.id, req.user.userId);
      if (!p) return res.status(404).json({ message: "Not found" });

      await p.deleteOne();
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;