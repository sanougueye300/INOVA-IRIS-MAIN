import { cpSync, mkdirSync, writeFileSync, existsSync, rmSync } from "fs";

const root = process.cwd();

console.log("🔧 Cleaning old Vercel output structure...");
if (existsSync(".vercel/output")) {
  rmSync(".vercel/output", { recursive: true, force: true });
}

console.log("🔧 Building Vercel output structure...");

// ── 1. Static assets (.vercel/output/static) ──────────────────────────────
mkdirSync(".vercel/output/static", { recursive: true });
if (existsSync("dist/client")) {
  cpSync("dist/client", ".vercel/output/static", { recursive: true });
  console.log("✅ Static assets copied from dist/client/");
}

// ── 2. Serverless function (.vercel/output/functions/index.func) ───────────
mkdirSync(".vercel/output/functions/index.func", { recursive: true });
if (existsSync("dist/server")) {
  cpSync("dist/server", ".vercel/output/functions/index.func", {
    recursive: true,
  });
  console.log("✅ Server bundle copied from dist/server/");
}

// Node.js serverless function metadata — supports standard fetch handler
writeFileSync(
  ".vercel/output/functions/index.func/.vc-config.json",
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "server.js",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
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
        // Serve static files from .vercel/output/static (dist/client)
        { handle: "filesystem" },
        // Everything else → SSR Node.js serverless function
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
