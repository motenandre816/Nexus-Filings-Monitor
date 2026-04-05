import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, llcFilingsTable } from "@workspace/db";
import { GenerateOutreachParams, GenerateOutreachBody, GenerateOutreachResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const GROK_API_URL = "https://api.x.ai/v1/responses";
const GROK_MODEL = "grok-4-0709";

async function callGrok(prompt: string): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    throw new Error("GROK_API_KEY is not set");
  }

  const response = await fetch(GROK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      input: prompt,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error({ status: response.status, body: errText }, "Grok API error");
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = await response.json() as {
    output?: Array<{ type: string; content?: Array<{ type: string; text: string }> }>;
    choices?: Array<{ message: { content: string } }>;
  };

  // Handle the /v1/responses format
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.content && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === "output_text" || c.type === "text") return c.text;
        }
      }
    }
  }

  // Fallback: OpenAI chat completions format
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  throw new Error("Unexpected Grok response format");
}

// POST /llcs/:id/outreach
router.post("/llcs/:id/outreach", requireAuth, async (req, res): Promise<void> => {
  const params = GenerateOutreachParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = GenerateOutreachBody.safeParse(req.body ?? {});
  const tone = body.success ? (body.data.tone ?? "friendly") : "friendly";

  const [llc] = await db
    .select()
    .from(llcFilingsTable)
    .where(eq(llcFilingsTable.id, params.data.id));

  if (!llc) {
    res.status(404).json({ error: "LLC not found" });
    return;
  }

  const city = llc.city ?? "Kansas City area";
  const stateLabel = llc.state === "KS" ? "Kansas" : "Missouri";

  const prompt = `You are a friendly recruiter for Treasure KC Nexus, a local rewards and loyalty program for businesses in the Kansas City metro area (Kansas and Missouri). 

Write a short, personalized outreach message to invite "${llc.name}" — a newly filed LLC in ${city}, ${stateLabel} — to join Treasure KC Nexus.

The program gives customers TKC rewards tokens for checking in at local businesses. Customers can save up to $99 off their purchases. Joining is completely free for businesses.

Tone: ${tone}

Requirements:
- Keep it under 100 words
- Be specific to the business name and city
- Mention the free TKC token rewards for their customers
- End with a clear, friendly call-to-action
- Do NOT use generic greetings like "Dear Sir/Madam"
- Sound like a real person, not a bot

Write only the message, no subject line or extra commentary.`;

  req.log.info({ llcId: llc.id, llcName: llc.name }, "Generating Grok outreach message");

  const message = await callGrok(prompt);

  res.json(GenerateOutreachResponse.parse({
    llcId: llc.id,
    llcName: llc.name,
    message,
    tone,
  }));
});

export default router;
