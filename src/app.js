require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const { connectDB } = require("./config/db");
const { sendWhatsAppTemplate } = require("./utils/sendWhatsapp");

const ServiceModel = require("./models/ServiceModel");
const Provider = require("./models/Provider");
const { ServiceRequest } = require("./models/ServiceRequest");
const { JobNotification } = require("./models/JobNotification");
const { JobAcceptance } = require("./models/JobAcceptance");
const JobAssignmentHistory = require("./models/JobAssignmentHistory");
const { sendEmail } = require("./utils/sendEmail");

const app = express();

app.use(cors());
app.use(express.json());

// ================= HELPERS =================

function formatDestination(phone) {
  phone = phone.replace(/\D/g, "").slice(-10);
  return "91" + phone;
}

async function sendWhatsAppText(destination, text) {
  try {
    const formattedDestination = formatDestination(destination);

    await axios.post(
      "https://api.gupshup.io/wa/api/v1/msg",
      new URLSearchParams({
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE_NUMBER,
        destination: formattedDestination,
        message: JSON.stringify({ type: "text", text }),
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_API_KEY,
        },
      },
    );
  } catch (err) {
    console.error("WhatsApp text error:", err?.response?.data || err.message);
  }
}

function formatLocation(addr) {
  if (!addr) return "Location not available";
  return (
    [addr.area, addr.district].filter(Boolean).join(", ") ||
    "Location not available"
  );
}

// ================= PROVIDERS =================

// Create new provider
app.post("/provider", async (req, res) => {
  try {
    const provider = new Provider({
      ...req.body,
      jobRole: req.body.jobRole.map((r) => r.toLowerCase()),
    });

    await provider.save();
    res.json("Provider Saved");
  } catch {
    res.status(500).send("Something went wrong");
  }
});

// create bulk provider

app.post("/providers/bulk", async (req, res) => {
  try {
    const { jobRole, providers } = req.body;

    // 🔹 Basic validation
    if (!jobRole || !Array.isArray(providers)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const role = jobRole.toLowerCase().trim();

    // 🔹 Format + clean data
    const formattedProviders = providers
      .map((p) => ({
        name: p.name?.trim(),
        phoneNumber: String(p.phoneNumber || "").trim(),
        address: p.address?.trim() || "",
        jobRole: [role],
        isActive: true,
        isAvailable: true,
      }))
      .filter((p) => p.name && p.phoneNumber); // remove bad rows

    if (formattedProviders.length === 0) {
      return res.status(400).json({ message: "No valid providers to insert" });
    }

    // 🔹 Insert (skip duplicates)
    const result = await Provider.insertMany(formattedProviders, {
      ordered: false,
    });

    res.status(201).json({
      message: "Bulk insert successful",
      insertedCount: result.length,
    });
  } catch (err) {
    console.log("Bulk insert error:", err.message);

    res.status(500).json({
      message: "Bulk insert failed",
      error: err.message,
    });
  }
});

// Get all providers
app.get("/providers", async (req, res) => {
  try {
    const providers = await Provider.find({}).sort({ createdAt: -1 });
    res.json(providers);
  } catch {
    res.status(500).send("Failed to fetch providers");
  }
});

// Get provider by ID
app.get("/provider/:id", async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    res.json(provider);
  } catch {
    res.status(500).json({ message: "Failed to fetch provider" });
  }
});

// Get providers by service role
app.get("/providers/:service", async (req, res) => {
  try {
    const providers = await Provider.find({
      jobRole: req.params.service.toLowerCase(),
      isActive: true,
      isAvailable: true,
    });

    res.json(providers);
  } catch {
    res.status(500).send("Error fetching providers");
  }
});

// Update provider details
app.put("/provider/:id", async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.jobRole)
      updates.jobRole = updates.jobRole.map((r) => r.toLowerCase());

    if (updates.phoneNumber)
      updates.phoneNumber = updates.phoneNumber.replace(/\D/g, "").slice(-10);

    const provider = await Provider.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    res.json({ message: "Provider updated", provider });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: "Phone number already exists" });

    res.status(500).json({ message: "Failed to update provider" });
  }
});

