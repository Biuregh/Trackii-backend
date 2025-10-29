const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        name: { type: String, required: true },
        dob: { type: Date },
        type: { type: String, enum: ["general", "pregnancy", "child"], default: "general" },
        dueDate: { type: Date },
        sex: { type: String },
        active: { type: Boolean, default: true },
        notes: {String}
    },
    { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
