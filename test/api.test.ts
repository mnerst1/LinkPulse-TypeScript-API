import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createApp } from "../src/app.ts";
import type { AppConfig } from "../src/config.ts";
import { LinkRepository } from "../src/repository.ts";

test("creates, resolves, measures and deletes a short link", async () => {
  const repository = new LinkRepository(":memory:");
  const config: AppConfig = {
    port: 0,
    baseUrl: "http://localhost",
    adminKey: "test-secret",
    databasePath: ":memory:"
  };
  const server = createApp(repository, config).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    const createResponse = await fetch(`${base}/api/links`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/article", customCode: "article-1" })
    });
    assert.equal(createResponse.status, 201);

    const created = await createResponse.json() as { data: { code: string } };
    assert.equal(created.data.code, "article-1");

    const redirectResponse = await fetch(`${base}/article-1`, { redirect: "manual" });
    assert.equal(redirectResponse.status, 302);
    assert.equal(redirectResponse.headers.get("location"), "https://example.com/article");

    const statsResponse = await fetch(`${base}/api/links/article-1/stats`);
    const stats = await statsResponse.json() as { data: { link: { clicks: number } } };
    assert.equal(stats.data.link.clicks, 1);

    const unauthorized = await fetch(`${base}/api/links/article-1`, { method: "DELETE" });
    assert.equal(unauthorized.status, 401);

    const deleted = await fetch(`${base}/api/links/article-1`, {
      method: "DELETE",
      headers: { "x-admin-key": "test-secret" }
    });
    assert.equal(deleted.status, 204);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    repository.close();
  }
});
