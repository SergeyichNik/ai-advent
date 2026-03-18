require("dotenv").config();
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

const app = express();
app.use(express.json());

const FORMAT_INSTRUCTIONS = {
  markdown: "Format your response using Markdown (headers, lists, code blocks where appropriate).",
  json: "Respond with valid JSON only. No prose outside the JSON structure.",
  bullet: "Format your response as bullet points.",
  concise: "Be as concise as possible. No fluff or filler text.",
};

function toOpenAIHistory(geminiHistory) {
  return geminiHistory.map((msg) => ({
    role: msg.role === "model" ? "assistant" : "user",
    content: msg.parts[0].text,
  }));
}

async function callLLM(message, systemInstruction, settings = {}) {
  const { provider = "gemini", maxTokens, stopSequences = [], format } = settings;

  const generationConfig = {};
  if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
  if (stopSequences.length) generationConfig.stopSequences = stopSequences;
  if (format === "json") generationConfig.responseMimeType = "application/json";

  if (provider === "deepseek") {
    const messages = [];
    if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
    messages.push({ role: "user", content: message });

    const completion = await deepseek.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      ...(stopSequences.length ? { stop: stopSequences } : {}),
    });
    return completion.choices[0].message.content;
  }

  // Gemini
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
    systemInstruction,
    generationConfig,
  });
  const chat = model.startChat({ history: [] });
  const result = await chat.sendMessage(message);
  return result.response.text();
}

function buildSystemInstruction(strategyInstruction, settings, formatInstruction) {
  const parts = [];
  if (process.env.SYSTEM_PROMPT) parts.push(process.env.SYSTEM_PROMPT);
  if (settings.systemPrompt)     parts.push(settings.systemPrompt);
  if (strategyInstruction)       parts.push(strategyInstruction);
  if (formatInstruction)         parts.push(formatInstruction);
  return parts.join("\n\n") || undefined;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], settings = {} } = req.body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "message is required and must be a non-empty string" });
    }

    const { format = "plain", maxTokens, stopSequences = [], provider = "gemini", systemPrompt } = settings;

    const formatInstruction = FORMAT_INSTRUCTIONS[format];
    const systemInstruction = buildSystemInstruction(null, { systemPrompt }, formatInstruction);

    let reply;

    if (provider === "deepseek") {
      const dsMessages = [];
      if (systemInstruction) dsMessages.push({ role: "system", content: systemInstruction });
      dsMessages.push(...toOpenAIHistory(history));
      dsMessages.push({ role: "user", content: message });

      const generationConfig = {};
      if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
      if (stopSequences.length) generationConfig.stopSequences = stopSequences;
      if (format === "json") generationConfig.responseMimeType = "application/json";

      const completion = await deepseek.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: dsMessages,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        ...(stopSequences.length ? { stop: stopSequences } : {}),
      });
      reply = completion.choices[0].message.content;
    } else {
      const generationConfig = {};
      if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
      if (stopSequences.length) generationConfig.stopSequences = stopSequences;
      if (format === "json") generationConfig.responseMimeType = "application/json";

      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
        systemInstruction,
        generationConfig,
      });

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(message);
      reply = result.response.text();
    }

    res.json({ reply });
  } catch (err) {
    console.error("[/api/chat error]", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

app.post("/api/compare", async (req, res) => {
  try {
    const { task, settings = {} } = req.body;

    if (!task || typeof task !== "string" || task.trim() === "") {
      return res.status(400).json({ error: "task is required and must be a non-empty string" });
    }

    async function runDirect() {
      const systemInstruction = buildSystemInstruction(null, settings, null);
      const reply = await callLLM(task, systemInstruction, settings);
      return { strategy: "Direct", prompt: task, reply };
    }

    async function runStepByStep() {
      const strategyInstruction = "Think step by step and show your reasoning before giving the final answer.";
      const systemInstruction = buildSystemInstruction(strategyInstruction, settings, null);
      const reply = await callLLM(task, systemInstruction, settings);
      return { strategy: "Step-by-step", prompt: task, reply };
    }

    async function runMetaPrompt() {
      const systemInstruction = buildSystemInstruction(null, settings, null);
      const generatedPrompt = await callLLM(
        "Write an optimal prompt to solve this task: " + task,
        systemInstruction,
        settings
      );
      const reply = await callLLM(generatedPrompt.trim(), systemInstruction, settings);
      return { strategy: "Meta-prompt", prompt: task, generatedPrompt: generatedPrompt.trim(), reply };
    }

    async function runExpertPanel() {
      const strategyInstruction =
        "You are a panel of 3 experts: an Analyst, an Engineer, and a Critic. For the given task, provide each expert's perspective and solution, then summarize the best approach.";
      const systemInstruction = buildSystemInstruction(strategyInstruction, settings, null);
      const reply = await callLLM(task, systemInstruction, settings);
      return { strategy: "Expert panel", prompt: task, reply };
    }

    const results = await Promise.all([runDirect(), runStepByStep(), runMetaPrompt(), runExpertPanel()]);
    res.json({ results });
  } catch (err) {
    console.error("[/api/compare error]", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

if (process.env.NODE_ENV === "production") {
  const path = require("path");
  const distPath = path.join(__dirname, "../client/dist");
  app.use(express.static(distPath));
  app.get("*", (_, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
