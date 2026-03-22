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
  const { provider = "gemini", maxTokens, stopSequences = [], format, temperature } = settings;

  const generationConfig = {};
  if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
  if (stopSequences.length) generationConfig.stopSequences = stopSequences;
  if (format === "json") generationConfig.responseMimeType = "application/json";
  if (temperature !== undefined) generationConfig.temperature = temperature;

  if (provider === "deepseek") {
    const messages = [];
    if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
    messages.push({ role: "user", content: message });

    const completion = await deepseek.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      ...(stopSequences.length ? { stop: stopSequences } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
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

    const { format = "plain", maxTokens, stopSequences = [], provider = "gemini", systemPrompt, temperature } = settings;
    console.log(`[/api/chat] provider=${provider} temperature=${temperature}`);

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
        ...(temperature !== undefined ? { temperature } : {}),
      });
      reply = completion.choices[0].message.content;
    } else {
      const generationConfig = {};
      if (maxTokens) generationConfig.maxOutputTokens = maxTokens;
      if (stopSequences.length) generationConfig.stopSequences = stopSequences;
      if (format === "json") generationConfig.responseMimeType = "application/json";
      if (temperature !== undefined) generationConfig.temperature = temperature;

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

const BENCHMARK_MODELS = [
  { id: "deepseek-chat",     tier: "weak",   label: "DeepSeek V3",    provider: "deepseek" },
  { id: "gemini-2.5-flash-lite", tier: "medium", label: "Gemini 2.5 Flash Lite", provider: "gemini" },
  { id: "deepseek-reasoner", tier: "strong", label: "DeepSeek R1",    provider: "deepseek" },
];

const BENCHMARK_PRICING = {
  "deepseek-chat":         { input: 0.27, output: 1.10 },
  "deepseek-reasoner":     { input: 0.14, output: 2.19 },
  "gemini-2.5-flash-lite": { input: 0.10, output: 0.40 },
};

function parseThinking(text) {
  const match = text.match(/^<think>([\s\S]*?)<\/think>\s*/);
  if (match) return { thinking: match[1].trim(), answer: text.slice(match[0].length).trim() };
  return { thinking: null, answer: text };
}

async function runBenchmarkModel(task, model, settings) {
  const systemInstruction = buildSystemInstruction(null, settings, null);
  const start = Date.now();
  try {
    let rawText, inputTokens, outputTokens;

    if (model.provider === "gemini") {
      const generationConfig = {};
      const geminiModel = genAI.getGenerativeModel({
        model: model.id,
        systemInstruction,
        generationConfig,
      });
      const result = await geminiModel.startChat({ history: [] }).sendMessage(task);
      rawText = result.response.text();
      const usage = result.response.usageMetadata || {};
      inputTokens = usage.promptTokenCount || 0;
      outputTokens = usage.candidatesTokenCount || 0;
    } else {
      const messages = [];
      if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
      messages.push({ role: "user", content: task });
      const completion = await deepseek.chat.completions.create({ model: model.id, messages });
      rawText = completion.choices[0].message.content;
      const usage = completion.usage || {};
      inputTokens = usage.prompt_tokens || 0;
      outputTokens = usage.completion_tokens || 0;
    }

    const timeMs = Date.now() - start;
    const { thinking, answer } = parseThinking(rawText);
    const pricing = BENCHMARK_PRICING[model.id] || { input: 0, output: 0 };
    const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
    return {
      model: model.id, tier: model.tier, label: model.label,
      answer, thinking,
      metrics: { timeMs, totalTokens: inputTokens + outputTokens, cost },
    };
  } catch (err) {
    return {
      model: model.id, tier: model.tier, label: model.label,
      error: err.message || "Request failed",
      metrics: { timeMs: Date.now() - start, totalTokens: 0, cost: 0 },
    };
  }
}

app.post("/api/benchmark", async (req, res) => {
  try {
    const { task, settings = {} } = req.body;
    if (!task || typeof task !== "string" || task.trim() === "") {
      return res.status(400).json({ error: "task is required and must be a non-empty string" });
    }

    const modelRuns = await Promise.all(
      BENCHMARK_MODELS.map((m) => runBenchmarkModel(task.trim(), m, settings))
    );

    const successful = modelRuns.filter((r) => !r.error);
    let verdict = null;

    if (successful.length > 0) {
      const speedWinner = successful.reduce((a, b) => a.metrics.timeMs < b.metrics.timeMs ? a : b);
      const costWinner  = successful.reduce((a, b) => a.metrics.cost  < b.metrics.cost  ? a : b);

      try {
        const answersText = modelRuns
          .map((r) => r.error
            ? `### ${r.label} (${r.tier.toUpperCase()})\nERROR: ${r.error}`
            : `### ${r.label} (${r.tier.toUpperCase()})\n${r.answer}`)
          .join("\n\n");

        const judgePrompt =
          `Task: "${task.trim()}"\n\n` +
          `${answersText}\n\n` +
          `Score each successful model's answer 1-10 for quality (accuracy, completeness, helpfulness). ` +
          `Write the summary field in the same language as the task. ` +
          `Return ONLY valid JSON:\n` +
          `{"scores":{"deepseek-chat":<n>,"gemini-2.5-flash-lite":<n>,"deepseek-reasoner":<n>},` +
          `"quality_winner":"<model-id>","summary":"<2-3 sentence conclusion>"}`;

        const judgeCompletion = await deepseek.chat.completions.create({
          model: "deepseek-reasoner",
          messages: [
            { role: "system", content: "You are an objective LLM evaluator. Respond only with valid JSON, no other text." },
            { role: "user", content: judgePrompt },
          ],
          response_format: { type: "json_object" },
        });

        const { answer: judgeAnswer } = parseThinking(judgeCompletion.choices[0].message.content);
        const judgeData = JSON.parse(judgeAnswer);

        verdict = {
          scores: judgeData.scores || {},
          winners: {
            quality: judgeData.quality_winner || successful[successful.length - 1].model,
            speed: speedWinner.model,
            cost: costWinner.model,
          },
          summary: judgeData.summary || "",
        };
      } catch (judgeErr) {
        console.error("[benchmark judge error]", judgeErr);
        verdict = {
          scores: {},
          winners: { speed: speedWinner.model, cost: costWinner.model },
          summary: "Quality evaluation unavailable.",
        };
      }
    }

    res.json({ results: modelRuns, verdict });
  } catch (err) {
    console.error("[/api/benchmark error]", err);
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