// Delete provider permanently
app.delete("/provider/:id", async (req, res) => {
  try {
    const provider = await Provider.findByIdAndDelete(req.params.id);

    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    res.json({ message: "Provider deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete provider" });
  }
});

// Deactivate provider (soft delete)
app.patch("/provider/:id/deactivate", async (req, res) => {
  try {
    const provider = await Provider.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );

    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    res.json({ message: "Provider deactivated", provider });
  } catch {
    res.status(500).json({ message: "Failed to deactivate provider" });
  }
});

// Update provider availability
app.patch("/provider/:id/availability", async (req, res) => {
  try {
    const { isAvailable } = req.body;

    const provider = await Provider.findByIdAndUpdate(
      req.params.id,
      { isAvailable },
      { new: true },
    );

    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    res.json({ message: "Availability updated", provider });
  } catch {
    res.status(500).json({ message: "Failed to update availability" });
  }
});

// Activate a Deactivated Provider
app.patch("/provider/:id/activate", async (req, res) => {
  try {
    const provider = await Provider.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true },
    );

    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    res.json({
      message: "Provider activated",
      provider,
    });
  } catch {
    res.status(500).json({ message: "Failed to activate provider" });
  }
});

// ================= SERVICES =================

// Create service
app.post("/service", async (req, res) => {
  try {
    const service = new ServiceModel(req.body);
    await service.save();

    res.send("Service saved");
  } catch {
    res.status(500).send("Service creation failed");
  }
});

// Get all services
app.get("/services", async (req, res) => {
  const services = await ServiceModel.find({});
  res.json(services);
});

// Get service slugs for dropdown/navigation
app.get("/services/slugs", async (req, res) => {
  try {
    const services = await ServiceModel.find({}, "slug title heroImg");
    res.json(services);
  } catch {
    res.status(500).json({ message: "Failed to fetch services list" });
  }
});

// Get single service by slug
app.get("/service/:slug", async (req, res) => {
  const service = await ServiceModel.findOne({ slug: req.params.slug });

  if (!service) return res.status(404).send("Not found");

  res.json(service);
});

// Update service
app.put("/service/:id", async (req, res) => {
  try {
    const service = await ServiceModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!service) return res.status(404).json({ message: "Service not found" });

    res.json({ message: "Service updated", service });
  } catch {
    res.status(500).json({ message: "Failed to update service" });
  }
});

// Delete service
app.delete("/service/:id", async (req, res) => {
  try {
    const service = await ServiceModel.findByIdAndDelete(req.params.id);

    if (!service) return res.status(404).json({ message: "Service not found" });

    res.json({ message: "Service deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete service" });
  }
});

// Add subservice
app.patch("/service/:serviceId/subservice", async (req, res) => {
  try {
    const service = await ServiceModel.findById(req.params.serviceId);

    if (!service) return res.status(404).json({ message: "Service not found" });

    service.services.push(req.body);

    await service.save();

    res.json({
      message: "Subservice added",
      subService: req.body,
    });
  } catch {
    res.status(500).json({ message: "Failed to add subservice" });
  }
});

// Update subservice
app.put("/service/:serviceId/subservice/:subServiceName", async (req, res) => {
  try {
    const { serviceId, subServiceName } = req.params;

    const service = await ServiceModel.findById(serviceId);

    if (!service) return res.status(404).json({ message: "Service not found" });

    const subService = service.services.find(
      (s) => s.name.toLowerCase() === subServiceName.toLowerCase(),
    );

    if (!subService)
      return res.status(404).json({ message: "Subservice not found" });

    Object.assign(subService, req.body);

    await service.save();

    res.json({
      message: "Subservice updated",
      subService,
    });
  } catch {
    res.status(500).json({ message: "Failed to update subservice" });
  }
});

