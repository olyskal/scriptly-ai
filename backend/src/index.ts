// src/index.ts
import "dotenv/config";
import express from "express";
import morgan from "morgan";

import postRoutes from "@/features/posts/routes";
import userRoutes from "@/features/users/routes";
import { clerkAuth, requireAuth } from "@/libs/authMiddleware";
import { prisma } from "./libs/db";

const app = express();
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  console.log("[health] called");
  res.send("OK");
});

let postsAuthMiddleware: any;
let usersAuthMiddleware: any;

if (process.env.NODE_ENV === "development") {
  console.log("[dev] skipping auth but injecting fake req.auth");
  // 1) injeta req.auth  
  app.use((req: any, _res, next) => {
    req.auth = { userId: "cmalxu8w60001yeefyj2c69x5", sessionId: "dev" };
    next();
  });
  // 2) não faz checagem (pula requireAuth)
  postsAuthMiddleware = (_req: any, _res: any, next: any) => next();
  usersAuthMiddleware = (_req: any, _res: any, next: any) => next();
} else {
  console.log("[prod] applying real Clerk auth");
  app.use(clerkAuth);
  postsAuthMiddleware = requireAuth();
  usersAuthMiddleware = requireAuth();
}

// monta as rotas
app.use("/api/posts", postsAuthMiddleware, postRoutes);
app.use("/api/users", usersAuthMiddleware, userRoutes);

// 404 handler
app.use((req, res) => {
  console.warn("[404]", req.method, req.url);
  res.status(404).send("Not Found");
});

// error handler
app.use((err: any, _req: any, res: any) => {
  console.error("[ERROR]", err);
  res.status(500).json({ error: "Internal Server Error" });
});

if (process.env.NODE_ENV === "development") {
  // Teste rápido: roda a cada 5s
  setInterval(async () => {
    const now = new Date();
    const due = await prisma.schedule.findMany({
      where: { publishAt: { lte: now }, status: "scheduled" },
    });
    for (const job of due) {
      console.log("[WORKER] Publicando:", job.postId);
      await prisma.schedule.update({
        where: { id: job.id },
        data: { status: "sent" },
      });
    }
  }, 5 * 1000);
} else {
  // Em prod, roda a cada minuto
  setInterval(async () => {
    const now = new Date();
    const due = await prisma.schedule.findMany({
      where: { publishAt: { lte: now }, status: "scheduled" },
    });
    for (const job of due) {
      console.log("[WORKER] Publicando:", job.postId);
      await prisma.schedule.update({
        where: { id: job.id },
        data: { status: "sent" },
      });
    }
  }, 60 * 1000);
}

app.listen(3001, () => {
  console.log("Scriptly backend running on http://localhost:3001");
});