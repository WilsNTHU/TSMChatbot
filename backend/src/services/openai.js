const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export async function chatWithOpenAI({ system, messages, maxTokens = 512 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-nano";

  const openaiMessages = [
    { role: "system", content: system },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content
    }))
  ];

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: openaiMessages,
      max_tokens: maxTokens
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data?.error?.message || response.statusText;
    throw new Error(`OpenAI API error: ${detail}`);
  }

  const reply = data.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("Empty response from OpenAI API");
  }

  return {
    reply,
    model: data.model,
    usage: data.usage
  };
}