// Delete subservice
app.delete(
  "/service/:serviceId/subservice/:subServiceName",
  async (req, res) => {
    try {
      const { serviceId, subServiceName } = req.params;

      const service = await ServiceModel.findById(serviceId);

      if (!service)
        return res.status(404).json({ message: "Service not found" });

      service.services = service.services.filter(
        (s) => s.name.toLowerCase() !== subServiceName.toLowerCase(),
      );

      await service.save();

      res.json({
        message: "Subservice deleted",
      });
    } catch {
      res.status(500).json({ message: "Failed to delete subservice" });
    }
  },
);

// Add detailed subservice
app.patch(
  "/service/:serviceId/subservice/:subServiceName/detail",
  async (req, res) => {
    try {
      const { serviceId, subServiceName } = req.params;

      const service = await ServiceModel.findById(serviceId);

      if (!service)
        return res.status(404).json({ message: "Service not found" });

      const subService = service.services.find(
        (s) => s.name.toLowerCase() === subServiceName.toLowerCase(),
      );

      if (!subService)
        return res.status(404).json({ message: "Subservice not found" });

      subService.detailedSubService.push(req.body);

      await service.save();

      res.json({
        message: "Detailed subservice added",
        detail: req.body,
      });
    } catch {
      res.status(500).json({ message: "Failed to add detailed subservice" });
    }
  },
);

// Update detailed subservice
app.put(
  "/service/:serviceId/subservice/:subServiceName/detail/:detailName",
  async (req, res) => {
    try {
      const { serviceId, subServiceName, detailName } = req.params;

      const service = await ServiceModel.findById(serviceId);

      if (!service)
        return res.status(404).json({ message: "Service not found" });

      const subService = service.services.find(
        (s) => s.name.toLowerCase() === subServiceName.toLowerCase(),
      );

      if (!subService)
        return res.status(404).json({ message: "Subservice not found" });

      const detail = subService.detailedSubService.find(
        (d) => d.name.toLowerCase() === detailName.toLowerCase(),
      );

      if (!detail)
        return res.status(404).json({ message: "Detailed service not found" });

      Object.assign(detail, req.body);

      await service.save();

      res.json({
        message: "Detailed subservice updated",
        detail,
      });
    } catch {
      res.status(500).json({ message: "Failed to update detailed subservice" });
    }
  },
);

// Delete detailed subservice
app.delete(
  "/service/:serviceId/subservice/:subServiceName/detail/:detailName",
  async (req, res) => {
    try {
      const { serviceId, subServiceName, detailName } = req.params;

      const service = await ServiceModel.findById(serviceId);

      if (!service)
        return res.status(404).json({ message: "Service not found" });

      const subService = service.services.find(
        (s) => s.name.toLowerCase() === subServiceName.toLowerCase(),
      );

      if (!subService)
        return res.status(404).json({ message: "Subservice not found" });

      subService.detailedSubService = subService.detailedSubService.filter(
        (d) => d.name.toLowerCase() !== detailName.toLowerCase(),
      );

      await service.save();

      res.json({
        message: "Detailed subservice deleted",
      });
    } catch {
      res.status(500).json({ message: "Failed to delete detailed subservice" });
    }
  },
);

// ================= SERVICE REQUESTS =================

