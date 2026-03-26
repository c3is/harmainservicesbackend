const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
  try {
    if (!to) throw new Error("Recipient email missing");
    if (!subject) throw new Error("Email subject missing");
    if (!html) throw new Error("Email body missing");

    if (process.env.NODE_ENV !== "production") {
      console.log("📨 sendEmail called");
      console.log("➡️ To:", to);
      console.log("➡️ Subject:", subject);
    }

    const response = await resend.emails.send({
      from: "Harmain <no-reply@harmai.in>",
      to,
      subject,
      html,
      reply_to: "support@harmai.in",
    });

    if (!response || response.error) {
      throw new Error(response?.error?.message || "Unknown email error");
    }

    return response;

  } catch (error) {
    const errMsg = error?.message || error;

    console.error("❌ Email send failed:", errMsg);

    throw error; // keep throwing (your flow depends on this)
  }
};

module.exports = { sendEmail };