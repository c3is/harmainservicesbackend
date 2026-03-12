const mongoose = require("mongoose");

const JobNotificationSchema = new mongoose.Schema(
  {
    serviceRequestId: {
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

    status: {
      type: String,
      enum: ["created", "sent", "accepted", "rejected", "expired"],
      default: "created",
      index: true
    }
  },
  {
    timestamps: true
  }
);

//
// Indexes for fast job dispatch & webhook lookups
//

// webhook lookup
JobNotificationSchema.index({ providerId: 1, status: 1, createdAt: -1 });

// expire notifications for request
JobNotificationSchema.index({ serviceRequestId: 1 });

// provider + request combination
JobNotificationSchema.index({ serviceRequestId: 1, providerId: 1 });


// Safe model compilation
const JobNotification =
  mongoose.models.JobNotification ||
  mongoose.model("JobNotification", JobNotificationSchema);

module.exports = { JobNotification };