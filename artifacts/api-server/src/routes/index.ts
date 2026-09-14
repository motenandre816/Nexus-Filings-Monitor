import { Router, type IRouter } from "express";
import healthRouter from "./health";
import llcsRouter from "./llcs";
import dashboardRouter from "./dashboard";
import outreachRouter from "./outreach";
import webhookRouter from "./webhook";
import workerRouter from "./worker";

const router: IRouter = Router();

router.use(healthRouter);
router.use(llcsRouter);
router.use(dashboardRouter);
router.use(outreachRouter);
router.use(webhookRouter);
router.use(workerRouter);

export default router;