// Create new service request
app.post("/service-request", async (req, res) => {
  try {
    const {
      serviceSlug,
      selectedCategory,
      serviceAddons,
      totalAmount,
      customer,
    } = req.body;

    if (!customer?.name || !customer?.phone || !customer?.email) {
      return res.status(400).send("Customer info missing");
    }

    console.log("📩 Incoming request for:", customer.email);

    const service = await ServiceModel.findOne({ slug: serviceSlug });
    if (!service) return res.status(400).send("Invalid service");

    const locationText = formatLocation(customer.addresses);

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
      email: customer.email,
      notificationStatus: "pending",
      notificationMeta: {
        email: {
          status: "pending",
          error: null,
          sentAt: null,
        },
        providerNotifiedCount: 0,
      },
    });

    await serviceReq.save();

    const requestId = serviceReq._id.toString();
    const cancelUrl = `${process.env.BASE_URL}/service-request/${requestId}/cancel`;

    res.json({
      message: "Service request created",
      requestId,
    });

    // ================= BACKGROUND =================
    setImmediate(async () => {
      let successCount = 0;
      let emailMeta = {
        status: "pending",
        error: null,
        sentAt: null,
      };

      try {
        // ================= EMAIL =================
        try {
          console.log("📤 Sending email to:", customer.email);

          const result = await sendEmail(
            customer.email,
            "Your Service Request is Received",
            `
            <h2>Hi ${customer.name},</h2>
            <p>Your request has been successfully received.</p>
            <p><b>Request ID:</b> ${requestId}</p>
            <p><b>Service:</b> ${service.title}</p>
            <p><b>Location:</b> ${locationText}</p>
            <p>We are assigning a provider shortly.</p>
            <p><b>Estimated response time:</b> 5–10 minutes</p>
            <br/>
            <a href="${cancelUrl}">Cancel Request</a>
            <br/>
            <p>Thank you,<br/>Harmain Team</p>
          `
          );

          console.log("✅ Email API response:", result);

          emailMeta = {
            status: "sent",
            error: null,
            sentAt: new Date(),
          };

        } catch (err) {
          console.error("❌ Email failed FULL:", err);

          emailMeta = {
            status: "failed",
            error: err.message,
            sentAt: null,
          };
        }

        // ================= PROVIDERS =================
        const providers = await Provider.find({
          jobRole: serviceSlug.toLowerCase(),
          isActive: true,
          isAvailable: true,
        });

        console.log("👨‍🔧 Providers found:", providers.length);

        for (const provider of providers) {
          try {
            const jobNotification = await JobNotification.create({
              serviceRequestId: serviceReq._id,
              providerId: provider._id,
              status: "created",
            });

            await sendWhatsAppText(
              provider.phoneNumber,
              `New Job: ${serviceReq.serviceName}`
            );

            await JobNotification.updateOne(
              { _id: jobNotification._id },
              { status: "sent" }
            );

            successCount++;
          } catch (err) {
            console.error("❌ Provider failed:", provider.phoneNumber, err);
          }
        }

        // ================= FINAL UPDATE =================
        console.log("📊 Final Status:", {
          successCount,
          emailMeta,
        });

        await ServiceRequest.updateOne(
          { _id: serviceReq._id },
          {
            notificationStatus: successCount > 0 ? "sent" : "failed",
            notificationMeta: {
              email: emailMeta,
              providerNotifiedCount: successCount,
            },
          }
        );

      } catch (err) {
        console.error("🔥 Background failed FULL:", err);

        await ServiceRequest.updateOne(
          { _id: serviceReq._id },
          {
            notificationStatus: "failed",
            notificationMeta: {
              email: emailMeta,
              providerNotifiedCount: successCount,
            },
          }
        );
      }
    });

  } catch (error) {
    console.error("🔥 API ERROR:", error);
    res.status(500).send("Failed to create request");
  }
});

// Get service requests (optionally filter by status)
app.get("/service-requests", async (req, res) => {
  try {
    const filter = {};

    // 🔹 existing filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // 🔥 ADD THIS (important)
    if (req.query.notificationStatus) {
      filter.notificationStatus = req.query.notificationStatus;
    }

    const requests = await ServiceRequest.find(filter)
      .sort({ createdAt: -1 });

    res.json(requests);

  } catch (err) {
    console.error("Fetch requests error:", err);
    res.status(500).json({ message: "Failed to fetch service requests" });
  }
});

// ================= WHATSAPP WEBHOOK =================

