const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
    {
        profileId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile", required: true, index: true },
        category: { type: String, enum: ["weight", "meal", "water", "feed", "sleep", "growth"], required: true },
        value: { type: Number },
        startTime: { type: Date },
        endTime: { type: Date },
        notes: { type: String, trim: true },
        date: { type: Date, default: Date.now }
    },
    { timestamps: true }
);
logSchema.index({ profileId: 1, date: -1 });

module.exports = mongoose.model("Log", logSchema);