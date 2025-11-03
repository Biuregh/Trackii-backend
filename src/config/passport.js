const { Strategy: LocalStrategy } = require("passport-local");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const bcrypt = require("bcrypt");
const User = require("../models/User");

module.exports = function setupPassport(passport) {
    passport.use(
        new LocalStrategy(
            { usernameField: "email", passwordField: "password", session: false },
            async (email, password, done) => {
                try {
                    const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
                    if (!user) return done(null, false);
                    const ok = await bcrypt.compare(password, user.passwordHash);
                    if (!ok) return done(null, false);
                    return done(null, { id: String(user._id), email: user.email });
                } catch (err) {
                    return done(err);
                }
            }
        )
    );

    passport.use(
        new JwtStrategy(
            {
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                secretOrKey: process.env.JWT_SECRET,
            },
            async (payload, done) => {
                try {
                    const user = await User.findById(payload.userId).select("email name");
                    if (!user) return done(null, false);
                    return done(null, user);
                } catch (err) {
                    return done(err, false);
                }
            }
        )
    );
};