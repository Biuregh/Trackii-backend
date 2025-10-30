const router = require("express").Router();
const { body, param, query, validationResult } = require("express-validator");
const authGuard = require("../middleware/authGuard");
const controller = require("../controllers/prescriptionsController");

router.use(authGuard);

function sendValidation(res, errors) {
    return res.status(422).json({ errors: errors.array() });
}

// --- routes ---
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
            return controller.listPrescriptions(req, res, next);
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
            return controller.createPrescription(req, res, next);
        } catch (err) {
            next(err);
        }
    }
);

router.patch(
    "/:id",
    [
        param("id").notEmpty(),
        body("name").optional().trim(),
        body("dosage").optional().trim(),
        body("frequency").optional().trim(),
        body("startDate").optional().isISO8601().toDate(),
        body("endDate").optional().isISO8601().toDate(),
        body("active").optional().isBoolean().toBoolean(),
        body("notes").optional().trim()
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return sendValidation(res, errors);
            return controller.updatePrescription(req, res, next);
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
            return controller.deletePrescription(req, res, next);
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;