app.post("/webhook/whatsapp", async (req, res) => {
  try {
    const payload = req.body;
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.messages?.length) return res.sendStatus(200);

    const incomingPhone = value.messages[0]?.from || value.contacts?.[0]?.wa_id;

    if (!incomingPhone) return res.sendStatus(200);

    const normalizedPhone = incomingPhone.replace(/\D/g, "").slice(-10);

    let text =
      value.messages[0]?.text?.body || value.messages[0]?.button?.text || "";

    text = text.trim().toUpperCase();

    if (!["YES", "NO"].includes(text)) {
      return res.sendStatus(200);
    }

    // ================= FIND PROVIDER =================

    const provider = await Provider.findOne({
      phoneNumber: normalizedPhone,
      isActive: true,
    });

    if (!provider) return res.sendStatus(200);

    provider.lastInteractionAt = new Date();
    await provider.save();

    // ================= FIND JOB =================

    const jobNotification = await JobNotification.findOne({
      providerId: provider._id,
      status: "sent",
    }).sort({ createdAt: -1 });

    if (!jobNotification) {
      await sendWhatsAppText(
        normalizedPhone,
        "⚠️ This job is no longer available.",
      );
      return res.sendStatus(200);
    }

    const serviceReq = await ServiceRequest.findById(
      jobNotification.serviceRequestId,
    );

    if (!serviceReq) return res.sendStatus(200);

    // ================= ✅ DUPLICATE WEBHOOK FIX =================

    const alreadyAccepted = await JobAcceptance.findOne({
      requestId: serviceReq._id,
      providerId: provider._id,
    });

    if (alreadyAccepted) {
      return res.sendStatus(200);
    }

    // ================= YES FLOW =================

    if (text === "YES") {
      const update = await ServiceRequest.updateOne(
        { _id: serviceReq._id, status: "pending" },
        {
          $set: {
            status: "assigned",
            assignedProviderId: provider._id,
            assignedProviderName: provider.name,
            assignedProviderPhone: provider.phoneNumber,
          },
        },
      );

      if (update.modifiedCount === 0) {
        await sendWhatsAppText(
          normalizedPhone,
          "⚠️ This job has already been taken.",
        );
        return res.sendStatus(200);
      }

      const cleanAddons = serviceReq.serviceAddons?.filter(
        (a) => a && a.trim(),
      );

      const addonsText =
        cleanAddons?.length > 0 ? cleanAddons.join(", ") : "None";

      const fullAddress = [
        serviceReq.customerAddress?.house,
        serviceReq.customerAddress?.area,
        serviceReq.customerAddress?.district,
        serviceReq.customerAddress?.pincode,
      ]
        .filter(Boolean)
        .join(", ");

      const amountText =
        serviceReq.totalAmount !== undefined && serviceReq.totalAmount !== null
          ? `₹${serviceReq.totalAmount}`
          : "N/A";

      await JobAcceptance.create({
        requestId: serviceReq._id,
        providerId: provider._id,
        providerName: provider.name,
        providerPhone: provider.phoneNumber,
        source: "whatsapp",
      });

      await JobAssignmentHistory.create({
        requestId: serviceReq._id,
        providerId: provider._id,
        providerName: provider.name,
        action: "accepted",
      });

      await JobNotification.updateOne(
        { _id: jobNotification._id },
        { status: "accepted" },
      );

      await JobNotification.updateMany(
        {
          serviceRequestId: serviceReq._id,
          _id: { $ne: jobNotification._id },
        },
        { status: "expired" },
      );

      await sendWhatsAppTemplate(
        normalizedPhone,
        process.env.GUPSHUP_CONFIRMED_TEMPLATE_ID,
        [
          serviceReq.customerName,
          serviceReq.customerPhone,
          fullAddress,
          serviceReq.serviceName,
          addonsText,
          amountText,
        ],
      );
    }

    // ================= NO FLOW =================

    if (text === "NO") {
      await JobNotification.updateOne(
        { _id: jobNotification._id },
        { status: "rejected" },
      );

      await JobAssignmentHistory.create({
        requestId: serviceReq._id,
        providerId: provider._id,
        providerName: provider.name,
        action: "rejected",
      });
    }
  } catch (err) {
    console.error("Webhook error:", err);
  }

  res.sendStatus(200);
});

// ================= ACCEPT/REJECT JOBS =================

