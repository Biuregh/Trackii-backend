const router = require("express").Router();
const { body, param, query } = require("express-validator");
const authGuard = require("../middleware/authGuard");
const controller = require("../controllers/prescriptionsController");
const { prescriptionValidationRules, validate } = require("../middleware/validation");

router.use(authGuard);

router.get(
  "/profiles/:profileId",
  [
    param("profileId").notEmpty().withMessage("profileId required"),
    query("active").optional().isBoolean().toBoolean(),
    query("limit").optional().isInt({ min: 1, max: 200 }).toInt(),
    query("page").optional().isInt({ min: 1 }).toInt(),
    validate
  ],
  controller.listPrescriptions
);

router.post("/", prescriptionValidationRules(), validate, controller.createPrescription);

router.patch(
  "/:id",
  [
    param("id").notEmpty().withMessage("id required"),
    body("name").optional().trim().isString(),
    body("dosage").optional().trim().isString(),
    body("frequency").optional().trim().isString(),
    body("startDate").optional().isISO8601().toDate(),
    body("endDate").optional().isISO8601().toDate(),
    body("active").optional().isBoolean().toBoolean(),
    body("notes").optional().trim().isString(),
    validate
  ],
  controller.updatePrescription
);

router.delete(
  "/:id",
  [param("id").notEmpty().withMessage("id required"), validate],
  controller.deletePrescription
);

module.exports = router;