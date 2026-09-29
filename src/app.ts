import { timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type ErrorRequestHandler, type Express } from "express";
import type { AppConfig } from "./config.ts";
import { createRateLimiter } from "./rateLimit.ts";
import { LinkRepository } from "./repository.ts";
import { generateCode, validateCreateInput, ValidationError } from "./validators.ts";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(currentDirectory, "../public");

function secureEqual(first: string, second: string): boolean {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function serializeLink(link: ReturnType<LinkRepository["create"]>, baseUrl: string) {
  return {
    code: link.code,
    shortUrl: `${baseUrl}/${link.code}`,
    targetUrl: link.target_url,
    clicks: link.clicks,
    active: Boolean(link.active),
    createdAt: link.created_at,
    expiresAt: link.expires_at
  };
}

export function createApp(repository: LinkRepository, config: AppConfig): Express {
  const app = express();
  const createLimiter = createRateLimiter(30, 60_000);

  app.disable("x-powered-by");
  app.use((request, response, next) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.use(express.static(publicDirectory));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "LinkPulse", time: new Date().toISOString() });
  });

  app.get("/api/links", (request, response) => {
    const requestedLimit = Number(request.query.limit ?? 20);
    const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 20;
    response.json({ data: repository.list(limit).map((link) => serializeLink(link, config.baseUrl)) });
  });

  app.post("/api/links", createLimiter, (request, response, next) => {
    try {
      const input = validateCreateInput(request.body);
      let code = input.customCode ?? generateCode();

      if (input.customCode && repository.codeExists(code)) {
        return response.status(409).json({ error: "customCode is already in use" });
      }

      // Для случайного кода крайне маловероятная коллизия решается повторной генерацией.
      for (let attempt = 0; !input.customCode && repository.codeExists(code) && attempt < 5; attempt += 1) {
        code = generateCode();
      }

      if (repository.codeExists(code)) return response.status(503).json({ error: "Could not generate a unique code" });

      const link = repository.create({ code, targetUrl: input.targetUrl, expiresAt: input.expiresAt });
      return response.status(201).json({ data: serializeLink(link, config.baseUrl) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/links/:code", (request, response) => {
    const link = repository.findByCode(request.params.code);
    if (!link) return response.status(404).json({ error: "Link not found" });
    return response.json({ data: serializeLink(link, config.baseUrl) });
  });

  app.get("/api/links/:code/stats", (request, response) => {
    const link = repository.findByCode(request.params.code);
    if (!link) return response.status(404).json({ error: "Link not found" });
    return response.json({
      data: {
        link: serializeLink(link, config.baseUrl),
        dailyClicks: repository.dailyStats(link.id)
      }
    });
  });

  app.delete("/api/links/:code", (request, response) => {
    const providedKey = request.header("x-admin-key") ?? "";
    if (!secureEqual(providedKey, config.adminKey)) {
      return response.status(401).json({ error: "Invalid admin key" });
    }
    if (!repository.remove(request.params.code)) {
      return response.status(404).json({ error: "Link not found" });
    }
    return response.status(204).send();
  });

  // Этот маршрут должен быть последним: он воспринимает один сегмент URL как short code.
  app.get("/:code", (request, response) => {
    const link = repository.findByCode(request.params.code);
    if (!link || !link.active) return response.status(404).sendFile(path.join(publicDirectory, "404.html"));

    if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
      return response.status(410).json({ error: "This short link has expired" });
    }

    repository.recordVisit(
      link.id,
      request.get("referer")?.slice(0, 500) ?? null,
      request.get("user-agent")?.slice(0, 500) ?? null
    );
    return response.redirect(302, link.target_url);
  });

  app.use((_request, response) => response.status(404).json({ error: "Route not found" }));

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ValidationError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error(error);
    response.status(500).json({ error: "Internal server error" });
  };
  app.use(errorHandler);

  return app;
}
