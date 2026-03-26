const axios = require("axios");

function formatDestination(phone) {
  if (!phone) throw new Error("Destination phone missing");

  const cleaned = String(phone).replace(/\D/g, "").slice(-10);

  if (cleaned.length !== 10) {
    throw new Error("Invalid phone number format");
  }

  return "91" + cleaned;
}

async function sendWhatsAppTemplate(destination, templateId, params, retry = 1) {
  try {
    if (!templateId) {
      throw new Error("Template ID missing");
    }

    if (!Array.isArray(params)) {
      throw new Error("Template params must be array");
    }

    const safeParams = params.map((p) =>
      p !== undefined && p !== null && String(p).trim() !== ""
        ? String(p)
        : "N/A"
    );

    const formattedDestination = formatDestination(destination);

    console.log("📤 WhatsApp Template Send");
    console.log("➡️ To:", formattedDestination);
    console.log("➡️ Template:", templateId);
    console.log("➡️ Params:", safeParams);

    const response = await axios.post(
      "https://api.gupshup.io/wa/api/v1/template/msg",
      new URLSearchParams({
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE_NUMBER,
        destination: formattedDestination,
        "src.name": process.env.GUPSHUP_APP_NAME,
        template: JSON.stringify({
          id: templateId,
          params: safeParams,
        }),
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_API_KEY,
        },
        timeout: 10000,
      }
    );

    console.log("📦 Gupshup Response:", response.data);

    const isSuccess = response?.data?.status === "submitted";

    if (!isSuccess && retry > 0) {
      console.log("🔁 Retrying WhatsApp send...");
      return await sendWhatsAppTemplate(destination, templateId, params, retry - 1);
    }

    return {
      success: isSuccess,
      data: response.data,
    };

  } catch (error) {
    const errMsg = error?.response?.data || error.message;

    console.error("❌ WhatsApp Template Send Error:", errMsg);

    if (retry > 0) {
      console.log("🔁 Retrying due to error...");
      return await sendWhatsAppTemplate(destination, templateId, params, retry - 1);
    }

    return {
      success: false,
      error: errMsg,
    };
  }
}

module.exports = { sendWhatsAppTemplate };