import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";

dotenv.config();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Please provide a user email. Example: node make-admin.js user@paruluniversity.ac.in");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });

  if (!user) {
    console.error(`Error: User with email "${cleanEmail}" not found.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.role = "admin";
  await user.save();

  console.log(`Success! User "${user.fullName}" (${cleanEmail}) has been promoted to admin.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
