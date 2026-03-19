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