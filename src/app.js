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



app.get("/services/slugs", async (req, res) => {
  try {
    const slugs = await ServiceModel.distinct("slug");
    res.json(slugs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch slugs" });
  }
});





app.get("/service/:slug", async (req, res) => {
  const service = await ServiceModel.findOne({ slug: req.params.slug });
  if (!service) return res.status(404).send("Not found");
  res.json(service);
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
      customerAddress: customer.address,
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
