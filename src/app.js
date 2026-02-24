require("dotenv").config();
const express = require("express");
const app = express();
const axios = require("axios");
const cors = require("cors");

const { sendWhatsAppTemplate } = require("./utils/sendWhatsapp");
const { connectDB } = require("./config/db");

const ServiceModel = require("./models/ServiceModel");
const Provider = require("./models/Provider");
const { ServiceRequest } = require("./models/ServiceRequest");
const { JobNotification } = require("./models/JobNotification");
const { JobAcceptance } = require("./models/JobAcceptance");

app.use(cors());
app.use(express.json());

// ================= TEXT MESSAGE HELPER =================
function formatDestination(phone) {
  phone = phone.replace(/\D/g, "").slice(-10);
  return "91" + phone;
}

async function sendWhatsAppText(destination, text) {
  try {
    const formattedDestination = formatDestination(destination);

    const response = await axios.post(
      "https://api.gupshup.io/wa/api/v1/msg",
      new URLSearchParams({
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE_NUMBER,
        destination: formattedDestination,
        message: JSON.stringify({
          type: "text",
          text
        })
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_API_KEY
        }
      }
    );

    console.log("✅ Text message sent:", response.data);
  } catch (err) {
    console.error("❌ Text message error:", err?.response?.data || err.message);
  }
}

// ================= PROVIDER APIs =================
app.post("/provider", async (req, res) => {
  try {
    const provider = new Provider({
      ...req.body,
      jobRole: req.body.jobRole.map(r => r.toLowerCase())
    });

    await provider.save();
    res.json("Provider Saved");
  } catch (err) {
    res.status(500).send("Something went wrong");
  }
});

app.get("/providers/:service", async (req, res) => {
  try {
    const providers = await Provider.find({
      jobRole: req.params.service.toLowerCase()
    });
    res.json(providers);
  } catch {
    res.status(500).send("Error fetching providers");
  }
});

// ================= GET PROVIDER BY ID =================
// Used by admin panel or debugging to fetch full provider details
// Example: GET /provider/65abc123
app.get("/provider/:id", async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.json(provider);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch provider" });
  }
});

