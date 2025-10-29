const router = require("express").Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');

router.post(
    "/register",
    [
        body('email').isEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password >= 6 chars')
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
            const email = req.body.email.toLowerCase().trim();
            const exists = await User.findOne({ email });
            if (exists) return res.status(409).json({ message: 'Email already in use' });
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
    '/login',
    [
        body('email').isEmail(),
        body('password').notEmpty()
    ],
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
        next();
    },
    (req, res, next) => {
        passport.authenticate('local', { session: false }, (err, user, info) => {
            if (err) return next(err);
            if (!user) return res.status(401).json({ message: 'Invalid credentials' });
            const token = jwt.sign(
                { userId: user.userId, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            return res.json({
                token,
                user: { id: user.userId, email: user.email }
            });
        })(req, res, next);
    }
);

module.exports = router;