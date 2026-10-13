/** Reference info for each Assistant "brain" (original MODEL_INFO). */
export interface ModelInfo {
  name: string;
  tag: string;
  params: string;
  size: string;
  context: string;
  pros: string[];
  cons: string[];
}
export type BackendId = "local-tiny" | "local-small" | "local-big" | "local-memory" | "home" | "gemini";

export const MODEL_INFO: Record<BackendId, ModelInfo> = {
  "local-tiny": {
    name: "SmolLM2 360M", tag: "Runs on this device — WebGPU", params: "360 million", size: "~300 MB", context: "8,192 tokens",
    pros: ["Loads in seconds on almost any device", "Lowest memory use of the local options", "Good for quick, simple questions"],
    cons: ["Forgets earlier parts of a conversation fast", "Struggles with multi-step reasoning or math", "Answers can wander off-topic"],
  },
  "local-small": {
    name: "Llama 3.2 1B", tag: "Runs on this device — WebGPU", params: "1 billion", size: "~900 MB", context: "~4,096 tokens in this build",
    pros: ["Clearly more coherent than tiny", "Still light enough for most laptops/Chromebooks", "Good balance of speed vs quality"],
    cons: ["Slower to load than tiny", "Can still struggle with longer, complex tasks", "Needs more free GPU memory than tiny"],
  },
  "local-big": {
    name: "Llama 3.2 3B", tag: "Runs on this device — WebGPU", params: "3 billion", size: "~1.9 GB", context: "~4,096 tokens in this build",
    pros: ["Best reasoning quality of the local options", "Handles longer instructions better"],
    cons: ['Needs real GPU memory headroom — fails with "out of memory" on many Chromebooks/integrated GPUs', "Slowest to load and to reply", "Biggest one-time download"],
  },
  "local-memory": {
    name: "Workbench Local Memory", tag: "Browser-only memory layer — no model download", params: "Local storage", size: "Tiny", context: "Memory retrieval only",
    pros: ["Keeps project memory on this device", "No API key, server, or WiFi required", "Useful for reviewing saved rules and project context"],
    cons: ["Not a language model", "Does not generate normal AI answers by itself"],
  },
  home: {
    name: "Your Zephyrus (Ollama)", tag: "Runs on your own computer", params: "Whatever model you run in Ollama", size: "Already on your Zephyrus", context: "Set by the model you chose in Ollama",
    pros: ["As strong as whatever model you run at home", "No per-message cost", "Nothing leaves your own network/tunnel"],
    cons: ["Needs the Zephyrus on and reachable", "Needs a working tunnel/address to reach it from elsewhere"],
  },
  gemini: {
    name: "Google Gemini", tag: "Cloud — needs wifi every message", params: "Not published by Google", size: "No download", context: "Very large (model-dependent)",
    pros: ["No download, works the instant you paste a key", "No local hardware limits", "Generally the strongest answers of any option here"],
    cons: ["Needs wifi for every single message", "Your messages go to Google over the internet", "Free tier has usage limits"],
  },
};

export const DEFAULT_TOK_PER_SEC: Record<BackendId, number> = { "local-tiny": 35, "local-small": 18, "local-big": 9, "local-memory": 0, home: 25, gemini: 40 };

export const parseContextLimit = (s?: string): number | null => {
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/(\d{3,7})/);
  return m ? parseInt(m[1]!, 10) : null;
};
export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  const t = text.trim();
  return t ? Math.max(1, Math.ceil(t.length / 4)) : 0;
};
