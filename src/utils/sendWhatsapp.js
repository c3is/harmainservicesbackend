const axios = require("axios");

function formatDestination(phone) {
  if (!phone) throw new Error("Destination phone missing");

  phone = phone.replace(/\D/g, "").slice(-10);

  if (phone.length !== 10) {
    throw new Error("Invalid phone number format");
  }

  return "91" + phone;
}

async function sendWhatsAppTemplate(destination, templateId, params) {
  try {

    if (!Array.isArray(params)) {
      throw new Error("Template params must be array");
    }

    const formattedDestination = formatDestination(destination);

    console.log("📤 Sending WhatsApp template...");
    console.log("➡️ Destination:", formattedDestination);
    console.log("➡️ Template ID:", templateId);
    console.log("➡️ Params:", params);

    const response = await axios.post(
      "https://api.gupshup.io/wa/api/v1/template/msg",
      new URLSearchParams({
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE_NUMBER,
        destination: formattedDestination,
        "src.name": process.env.GUPSHUP_APP_NAME,
        template: JSON.stringify({
          id: templateId,
          params
        })
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: process.env.GUPSHUP_API_KEY
        }
      }
    );

    console.log("✅ Gupshup response:", response.data);

    return response.data;

  } catch (error) {

    console.error("❌ Template send error:");

    if (error?.response?.data) {
      console.error("📌 Gupshup Error:", error.response.data);
    } else {
      console.error(error.message);
    }

    return null;
  }
}

module.exports = { sendWhatsAppTemplate };
