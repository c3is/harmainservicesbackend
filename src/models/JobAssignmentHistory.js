const mongoose = require("mongoose");

const JobAssignmentHistorySchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceRequest",
      required: true
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true
    },

    providerName: {
      type: String,
      required: true
    },

    action: {
      type: String,
      enum: [
        "accepted",
        "rejected",
        "cancelled_by_provider",
        "reassigned_by_admin",
        "assigned_by_admin","cancelled_by_admin"
      ],
      required: true
    },

    note: {
      type: String
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "JobAssignmentHistory",
  JobAssignmentHistorySchema
);