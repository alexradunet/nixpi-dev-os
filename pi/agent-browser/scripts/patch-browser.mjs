/**
 * Patches agent-browser's browser.js to support AGENT_BROWSER_EXECUTABLE_PATH.
 * NixOS needs this to point at the nix-provided Chromium.
 * Runs as postinstall so it survives `npm install`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "node_modules", "agent-browser", "dist", "browser.js");

let src = readFileSync(file, "utf8");

const target = `this.browser = await launcher.launch({
            headless: options.headless ?? true,
        });`;

const replacement = `this.browser = await launcher.launch({
            headless: options.headless ?? true,
            ...(process.env.AGENT_BROWSER_EXECUTABLE_PATH
                ? { executablePath: process.env.AGENT_BROWSER_EXECUTABLE_PATH }
                : {}),
        });`;

if (src.includes("AGENT_BROWSER_EXECUTABLE_PATH")) {
  console.log("browser.js already patched, skipping");
  process.exit(0);
}

if (!src.includes(target)) {
  console.error("Could not find launch block in browser.js; patch target may have changed");
  process.exit(1);
}

src = src.replace(target, replacement);
writeFileSync(file, src);
console.log("Patched browser.js with AGENT_BROWSER_EXECUTABLE_PATH support");