// Get all accepted jobs
app.get("/jobs/accepted", async (req, res) => {
  try {
    const filter = {};

    // if ?status=active is passed
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const jobs = await JobAcceptance.find(filter)
      .populate("requestId")
      .populate("providerId", "name phoneNumber jobRole")
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (err) {
    console.error("Fetch accepted jobs error:", err);
    res.status(500).json({ message: "Failed to fetch accepted jobs" });
  }
});

// Get accepted jobs for a provider
app.get("/provider/:id/jobs", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Provider id required" });
    }

    const jobs = await JobAcceptance.find({
      providerId: id,
      status: "active", // only return currently active jobs
    })
      .populate("requestId")
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (err) {
    console.error("Fetch provider jobs error:", err);
    res.status(500).json({ message: "Failed to fetch provider jobs" });
  }
});

// Get single accepted job
app.get("/jobs/accepted/:id", async (req, res) => {
  try {
    const job = await JobAcceptance.findById(req.params.id)
      .populate("requestId")
      .populate("providerId");

    if (!job) return res.status(404).json({ message: "Job not found" });

    res.json(job);
  } catch {
    res.status(500).json({ message: "Failed to fetch job" });
  }
});

// cancel job
app.patch("/service-request/:requestId/cancel", async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await ServiceRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Service request not found" });
    }

    if (request.status === "cancelled") {
      return res.status(400).json({ message: "Job already cancelled" });
    }

    // 🔴 Update request status
    request.status = "cancelled";
    await request.save();

    // 🔴 Cancel active jobs
    await JobAcceptance.updateMany(
      { requestId: request._id, status: "active" },
      { $set: { status: "cancelled" } },
    );

    // 🔴 Expire notifications
    await JobNotification.updateMany(
      { serviceRequestId: request._id },
      { status: "expired" },
    );

    // 🔴 Clean history (FIXED)
    const historyData = {
      requestId: request._id,
      action: "cancelled_by_admin",
      actor: "admin",
    };

    if (request.assignedProviderId) {
      historyData.providerId = request.assignedProviderId;
      historyData.providerName = request.assignedProviderName;
    }

    await JobAssignmentHistory.create(historyData);

    // 🔴 Notify provider (if assigned)
    if (request.assignedProviderPhone) {
      await sendWhatsAppText(
        request.assignedProviderPhone,
        "⚠️ The assigned job has been cancelled by admin.",
      );
    }

    res.json({
      message: "Job cancelled successfully",
    });
  } catch (err) {
    console.error("Cancel job error:", err);
    res.status(500).json({ message: "Failed to cancel job" });
  }
});

// Manually assign job by admin
app.post("/service-request/:requestId/assign", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { providerId } = req.body;

    const serviceReq = await ServiceRequest.findById(requestId);

    if (!serviceReq)
      return res.status(404).json({ message: "Service request not found" });

    if (serviceReq.status !== "pending")
      return res
        .status(400)
        .json({ message: "Job already assigned or closed" });

    const provider = await Provider.findById(providerId);

    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    serviceReq.status = "assigned";
    serviceReq.assignedProviderId = provider._id;
    serviceReq.assignedProviderName = provider.name;
    serviceReq.assignedProviderPhone = provider.phoneNumber;

    await serviceReq.save();

    await JobAcceptance.create({
      requestId: serviceReq._id,
      providerId: provider._id,
      providerName: provider.name,
      providerPhone: provider.phoneNumber,
      source: "admin",
    });

    await JobAssignmentHistory.create({
      requestId: serviceReq._id,
      providerId: provider._id,
      providerName: provider.name,
      action: "assigned_by_admin",
    });

    await JobNotification.updateMany(
      { serviceRequestId: serviceReq._id },
      { status: "expired" },
    );

    res.json({
      message: "Job manually assigned",
      provider: provider.name,
    });
  } catch {
    res.status(500).json({ message: "Manual assignment failed" });
  }
});

// Reject service request with reason
app.post("/service-request/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;

    const request = await ServiceRequest.findById(req.params.id);

    if (!request)
      return res.status(404).json({ message: "Service request not found" });

    if (request.status !== "pending")
      return res.status(400).json({ message: "Request already processed" });

    request.status = "rejected";
    request.rejectionReason = reason;
    request.rejectedBy = "admin";

    await request.save();

    await JobNotification.updateMany(
      { serviceRequestId: request._id },
      { status: "expired" },
    );

    res.json({
      message: "Request rejected",
      reason,
    });
  } catch {
    res.status(500).json({ message: "Failed to reject request" });
  }
});

