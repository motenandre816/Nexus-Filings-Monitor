import { Router, type IRouter } from "express";
import { fireWebhook } from "../lib/webhook";

const router: IRouter = Router();

// GET /webhook/config - show current webhook configuration
router.get("/webhook/config", async (req, res): Promise<void> => {
  const baseUrl = process.env.PORTAL_WEBHOOK_URL || "https://portaltreasurekc.org";
  const webhookPath = process.env.PORTAL_WEBHOOK_PATH || "/webhook/llcs";
  res.json({
    webhookUrl: baseUrl.replace(/\/$/, "") + webhookPath,
    hasSecret: !!process.env.PORTAL_WEBHOOK_SECRET,
    status: "configured",
  });
});

// POST /webhook/test - send a test ping to portaltreasurekc.org
router.post("/webhook/test", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  try {
    await fireWebhook({
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
    res.json({ success: true, message: "Test webhook fired to portaltreasurekc.org" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Webhook test failed", error: String(err) });
  }
});

export default router;
