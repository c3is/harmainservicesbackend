const mongoose = require("mongoose");

const ServiceRequestSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "serviceModel",
      index: true,
    },

    serviceName: {
      type: String,
      required: true,
    },

    selectedCategory: {
      type: String,
    },

    serviceAddons: [
      {
        type: String,
      },
    ],

    totalAmount: {
      type: Number,
    },

    preferredDate: {
      type: String,
    },

    customerName: {
      type: String,
      required: true,
    },

    customerPhone: {
      type: String,
      required: true,
      index: true,
    },

    customerAddress: {
      area: String,
      landmark: String,
      district: String,
      pincode: String,
      house: String,
    },

    status: {
      type: String,
      enum: ["pending", "assigned", "cancelled", "rejected", "completed"],
      default: "pending",
      index: true,
    },

    rejectionReason: {
      type: String,
    },

    rejectedBy: {
      type: String,
      enum: ["admin", "system"],
    },

    assignedProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      index: true,
    },

    assignedProviderName: String,
    assignedProviderPhone: String,

    email: {
      type: String,
    },

    // ================= NOTIFICATION TRACKING =================

    notificationMeta: {
  email: {
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    error: String,
    sentAt: Date,
  },

  providerNotifiedCount: {
    type: Number,
    default: 0,
  },
},
  },
  { timestamps: true }
);

// ================= INDEXES =================

ServiceRequestSchema.index({ status: 1, createdAt: -1 });

ServiceRequestSchema.index({ assignedProviderId: 1, createdAt: -1 });

// 🔥 Admin filtering
ServiceRequestSchema.index({ notificationStatus: 1, createdAt: -1 });

const ServiceRequest =
  mongoose.models.ServiceRequest ||
  mongoose.model("ServiceRequest", ServiceRequestSchema);

module.exports = { ServiceRequest };