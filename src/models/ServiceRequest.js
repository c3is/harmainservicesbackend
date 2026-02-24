const mongoose = require("mongoose");

const ServiceRequestSchema = new mongoose.Schema({

  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "serviceModel"
  },

  serviceName: {
    type: String,
    required: true
  },

  selectedCategory: {
    type: String
  },

  serviceAddons: [{
    type: String
  }],

  totalAmount: {
    type: Number
  },

  preferredDate: {
    type: String
  },

  customerName: {
    type: String,
    required: true
  },

  customerPhone: {
    type: String,
    required: true
  },

  customerAddress: {
    area: String,
    landmark: String,
    district: String,
    pincode: String,
    house: String
  },

  status: {
    type: String,
    enum: ["pending", "assigned", "cancelled"],
    default: "pending"
  }

}, { timestamps: true });

const ServiceRequest = mongoose.model("ServiceRequest", ServiceRequestSchema);

module.exports = { ServiceRequest };