const { body, validationResult } = require("express-validator");

const prescriptionValidationRules = () => [
    body("name").notEmpty().withMessage("name is required").isString().withMessage("name must be a string"),
    body("dosage").optional().isString().withMessage("dosage must be a string"),
    body("frequency").optional().isString().withMessage("frequency must be a string"),
    body("active").optional().isBoolean().withMessage("active must be a boolean"),
];

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    prescriptionValidationRules,
    validate
};
