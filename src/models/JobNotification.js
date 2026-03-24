const mongoose = require("mongoose");

const JobNotificationSchema = new mongoose.Schema(
  {
    serviceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "ServiceRequest"
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Provider"
    },

    status: {
      type: String,
      enum: ["created", "sent", "accepted", "rejected", "expired"],
      default: "created"
    }
  },
  {
    timestamps: true
  }
);

// ================= INDEXES =================

// webhook lookup (VERY IMPORTANT)
JobNotificationSchema.index({ providerId: 1, status: 1, createdAt: -1 });

// expire notifications for request
JobNotificationSchema.index({ serviceRequestId: 1 });

// provider + request combination (prevents duplicates later if needed)
JobNotificationSchema.index({ serviceRequestId: 1, providerId: 1 });

const JobNotification =
  mongoose.models.JobNotification ||
  mongoose.model("JobNotification", JobNotificationSchema);

module.exports = { JobNotification };