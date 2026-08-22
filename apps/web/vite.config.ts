import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const resolvePackageFile = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // beta.8 advertises development source entries that are not included in the published package.
    alias: [
      {
        find: /^@\//,
        replacement: resolvePackageFile("./src/"),
      },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4310",
        changeOrigin: false,
      },
    },
  },
});
