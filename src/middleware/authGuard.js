const passport = require("passport");

module.exports = (req, res, next) => {
    passport.authenticate("jwt", { session: false }, (err, user) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const id = (user.id || user._id)?.toString();
        req.user = {
            id,
            userId: id,
            email: user.email,
            name: user.name,
        };
        next();
    })(req, res, next);
};
