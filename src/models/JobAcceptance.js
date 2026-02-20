const mongoose = require("mongoose");

const JobAcceptanceSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "ServiceRequest",
  },

  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Provider"
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


const JobAcceptance =
  mongoose.models.JobAcceptance ||
  mongoose.model("JobAcceptance", JobAcceptanceSchema);

module.exports = { JobAcceptance };