// Manually un-assign job by admin
app.patch("/service-request/:requestId/reassign", async (req, res) => {
  try {
    const { providerId } = req.body;
    const { requestId } = req.params;

    const request = await ServiceRequest.findById(requestId);

    if (!request)
      return res.status(404).json({ message: "Service request not found" });

    const provider = await Provider.findById(providerId);

    if (!provider)
      return res.status(404).json({ message: "Provider not found" });

    if (
      request.assignedProviderId &&
      request.assignedProviderId.toString() === providerId
    ) {
      return res.status(400).json({
        message: "Job already assigned to this provider",
      });
    }

    // expire previous active acceptances
    await JobAcceptance.updateMany(
      { requestId: request._id, status: "active" },
      { $set: { status: "reassigned" } },
    );

    // update service request provider
    request.assignedProviderId = provider._id;
    request.assignedProviderName = provider.name;
    request.assignedProviderPhone = provider.phoneNumber;

    await request.save();

    // create new acceptance record
    const newJob = await JobAcceptance.create({
      requestId: request._id,
      providerId: provider._id,
      providerName: provider.name,
      providerPhone: provider.phoneNumber,
      source: "admin-reassign",
      status: "active",
    });

    // save assignment history
    await JobAssignmentHistory.create({
      requestId: request._id,
      providerId: provider._id,
      providerName: provider.name,
      action: "reassigned_by_admin",
    });

    res.json({
      message: "Job reassigned successfully",
      provider: provider.name,
      jobAcceptanceId: newJob._id,
    });
  } catch (err) {
    console.error("Reassign error:", err);
    res.status(500).json({ message: "Failed to reassign job" });
  }
});

// View Job Assignment History
app.get("/service-request/:id/history", async (req, res) => {
  try {
    const history = await JobAssignmentHistory.find({
      requestId: req.params.id,
    })
      .populate("providerId", "name phoneNumber jobRole")
      .sort({ createdAt: 1 });

    res.json(history);
  } catch {
    res.status(500).json({ message: "Failed to fetch job history" });
  }
});

// ================= DASHBOARD =================

// Get admin dashboard statistics
app.get("/dashboard", async (req, res) => {
  try {
    const [
      pending,
      assigned,
      rejected,
      cancelled,
      activeProviders,
      availableProviders,
      recentRequests,
      recentAcceptedJobs,
      failedNotifications, // ✅ NEW
    ] = await Promise.all([
      ServiceRequest.countDocuments({ status: "pending" }),

      ServiceRequest.countDocuments({ status: "assigned" }),

      ServiceRequest.countDocuments({ status: "rejected" }),

      ServiceRequest.countDocuments({ status: "cancelled" }),

      Provider.countDocuments({ isActive: true }),

      Provider.countDocuments({ isAvailable: true }),

      ServiceRequest.find({}).sort({ createdAt: -1 }).limit(10),

      JobAcceptance.find({ status: "active" })
        .populate("providerId", "name phoneNumber")
        .populate("requestId", "customerName serviceName")
        .sort({ createdAt: -1 })
        .limit(10),

      // ✅ ADD THIS
      ServiceRequest.countDocuments({ notificationStatus: "failed" }),
    ]);

    res.json({
      stats: {
        pending,
        assigned,
        rejected,
        cancelled,
        failedNotifications, // ✅ NEW (safe add)
      },

      providers: {
        active: activeProviders,
        available: availableProviders,
      },

      recentRequests,
      recentAcceptedJobs,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({
      message: "Failed to load dashboard",
    });
  }
});

// ================= SERVICE REQUEST DETAILS =================

app.get("/service-request/:id/details", async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);

    if (!request)
      return res.status(404).json({ message: "Service request not found" });

    const acceptance = await JobAcceptance.findOne({
      requestId: request._id,
    }).populate("providerId", "name phoneNumber jobRole");

    const notifications = await JobNotification.find({
      serviceRequestId: request._id,
    })
      .populate("providerId", "name phoneNumber jobRole")
      .sort({ createdAt: 1 });

    res.json({
      request,
      acceptance,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch request details" });
  }
});

// Get Single Service Request
app.get("/service-request/:id", async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);

    if (!request)
      return res.status(404).json({ message: "Service request not found" });

    res.json(request);
  } catch {
    res.status(500).json({ message: "Failed to fetch service request" });
  }
});

