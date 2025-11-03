const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../models/User");

router.post(
    "/register",
    [
        body("email").isEmail().withMessage("Valid email required"),
        body("password").isLength({ min: 6 }).withMessage("Password >= 6 chars")
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
            const email = req.body.email.toLowerCase().trim();
            const exists = await User.findOne({ email });
            if (exists) return res.status(409).json({ message: "Email already in use" });
            const passwordHash = await bcrypt.hash(req.body.password, 10);
            const user = await User.create({ email, passwordHash, name: req.body.name });
            return res.status(201).json({
                user: { id: user._id, email: user.email, name: user.name }
            });
        } catch (err) {
            next(err)
        }
    }
);
router.post(
    "/login",
    [
        body("email").isEmail().withMessage("Valid email required"),
        body("password").notEmpty().withMessage("Password is required")
    ],
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
        next();
    },

    passport.authenticate("local", { session: false }),
    (req, res, next) => {
        const user = req.user;
        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        return res.json({
            token,
            user: { id: user._id, email: user.email, name:user.name }
        });
    }
);

router.get("/me", async (req, res) => {
    console.log("GET /api/v1/auth/me called");
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.userId).select('email name');
        if (!user) return res.status(401).json({ message: "User not found" });
        return res.json({
            user: {
                id: payload.userId,
                email: payload.email,
                name:user.name
            }
        });
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
});

module.exports = router;