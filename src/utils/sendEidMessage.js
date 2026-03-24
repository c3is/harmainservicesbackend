require("dotenv").config();
const axios = require("axios");

function formatNumber(phone) {
  return "91" + phone.replace(/\D/g, "").slice(-10);
}

async function sendEidMessage(phone, name) {
  try {
    const destination = formatNumber(phone);

    const response = await axios.post(
      "https://api.gupshup.io/wa/api/v1/template/msg",
      new URLSearchParams({
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE_NUMBER,
        destination: destination,
        "src.name": process.env.GUPSHUP_APP_NAME,
        template: JSON.stringify({
          id: process.env.GUPSHUP_EID_TEMPLATE_ID,
          params: [name]
        })
      }),
      {
        headers: {
          apikey: process.env.GUPSHUP_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    console.log(`✅ Sent to ${name}:`, response.data);

  } catch (error) {
    console.error(`❌ Failed for ${name}:`, error.response?.data || error.message);
  }
}

module.exports = { sendEidMessage };