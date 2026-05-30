import { cpSync, mkdirSync, writeFileSync, existsSync } from "fs";

const root = process.cwd();

console.log("🔧 Building Vercel output structure...");

// ── 1. Static assets (.vercel/output/static) ──────────────────────────────
mkdirSync(".vercel/output/static", { recursive: true });
if (existsSync("dist/client")) {
  cpSync("dist/client", ".vercel/output/static", { recursive: true });
  console.log("✅ Static assets copied from dist/client/");
}

// ── 2. Edge function (.vercel/output/functions/index.func) ────────────────
mkdirSync(".vercel/output/functions/index.func", { recursive: true });
if (existsSync("dist/server")) {
  cpSync("dist/server", ".vercel/output/functions/index.func", {
    recursive: true,
  });
  console.log("✅ Server bundle copied from dist/server/");
}

// Edge function metadata — use Edge runtime (Web Fetch API compatible)
writeFileSync(
  ".vercel/output/functions/index.func/.vc-config.json",
  JSON.stringify(
    {
      runtime: "edge",
      entrypoint: "server.js",
    },
    null,
    2
  )
);

// ── 3. Vercel routing config (.vercel/output/config.json) ─────────────────
writeFileSync(
  ".vercel/output/config.json",
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Redirect root to login page (CDN level)
        {
          src: "^/$",
          status: 302,
          headers: { Location: "/auth/login" },
        },
        // Serve static assets directly
        {
          src: "^/assets/(.+)$",
          dest: "/assets/$1",
        },
        // Everything else → SSR edge function
        {
          src: "^/(.*)$",
          dest: "/index",
        },
      ],
    },
    null,
    2
  )
);

console.log("✅ Vercel routing config created");
console.log("🎉 Vercel build output ready at .vercel/output/");
