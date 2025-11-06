const router = require("express").Router();
const authGuard = require("../middleware/authGuard");
const c = require("../controllers/remindersController");

router.use(authGuard);
router.get("/", c.list);
router.post("/:key/dismiss", c.dismiss);

module.exports = router;
