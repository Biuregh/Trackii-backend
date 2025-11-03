const router = require("express").Router();
const { body, param, query, validationResult } = require("express-validator");
const authGuard = require("../middleware/authGuard");
const controller = require("../controllers/logsController");

router.use(authGuard);

function sendValidation(res, errors) {
  return res.status(422).json({ errors: errors.array() });
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
      return controller.listLogs(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/",
  [
    body("profileId")
      .notEmpty().withMessage("profileId required")
      .isMongoId().withMessage("Invalid profileId"),
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
      return controller.createLog(req, res, next);
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
      return controller.updateLog(req, res, next);
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendValidation(res, errors);
      return controller.deleteLog(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;