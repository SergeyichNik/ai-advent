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

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], settings = {} } = req.body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "message is required and must be a non-empty string" });
    }

    const { format = "plain", maxTokens, stopSequences = [], provider = "gemini" } = settings;

    const generationConfig = {};
    if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
    if (stopSequences.length) generationConfig.stopSequences = stopSequences;
    if (format === "json") generationConfig.responseMimeType = "application/json";

    const formatInstruction = FORMAT_INSTRUCTIONS[format];
    const baseSystemPrompt = process.env.SYSTEM_PROMPT || "";
    const systemInstruction = formatInstruction
      ? [baseSystemPrompt, formatInstruction].filter(Boolean).join("\n\n")
      : baseSystemPrompt || undefined;

    let reply;

    if (provider === "deepseek") {
      const dsMessages = [];
      if (systemInstruction) dsMessages.push({ role: "system", content: systemInstruction });
      dsMessages.push(...toOpenAIHistory(history));
      dsMessages.push({ role: "user", content: message });

      const completion = await deepseek.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: dsMessages,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        ...(stopSequences.length ? { stop: stopSequences } : {}),
      });
      reply = completion.choices[0].message.content;
    } else {
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
