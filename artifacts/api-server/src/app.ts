import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Clerk proxy must come before body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/api", router);

export default app;

// Production static hosting: when SERVE_STATIC_DIR is set (Docker/Render),
// serve the built SPA from the same origin so /api and the Clerk proxy stay
// same-origin without a separate frontend host.
const staticDir = process.env.SERVE_STATIC_DIR;
if (staticDir) {
  if (!fs.existsSync(staticDir)) {
    logger.warn({ staticDir }, "SERVE_STATIC_DIR does not exist; skipping static serving");
  } else {
    app.use(express.static(staticDir));
    // SPA fallback: any non-/api GET that reaches us is a client-side route.
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/")) {
        next();
        return;
      }
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }
}
