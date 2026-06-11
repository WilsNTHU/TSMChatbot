import { TSMCHAT_KNOWLEDGE } from "../services/agentContext.js";

export function detectReplyLanguage(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return "English";

  const hasCjk = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(trimmed);
  return hasCjk ? "Traditional Chinese (繁體中文)" : "English";
}

export function buildAgentSystemPrompt(user, context, userMessage) {
  const replyLanguage = detectReplyLanguage(userMessage);

  return `You are the TSMChat assistant for ${user.name}.

You can summarize chats, search across rooms, translate between English and Traditional Chinese (繁體中文), and answer questions about TSMChat.

Reply in ${replyLanguage} unless the user asks for another language. Use only the history and notes below — do not invent messages.

${TSMCHAT_KNOWLEDGE}

--- CHAT HISTORY ---
${context}
--- END ---`;
}
