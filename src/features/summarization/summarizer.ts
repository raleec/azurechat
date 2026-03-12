import "server-only";
import { OpenAIInstance } from "@/features/common/services/openai";
import { ChatRole } from "@/features/chat-page/chat-services/models";

const CHUNK_SIZE = 8000;

interface Message {
  role: ChatRole;
  content: string;
}

function chunkText(text: string, chunkSize = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

async function callChatCompletion(
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const deployment = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
  if (!deployment) {
    throw new Error(
      "AZURE_OPENAI_API_DEPLOYMENT_NAME environment variable is not set."
    );
  }
  const openai = OpenAIInstance();
  const response = await openai.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_tokens: 500,
    temperature: 0.3,
  });
  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }
  return content;
}

export async function summarizeConversationHistory(
  messages: Message[]
): Promise<string> {
  const conversationText = messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  return callChatCompletion(
    "Summarize the following conversation concisely in 50–100 words. " +
      "Focus on key facts, decisions, and context. " +
      "Do not start with preamble like 'Here is a summary'.",
    conversationText
  );
}

export async function summarizeLargeText(text: string): Promise<string> {
  const chunks = chunkText(text);

  const chunkSummaries = await Promise.all(
    chunks.map((chunk) =>
      callChatCompletion(
        "Summarize the following text concisely, capturing the key points. " +
          "Do not start with preamble like 'Here is a summary'.",
        chunk
      )
    )
  );

  if (chunkSummaries.length === 1) {
    return chunkSummaries[0];
  }

  return callChatCompletion(
    "Produce a concise executive summary from the following partial summaries. " +
      "Do not start with preamble like 'Here is a summary'.",
    chunkSummaries.join("\n\n")
  );
}
