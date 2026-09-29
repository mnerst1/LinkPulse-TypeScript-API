import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { LinkRepository } from "./repository.ts";

const config = loadConfig();
const repository = new LinkRepository(config.databasePath);
const app = createApp(repository, config);

const server = app.listen(config.port, () => {
  console.log(`LinkPulse is running at ${config.baseUrl}`);
  console.log(`Health check: ${config.baseUrl}/health`);
});

function shutdown(signal: string): void {
  console.log(`\n${signal} received. Closing LinkPulse...`);
  server.close(() => {
    repository.close();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
