const express = require('express');
const app = express();
const mongoose=require("mongoose");

// =======================
// DB & MODELS IMPORTS
// =======================

// const { adminAuth, userAuth } = require("./middlewares/auth"); // Auth (future use)

const { connectDB } = require("./config/db");

const ServiceModel = require("./models/ServiceModel");
const Provider = require("./models/Provider");
const { ServiceRequest } = require('./models/ServiceRequest');
const { JobNotification } = require('./models/JobNotification');
const { JobAcceptance } = require('./models/JobAcceptance');

app.use(express.json());


// =====================================================
// PROVIDER (EMPLOYEE) APIs
// =====================================================

// Create a new provider (plumber, electrician, etc.)
app.post("/provider", async (req, res) => {
    try {
        const provider = new Provider(req.body);
        await provider.save();
        res.json("Provider Saved");
    } catch (err) {
        res.status(401).send("something went wrong");
    }
});

// Get providers by service/job role (used internally or for testing)
app.get("/providers/:service", async (req, res) => {
    try {
        const { service } = req.params;
        const providers = await Provider.find({ jobRole: service });
        res.json(providers);
    } catch (err) {
        res.json("something went wrong");
    }
});

// Get active providers for a given category (future FE use)
app.get("/providers", async (req, res) => {
    try {
        const { category } = req.body;
        const providers = await Provider.find({
            jobRole: category,
            isActive: true
        });
        res.json(providers);
    } catch (err) {
        res.json("something went wrong");
    }
});


// =====================================================
// SERVICE MASTER APIs
// (Plumbing, Carpentry, etc.)
// =====================================================

// Add a single service
app.post("/service", async (req, res) => {
    try {
        const service = new ServiceModel(req.body);
        await service.save();
        res.send("service saved");
    } catch (err) {
        res.status(401).send("something went wrong");
    }
});

// Add multiple services at once (bulk insert)
app.post("/services", async (req, res) => {
    try {
        await ServiceModel.insertMany(req.body);
        res.status(201).send("Services saved successfully");
    } catch (err) {
        res.status(400).json(err);
    }
});

// Get all services (for frontend listing)
app.get("/services", async (req, res) => {
    try {
        const services = await ServiceModel.find({});
        res.json(services);
    } catch (err) {
        res.send("something went wrong");
    }
});

// Get a single service by slug (SEO-friendly URL)
app.get("/service/:slug", async (req, res) => {
    try {
        const { slug } = req.params;
        const doc = await ServiceModel.findOne({ slug });
        res.json(doc);
    } catch {
        res.status(401).send("document not found");
    }
});


// =====================================================
// SERVICE REQUEST APIs (Customer creates job)
// =====================================================

// Customer creates a service request (e.g., plumbing job)
app.post("/service-request", async (req, res) => {
    try {
        const { name, phone, category } = req.body;

        // Find service by slug
        const service = await ServiceModel.findOne({ slug: category });
        if (!service) {
            res.status(400).send("No records found");
            return;
        }

        // Create service request
        const serviceReq = new ServiceRequest({
            serviceId: service._id,
            customerName: name,
            customerPhone: phone,
            serviceName: service.title,
        });

        await serviceReq.save();
        

        // Fetch all active providers for this service
        const providers = await Provider.find({
            jobRole: category,
            isActive: true
        });

        console.log("Category received:", category);
        console.log("Providers found:", providers.length);


        // Create job notifications (simulation of WhatsApp sending)
        for (const provider of providers) {
            const jobNotification = new JobNotification({
                serviceRequestId: serviceReq._id,
                providerId: provider._id,
            });
            await jobNotification.save();

            // Simulated WhatsApp message log
            console.log(
                `Sending job to ${provider.phoneNumber} | JobId: ${serviceReq._id}`
            );
        }

        res.json("Request received successfully");
    } catch (err) {
        res.status(500).json("failed");
    }
});


// Get all service requests OR filter by status (?status=pending/assigned)
app.get("/service-request", async (req, res) => {
    try {
        const status = req.query.status;

        // Validate status against schema enum
        if (ServiceRequest.schema.paths.status.enumValues.includes(status)) {
            const services = await ServiceRequest.find({ status });
            res.json(services);
            return;
        }

        if (status) {
            res.status(400).send("Bad request");
            return;
        }

        // Return all service requests
        const services = await ServiceRequest.find({});
        res.json(services);
    } catch (err) {
        res.status(500).send("something went wrong");
    }
});

// Get single service request by ID (admin / debug use)
app.get("/service-request/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const services = await ServiceRequest.findById(id);
        res.json(services);
    } catch (err) {
        res.send("something went wrong");
    }
});


// =====================================================
// JOB ACCEPTANCE API (CORE BUSINESS LOGIC)
// =====================================================

// Provider accepts job (simulated / WhatsApp-ready)
app.post("/service-request/accept", async (req, res) => {
    const { source, serviceReqId, phoneNumber } = req.body;

    console.log()

    // Identify provider by phone number
    const provider = await Provider.findOne({ phoneNumber });

    if (!provider) {
        res.json("no providers found");
        return;
    }

    console.log("provider",provider);
    console.log(provider._id,new mongoose.Types.ObjectId(serviceReqId));

    // Check if this job was actually sent to this provider
    const isJob = await JobNotification.find({
        serviceRequestId: new mongoose.Types.ObjectId(serviceReqId),
        providerId: provider._id
    });

    console.log("job",isJob);

    if (isJob.length <= 0) {
        res.json("cannot find this job");
        return;
    }

    // Atomic lock: assign job only if still pending
    const updateResult = await ServiceRequest.updateOne(
        { _id: serviceReqId, status: "pending" },
        { $set: { status: "assigned" } }
    );

    if (updateResult.modifiedCount === 0) {
        res.json("Job already taken");
        return;
    }

    // Create acceptance record (winner only)
    const jobAcceptance = new JobAcceptance({
        requestId: serviceReqId,
        providerId: provider._id,
        source
    });

    await jobAcceptance.save();

    // Fetch service request to send customer details
    const serviceReq = await ServiceRequest.findById(serviceReqId);

    res.json({
        message: "Job accepted",
        customerDetails: {
            name: serviceReq.customerName,
            phoneNumber: serviceReq.customerPhone
        }
    });
});


// =====================================================
// SERVER & DB STARTUP
// =====================================================

connectDB()
    .then(() => {
        console.log("connection established");
        app.listen(7777, () => {
            console.log("server running on port 7777");
        });
    })
    .catch(() => {
        console.error("error occurred");
    });

