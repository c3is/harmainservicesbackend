const mongoose = require("mongoose");

const providerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      default: "7718908727"
    },
    jobRole: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    lastInteractionAt: {
  type: Date,
  default: null
}

  },
  {
    timestamps: true,
  }
);

const Provider = mongoose.model("Provider", providerSchema);
module.exports = Provider;
