const router = require("express").Router();
const { body, param, validationResult } = require("express-validator");
const authGuard = require("../middleware/authGuard");
const controller = require("../controllers/profilesController");

router.use(authGuard);

function sendValidation(res, errors) {
  return res.status(422).json({ errors: errors.array() });
}

router.get("/", controller.listProfiles);

router.get("/:id/stats/weight", controller.weightStats);

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
      return controller.createProfile(req, res, next);
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendValidation(res, errors);
      return controller.getProfile(req, res, next);
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
      return controller.updateProfile(req, res, next)
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
      return controller.deleteProfile(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;