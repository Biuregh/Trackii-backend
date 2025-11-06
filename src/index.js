require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("passport");
const connectDB = require("./config/db");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(morgan("dev"));
app.use(passport.initialize());
require("./config/passport")(passport);

app.get("/health", (req, res) => res.json({ ok: true }));

const remindersRouter = require("./routes/remindersRouter");
app.use("/api/v1/reminders", remindersRouter);
const aiRouter = require("./routes/ai");
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/profiles", require("./routes/profiles"));
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/logs", require("./routes/logs"));
app.use("/api/v1/prescriptions", require("./routes/prescriptions"));

app.use((req, res, next) => res.status(404).json({ message: "Not found" }));
app.use((err, req, res, next) => {
    console.error(err);
    const code = err.status || 500;
    res.status(code).json({ message: err.message || "Server error" });
});
app.use(require("./middleware/errorHandler"));

const PORT = process.env.PORT || 4000;

(async () => {
    await connectDB();
    app.listen(PORT, () => console.log(`API listening on ${PORT}`));
})();
