import { Router, type IRouter } from "express";
import { fireWebhook, getWebhookSubscribers } from "../lib/webhook";

const router: IRouter = Router();

// GET /webhook/config - show current webhook subscribers
router.get("/webhook/config", async (req, res): Promise<void> => {
  const subscribers = getWebhookSubscribers().map((subscriber) => ({
    name: subscriber.name,
    url: subscriber.url,
    hasSecret: !!subscriber.secret,
  }));
  res.json({
    subscribers,
    status: subscribers.length > 0 ? "configured" : "not-configured",
  });
});

// POST /webhook/test - send a test ping to portaltreasurekc.org
router.post("/webhook/test", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  try {
    const results = await fireWebhook({
      event: "new_llcs",
      timestamp: new Date().toISOString(),
      state: "ALL",
      date: today,
      count: 1,
      llcs: [
        {
          id: 0,
          name: "Test Business LLC",
          state: "KS",
          city: "Kansas City",
          filingDate: today,
          agentName: "Test Agent",
          agentAddress: "123 Main St, Kansas City, KS 66101",
          status: "Active",
        },
      ],
    });
    res.json({
      success: results.every((result) => result.status === "delivered"),
      message: "Test webhook fired to all configured subscribers",
      results,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Webhook test failed", error: String(err) });
  }
});

export default router;