const allowedTransitions = {
  pending: ["assigned", "cancelled", "rejected"],
  assigned: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
};

app.patch("/service-request/:id/status", async (req, res) => {
  try {
    const { status: newStatus } = req.body;

    const request = await ServiceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Service request not found" });
    }

    const currentStatus = request.status;

    // ✅ Safe transition validation
    if (
      !allowedTransitions[currentStatus] ||
      !allowedTransitions[currentStatus].includes(newStatus)
    ) {
      return res.status(400).json({
        message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
      });
    }

    // ================= BUSINESS LOGIC =================

    // 🔴 If cancelling
    if (newStatus === "cancelled") {
      await JobAcceptance.updateMany(
        { requestId: request._id, status: "active" },
        { $set: { status: "cancelled" } },
      );

      await JobNotification.updateMany(
        { serviceRequestId: request._id },
        { status: "expired" },
      );

      if (request.assignedProviderPhone) {
        await sendWhatsAppText(
          request.assignedProviderPhone,
          "⚠️ The assigned job has been cancelled.",
        );
      }
    }

    // 🟢 If completed
    if (newStatus === "completed") {
      await JobAcceptance.updateMany(
        { requestId: request._id, status: "active" },
        { $set: { status: "completed" } },
      );
    }

    // 🟡 Prevent invalid manual assignment
    if (newStatus === "assigned" && !request.assignedProviderId) {
      return res.status(400).json({
        message: "Cannot mark assigned without provider",
      });
    }

    // ================= UPDATE =================

    request.status = newStatus;
    await request.save();

    // ================= HISTORY =================

    const historyData = {
      requestId: request._id,
      action: `status_changed_to_${newStatus}`,
      actor: "admin", // or "system" if automated
    };

    // only include provider if exists
    if (request.assignedProviderId) {
      historyData.providerId = request.assignedProviderId;
      historyData.providerName = request.assignedProviderName;
    }

    await JobAssignmentHistory.create(historyData);

    // ================= RESPONSE =================

    res.json({
      message: "Status updated successfully",
      from: currentStatus,
      to: newStatus,
    });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

// cancel req by customer
app.get("/service-request/:requestId/cancel", async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await ServiceRequest.findById(requestId);

    if (!request) {
      return res.send("Invalid request.");
    }

    if (request.status === "cancelled") {
      return res.send("This request is already cancelled.");
    }

    // 🔴 Update request
    request.status = "cancelled";
    await request.save();

    // 🔴 Cancel active jobs
    await JobAcceptance.updateMany(
      { requestId: request._id, status: "active" },
      { $set: { status: "cancelled" } },
    );

    // 🔴 Expire notifications
    await JobNotification.updateMany(
      { serviceRequestId: request._id },
      { status: "expired" },
    );

    // 🔴 History
    await JobAssignmentHistory.create({
      requestId: request._id,
      action: "cancelled_by_customer",
      actor: "customer",
    });

    // 🔴 Notify provider (if assigned)
    if (request.assignedProviderPhone) {
      await sendWhatsAppText(
        request.assignedProviderPhone,
        "⚠️ The job has been cancelled by the customer.",
      );
    }

    return res.send(`
      <h2>Request Cancelled</h2>
      <p>Your service request has been cancelled successfully.</p>
    `);
  } catch (err) {
    console.error("Cancel via link error:", err);
    res.send("Something went wrong.");
  }
});
// ================= SYSTEM =================

// Health check
app.get("/health", (req, res) => {
  res.send("OK");
});

// ================= SERVER =================

const PORT = process.env.PORT || 7777;

connectDB()
  .then(() => {
    console.log("MongoDB connected");

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("DB connection failed", err);
  });
