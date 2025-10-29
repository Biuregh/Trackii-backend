const mangoose = require("mongoose")
try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Mongo connected")
} catch (e) {
    console.error("Mongo connect error:", e.message)
    process.exitCode(1)
}