import { NextResponse } from "next/server";
import { z } from "zod";
import {
  summarizeConversationHistory,
  summarizeLargeText,
} from "@/features/summarization/summarizer";

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool", "function"]),
  content: z.string(),
});

const SummarizeSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("conversation"),
    messages: z.array(MessageSchema).min(1),
  }),
  z.object({
    mode: z.literal("text"),
    text: z.string().min(1),
  }),
]);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = SummarizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const summary =
      parsed.data.mode === "conversation"
        ? await summarizeConversationHistory(parsed.data.messages)
        : await summarizeLargeText(parsed.data.text);

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Summarization error:", err);
    return NextResponse.json(
      { error: "Summarization failed." },
      { status: 500 }
    );
  }
}

