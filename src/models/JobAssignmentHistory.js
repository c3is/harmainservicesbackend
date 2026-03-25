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
      required: false
    },

    providerName: {
      type: String,
      required: false
    },

    action: {
      type: String,
      enum: [
        "accepted",
        "rejected",
        "cancelled_by_provider",
        "reassigned_by_admin",
        "assigned_by_admin",
        "cancelled_by_admin",
        "status_changed_to_completed",
        "status_changed_to_cancelled",
        "status_changed_to_assigned",
        "cancelled_by_customer"
      ],
      required: true
    },

    actor: {
  type: String,
  enum: ["provider", "admin", "system", "customer"],
  default: "system"
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