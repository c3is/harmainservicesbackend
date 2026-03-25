import dotenv from "dotenv";
import { sendEmail } from "./utils/sendEmail.js";

dotenv.config();

const runTest = async () => {
  await sendEmail(
    "aqibbashir2015@gmail.com",
    "Test Email from Harmain",
    "<h2>Email working 🚀</h2>"
  );
};

runTest();
// // cancel job
// app.patch("/service-request/:requestId/cancel", async (req, res) => {
//   try {
//     const { requestId } = req.params;

//     const request = await ServiceRequest.findById(requestId);

//     if (!request) {
//       return res.status(404).json({ message: "Service request not found" });
//     }

//     if (request.status === "cancelled") {
//       return res.status(400).json({ message: "Job already cancelled" });
//     }

//     // 🔴 Update request status
//     request.status = "cancelled";
//     await request.save();

//     // 🔴 Cancel active jobs
//     await JobAcceptance.updateMany(
//       { requestId: request._id, status: "active" },
//       { $set: { status: "cancelled" } },
//     );

//     // 🔴 Expire notifications
//     await JobNotification.updateMany(
//       { serviceRequestId: request._id },
//       { status: "expired" },
//     );

//     // 🔴 Clean history (FIXED)
//     const historyData = {
//       requestId: request._id,
//       action: "cancelled_by_admin",
//       actor: "admin",
//     };

//     if (request.assignedProviderId) {
//       historyData.providerId = request.assignedProviderId;
//       historyData.providerName = request.assignedProviderName;
//     }

//     await JobAssignmentHistory.create(historyData);

//     // 🔴 Notify provider (if assigned)
//     if (request.assignedProviderPhone) {
//       await sendWhatsAppText(
//         request.assignedProviderPhone,
//         "⚠️ The assigned job has been cancelled by admin.",
//       );
//     }

//     res.json({
//       message: "Job cancelled successfully",
//     });
//   } catch (err) {
//     console.error("Cancel job error:", err);
//     res.status(500).json({ message: "Failed to cancel job" });
//   }
// });