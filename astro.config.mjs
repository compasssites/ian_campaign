import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { writeFileSync, mkdirSync } from "fs";

// Pre-create _routes.json so the cloudflare adapter's Astro 5/6 incompatibility is bypassed
const routesJsonPlugin = {
  name: "pre-routes-json",
  hooks: {
    "astro:build:setup": ({ target }) => {
      if (target === "server") {
        try {
          mkdirSync("dist", { recursive: true });
          writeFileSync("dist/_routes.json", JSON.stringify({
            version: 1,
            include: ["/*"],
            exclude: [],
          }));
        } catch {}
      }
    },
  },
};

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    platformProxy: { enabled: false },
    imageService: "passthrough",
  }),
  integrations: [react(), routesJsonPlugin],
  vite: {
    plugins: [tailwindcss()],
  },
});
