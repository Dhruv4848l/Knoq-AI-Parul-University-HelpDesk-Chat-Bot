import { chatCompletion } from "./services/gemini.js";

async function run() {
  try {
    console.log("Testing chatCompletion...");
    const result = await chatCompletion(
      [{ role: "user", content: "Say hello!" }],
      "You are a helpful assistant."
    );
    console.log("SUCCESS! Result:", result);
  } catch (err) {
    console.error("FAILED! Error details:");
    console.error(err);
  }
}

run();
