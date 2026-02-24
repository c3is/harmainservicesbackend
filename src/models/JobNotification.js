  const mongoose = require("mongoose");

  const JobNotificationSchema = new mongoose.Schema(
    {
      serviceRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "ServiceRequest",
      },

      providerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Provider",
      },

      status: {
        type: String,
        enum: ["created", "sent", "accepted", "rejected", "expired"],
        default: "created",
      }
    },
    {
      timestamps: true
    }
  );

  // ⭐ Safe model compilation (prevents overwrite error)
  const JobNotification =
    mongoose.models.JobNotification ||
    mongoose.model("JobNotification", JobNotificationSchema);

  module.exports = { JobNotification };
