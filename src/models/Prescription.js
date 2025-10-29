const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
    {
        profileId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile", required: true, index: true },
        name: { type: String, required: true, trim: true },
        dosage: { type: String, required: true, trim: true },
        frequency: { type: String, required: true, trim: true },
        startDate: { type: Date, required: true, default: Date.now },
        endDate: { type: Date },
        active: { type: Boolean, default: true },
        notes: { type: String, trim: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
