require("dotenv").config();
const mongoose = require("mongoose");

const { sendEidMessage } = require("./utils/sendEidMessage");
const Provider = require("./models/Provider");

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB connected");

    const providers = await Provider.find({ isActive: true });

    console.log(`Found ${providers.length} providers`);

    for (const provider of providers) {
      if (!provider.phoneNumber) continue;

      await sendEidMessage(provider.phoneNumber, provider.name);

      await delay(300); // safer delay
    }

    console.log("🎉 All messages sent");
    process.exit();

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();