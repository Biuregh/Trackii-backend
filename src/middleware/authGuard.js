const passport = require("passport")

module.export = passport.authenticate("jwt", { session: false });