// ================= LIST ALL PROVIDERS =================
// Returns all providers for admin monitoring or management
// Example: GET /providers
app.get("/providers", async (req, res) => {
  try {
    const providers = await Provider.find({}).sort({ createdAt: -1 });
    res.json(providers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch providers" });
  }
});

// ================= UPDATE PROVIDER =================
// Allows admin to update provider details like name, phone, roles, availability
// Example: PUT /provider/65abc123
app.put("/provider/:id", async (req, res) => {
  try {

    const updates = { ...req.body };

    // Normalize job roles if provided
    if (updates.jobRole) {
      updates.jobRole = updates.jobRole.map(r => r.toLowerCase());
    }

    // Normalize phone if provided
    if (updates.phoneNumber) {
      updates.phoneNumber = updates.phoneNumber.replace(/\D/g, "").slice(-10);
    }

    const provider = await Provider.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.json({
      message: "Provider updated",
      provider
    });

  } catch (err) {

    // Handle duplicate phone number error
    if (err.code === 11000) {
      return res.status(400).json({ message: "Phone number already exists" });
    }

    console.error(err);
    res.status(500).json({ message: "Failed to update provider" });
  }
});

// ================= DELETE PROVIDER =================
// Permanently removes provider from database
// Use carefully — job history will remain but provider record is gone
// Example: DELETE /provider/65abc123
app.delete("/provider/:id", async (req, res) => {
  try {

    const provider = await Provider.findByIdAndDelete(req.params.id);

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.json({ message: "Provider deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete provider" });
  }
});

// ================= DEACTIVATE PROVIDER =================
// Soft delete — marks provider inactive so they won't receive jobs
// Keeps historical records intact
// Example: PATCH /provider/65abc123/deactivate
app.patch("/provider/:id/deactivate", async (req, res) => {
  try {

    const provider = await Provider.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.json({
      message: "Provider deactivated",
      provider
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to deactivate provider" });
  }
});

// ================= SERVICE MASTER APIs =================
app.post("/service", async (req, res) => {
  try {
    const service = new ServiceModel(req.body);
    await service.save();
    res.send("Service saved");
  } catch {
    res.status(500).send("Service creation failed");
  }
});

app.get("/services", async (req, res) => {
  const services = await ServiceModel.find({});
  res.json(services);
});



// ================= GET SERVICE SLUGS + TITLES =================
// Returns lightweight list of services for dropdowns or navigation
// Example response: [{ slug: "electrician", title: "Electrician" }]
app.get("/services/slugs", async (req, res) => {
  try {

    const services = await ServiceModel.find({}, "slug title");

    res.json(services);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch services list" });
  }
});


app.get("/service/:slug", async (req, res) => {
  const service = await ServiceModel.findOne({ slug: req.params.slug });
  if (!service) return res.status(404).send("Not found");
  res.json(service);
});

// ================= UPDATE SERVICE =================
// Allows admin to update service details like title, slug, description, etc
// Example: PUT /service/65abc123
app.put("/service/:id", async (req, res) => {
  try {

    const service = await ServiceModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({
      message: "Service updated",
      service
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update service" });
  }
});

// ================= DELETE SERVICE =================
// Removes a service from the system
// Use carefully — existing requests may still reference it
// Example: DELETE /service/65abc123
app.delete("/service/:id", async (req, res) => {
  try {

    const service = await ServiceModel.findByIdAndDelete(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({
      message: "Service deleted successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete service" });
  }
});


// ================= TOGGLE PROVIDER AVAILABILITY =================
// Marks provider as available or unavailable for receiving new jobs
// Example: PATCH /provider/65abc123/availability
// Body: { "isAvailable": false }
app.patch("/provider/:id/availability", async (req, res) => {
  try {

    const { isAvailable } = req.body;

    const provider = await Provider.findByIdAndUpdate(
      req.params.id,
      { isAvailable },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.json({
      message: "Availability updated",
      provider
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update availability" });
  }
});
// ================= SERVICE REQUEST =================
app.post("/service-request", async (req, res) => {
  try {
    const { serviceSlug, customer } = req.body;

    const service = await ServiceModel.findOne({ slug: serviceSlug });
    if (!service) return res.status(400).send("Invalid service");

    const serviceReq = new ServiceRequest({
      serviceId: service._id,
      serviceName: service.title,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.addresses,
      selectedCategory,
      serviceAddons,
      totalAmount,
      preferredDate: customer.preferredDate,
    });

    await serviceReq.save();

    const providers = await Provider.find({
      jobRole: serviceSlug.toLowerCase(),
      isActive: true,
    });

    console.log("Providers found:", providers.length);

    for (const provider of providers) {
      try {
        const jobNotification = await JobNotification.create({
          serviceRequestId: serviceReq._id,
          providerId: provider._id,
          status: "created"
        });

        const now = new Date();

        const sessionActive =
          provider.lastInteractionAt &&
          now - provider.lastInteractionAt < 24 * 60 * 60 * 1000;

        if (sessionActive) {

          console.log("🟢 Sending SESSION message");

          await sendWhatsAppText(
            provider.phoneNumber,
            `New job request 🔧
Location: ${customer.address || "Not provided"}
Reply YES to accept`
          );

        } else {

          console.log("🔵 Sending TEMPLATE message");

          await sendWhatsAppTemplate(
            provider.phoneNumber,
            process.env.GUPSHUP_JOB_TEMPLATE_ID,
            [
              provider.name,
              customer.address || "Location not provided",
              new Date().toLocaleString("en-IN"),
            ]
          );

        }

        // ⭐ IMPORTANT
        await JobNotification.updateOne(
          { _id: jobNotification._id },
          { $set: { status: "sent" } }
        );

      } catch (err) {
        console.error("Provider failed:", provider.phoneNumber, err.message);
      }
    }

    res.json("Service request created");

  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to create request");
  }
});

// ================= LIST SERVICE REQUESTS =================
// Returns all service requests sorted by newest first
// Useful for admin dashboard and monitoring
// Example: GET /service-requests
app.get("/service-requests", async (req, res) => {
  try {

    const requests = await ServiceRequest.find({})
      .sort({ createdAt: -1 });

    res.json(requests);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch service requests" });
  }
});

// ================= GET SERVICE REQUEST BY ID =================
// Returns detailed info about a specific job
// Example: GET /service-request/65abc123
app.get("/service-request/:id", async (req, res) => {
  try {

    const request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Service request not found" });
    }

    res.json(request);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch service request" });
  }
});

// ================= CANCEL SERVICE REQUEST =================
// Allows admin or system to cancel a job
// Example: PATCH /service-request/65abc123/cancel
app.patch("/service-request/:id/cancel", async (req, res) => {
  try {

    const request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Service request not found" });
    }

    if (request.status === "cancelled") {
      return res.json({ message: "Request already cancelled" });
    }

    request.status = "cancelled";
    await request.save();

    res.json({
      message: "Service request cancelled",
      request
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel request" });
  }
});


// ================= JOB ACCEPT =================
app.post("/webhook/whatsapp", async (req, res) => {
  try {

    console.log("========== WhatsApp Webhook Hit ==========");

    const payload = req.body;
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    const incomingPhone =
      value?.messages?.[0]?.from ||
      value?.contacts?.[0]?.wa_id;

    if (!incomingPhone) {
      console.log("No phone found in payload");
      return res.sendStatus(200);
    }

    // ⭐ Normalize phone
    const normalizedPhone = incomingPhone.replace(/\D/g, "").slice(-10);

    // ⭐ Extract text
    let text =
      value?.messages?.[0]?.text?.body ||
      value?.messages?.[0]?.button?.text ||
      "";

    text = text.trim().toUpperCase();

    console.log("Incoming Phone:", normalizedPhone);
    console.log("Incoming Text:", text);

    // ⭐ Find provider
    const provider = await Provider.findOne({
      phoneNumber: normalizedPhone
    });

    if (!provider) {
      console.log("Provider not found");
      return res.sendStatus(200);
    }

    // ⭐ Update last interaction
    provider.lastInteractionAt = new Date();
    await provider.save();

    // ⭐ Find latest notification
    const jobNotification = await JobNotification.findOne({
      providerId: provider._id,
      status: "sent"
    }).sort({ createdAt: -1 });

    if (!jobNotification) {

  await sendWhatsAppText(
    normalizedPhone,
    "⚠️ This job is no longer available."
  );

  console.log("No active JobNotification");
  return res.sendStatus(200);
}


    // ===============================
    // ⭐ YES HANDLER
    // ===============================
    if (text === "YES") {

      console.log("YES received from provider");

      const serviceReq = await ServiceRequest.findById(
        jobNotification.serviceRequestId
      );

      if (!serviceReq) return res.sendStatus(200);

      // ⭐ Atomic job lock
      const update = await ServiceRequest.updateOne(
        { _id: serviceReq._id, status: "pending" },
        { $set: { status: "assigned" } }
      );

      // ⭐ If job already taken
      if (update.modifiedCount === 0) {

        await sendWhatsAppText(
          normalizedPhone,
          "⚠️ This job has already been taken."
        );

        console.log("Job already taken");
        return res.sendStatus(200);
      }

      // ⭐ Create acceptance record
      await JobAcceptance.create({
        requestId: serviceReq._id,
        providerId: provider._id,
        providerName: provider.name,
        providerPhone: provider.phoneNumber,
        source: "whatsapp"
      });

      // ⭐ Mark this notification accepted
      await JobNotification.updateOne(
        { _id: jobNotification._id },
        { $set: { status: "accepted" } }
      );

      // ⭐ OPTIONAL: expire other providers
      await JobNotification.updateMany(
        {
          serviceRequestId: serviceReq._id,
          _id: { $ne: jobNotification._id }
        },
        { $set: { status: "expired" } }
      );

      // ⭐ Send job confirmation template
      await sendWhatsAppTemplate(
        normalizedPhone,
        process.env.GUPSHUP_JOB_ACCEPTED_TEMPLATE_ID,
        [
          serviceReq.customerName,
          serviceReq.customerPhone,
          serviceReq.customerAddress || "Address not available"
        ]
      );

      console.log("Job accepted successfully");
    }

    // ===============================
    // ⭐ NO HANDLER
    // ===============================
    if (text === "NO") {

      console.log("Provider rejected job");

      await JobNotification.updateOne(
        { _id: jobNotification._id },
        { $set: { status: "rejected" } }
      );
    }

    console.log("========== Webhook Completed ==========");

  } catch (err) {
    console.error("Webhook error:", err);
  }

  res.sendStatus(200);
});

app.get("/health", (req, res) => {
  res.send("OK");
});

// ================= SERVER START =================
const PORT = process.env.PORT || 7777;

connectDB()
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("DB connection failed", err);
  });
