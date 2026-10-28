import { createApp } from "./app";
import { loadConfig } from "./config/env";

const config = loadConfig();
const app = createApp(config);

if (import.meta.main) {
  app.listen(config.port);
  console.log(`API listening on http://localhost:${config.port}`);
}

export { app };
