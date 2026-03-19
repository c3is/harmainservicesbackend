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
      unique: true, // automatically indexed
      // default: "7718908727"  
    },

    jobRole: {
      type: [String],
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    isAvailable: {
      type: Boolean,
      default: true
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


// Faster provider search for job dispatch
providerSchema.index({ jobRole: 1, isActive: 1 });

const Provider =
  mongoose.models.Provider ||
  mongoose.model("Provider", providerSchema);

module.exports = Provider;