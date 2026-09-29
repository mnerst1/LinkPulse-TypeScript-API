import path from "node:path";

export type AppConfig = {
  port: number;
  baseUrl: string;
  adminKey: string;
  databasePath: string;
};

function readPort(value: string | undefined): number {
  const port = Number(value ?? 3000);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : 3000;
}

export function loadConfig(): AppConfig {
  const port = readPort(process.env.PORT);

  return {
    port,
    baseUrl: (process.env.BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, ""),
    adminKey: process.env.ADMIN_KEY ?? "dev-change-me",
    databasePath: process.env.DATABASE_PATH
      ? path.resolve(process.env.DATABASE_PATH)
      : path.resolve("data/linkpulse.db")
  };
}
