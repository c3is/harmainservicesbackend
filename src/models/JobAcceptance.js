const mongoose = require("mongoose");

const JobAcceptanceSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "ServiceRequest",
    index: true
  },

  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Provider",
    index: true
  },

  providerName: {
    type: String
  },

  providerPhone: {
    type: String
  },

  source: {
    type: String,
    enum: ["whatsapp", "admin", "simulation"],
    default: "whatsapp"
  }

}, {
  timestamps: true
});


// compound index useful for provider job history
JobAcceptanceSchema.index({ providerId: 1, createdAt: -1 });

const JobAcceptance =
  mongoose.models.JobAcceptance ||
  mongoose.model("JobAcceptance", JobAcceptanceSchema);

module.exports = { JobAcceptance };