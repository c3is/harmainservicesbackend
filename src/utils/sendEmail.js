const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
  try {
    console.log("📨 sendEmail called");
    console.log("➡️ To:", to);
    console.log("➡️ Subject:", subject);

    const transporter = nodemailer.createTransport({
      host: "smtp.harmain.in",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 🔥 Verify connection (VERY IMPORTANT)
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    const mailOptions = {
      from: `"Harmain Services" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully");
    console.log("📩 Message ID:", info.messageId);
    console.log("📬 Response:", info.response);

    return info; // 🔥 IMPORTANT (so API can log it)

  } catch (error) {
    console.error("❌ Email error FULL:", error);

    // Show deeper info if available
    if (error.response) {
      console.error("📨 SMTP response:", error.response);
    }

    if (error.code) {
      console.error("⚠️ Error code:", error.code);
    }

    throw error; // 🔥 IMPORTANT (so API catches it)
  }
};

module.exports = { sendEmail };