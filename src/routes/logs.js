const router = require("express").Router();
const authGuard = require("../middleware/authGuard");

router.use(authGuard);

router.get("/", (req, res) => {
    res.json({ ok: true, route: "logs", user: req.user });
});

module.exports = router;