import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import notionHandler from "./api/notion";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-notion-api",
      configureServer(server) {
        server.middlewares.use("/api/notion", async (_req, res) => {
          const response = await notionHandler();
          const body = await response.text();
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          res.end(body);
        });
      },
    },
  ],
});
