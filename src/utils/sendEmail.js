const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
  try {
    console.log("📨 sendEmail called");
    console.log("➡️ To:", to);
    console.log("➡️ Subject:", subject);

    const response = await resend.emails.send({
      from: "Harmain <no-reply@harmain.in>", // ✅ production sender
      to,
      subject,
      html,
      reply_to: "support@harmain.in", // ✅ handle replies properly
    });

    console.log("✅ Email sent successfully");
    console.log("📩 Email ID:", response?.id);

    return response;

  } catch (error) {
    console.error("❌ Email error FULL:", error);
    throw error;
  }
};

module.exports = { sendEmail };