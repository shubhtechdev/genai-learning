import { readFileSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

function loadJsonl(filepath) {
  return readFileSync(filepath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

async function createTuningJob() {
  const trainingData = loadJsonl("data/training.jsonl");

  const body = {
    baseModel: "models/gemini-2.5-flash-001",
    displayName: "changelog-generator-v1",
    tuningTask: {
      trainingData: {
        examples: {
          examples: trainingData.map((d) => ({
            textInput: d.text_input,
            output: d.output,
          })),
        },
      },
      hyperparameters: {
        epochCount: 5,
        learningRateMultiplier: 1.0,
        batchSize: 4,
      },
    },
  };

  console.log("Creating tuning job via REST...");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/tunedModels?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Tuning API error: ${JSON.stringify(err, null, 2)}`);
  }

  const job = await res.json();
  console.log("Job created:", job.name);
  console.log("State:", job.metadata?.state);

  // Poll for completion
  await pollUntilDone(job.name);
}

async function pollUntilDone(jobName) {
  const completedStates = ["SUCCEEDED", "FAILED", "CANCELLED"];

  while (true) {
    await new Promise((r) => setTimeout(r, 30000));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${jobName}?key=${process.env.GEMINI_API_KEY}`
    );
    const job = await res.json();
    const state = job.metadata?.state ?? job.state;

    console.log(`State: ${state} — ${new Date().toLocaleTimeString()}`);

    if (completedStates.includes(state)) {
      if (state === "SUCCEEDED") {
        // The tuned model name is nested in the response
        const tunedModel = job.metadata?.tunedModel ?? job.tunedModel;
        console.log("\nTuning complete!");
        console.log("Tuned model:", tunedModel);
        console.log("Use this in compare.js as the model name");
      } else {
        console.error("Tuning failed:", state, job.metadata?.error);
      }
      break;
    }
  }
}

createTuningJob().catch(console.error);