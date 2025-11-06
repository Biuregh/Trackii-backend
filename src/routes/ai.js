const router = require("express").Router();
const authGuard = require("../middleware/authGuard");
const controller = require("../controllers/aiController");

router.use(authGuard);
router.post("/ask", controller.ask);

module.exports = router;
