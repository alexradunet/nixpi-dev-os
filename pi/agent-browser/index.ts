/**
 * agent-browser pi extension
 *
 * Wraps the agent-browser CLI (vercel-labs/agent-browser) into pi tools.
 * The daemon keeps Chrome alive between calls, so multi-step browser
 * sessions work naturally across tool invocations.
 *
 * Tools:
 *   browser            – run any agent-browser command, returns text
 *   browser_screenshot – take a screenshot, returns image content
 *
 * Setup:
 *   NixOS: agent-browser is provided by nix (environment.systemPackages).
 *   Other: npm install && ./node_modules/.bin/agent-browser install
 *   The nixos activation script symlinks this dir into ~/.pi/agent/extensions/.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { execFile, execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXT_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the agent-browser binary. Priority:
 * 1. PATH (nix-installed agent-browser, wraps chromium automatically)
 * 2. node_modules/.bin/ (npm fallback for non-NixOS setups)
 */
function findBin(): string {
  try {
    const p = execSync("command -v agent-browser", { encoding: "utf8", timeout: 3000 }).trim();
    if (p) return p;
  } catch { /* not on PATH */ }
  return join(EXT_DIR, "node_modules", ".bin", "agent-browser");
}

const BIN = findBin();

/**
 * Find the Chromium executable. Priority:
 * 1. AGENT_BROWSER_EXECUTABLE_PATH env var (explicit override)
 * 2. NixOS store chromium (auto-detected)
 * 3. undefined (let Playwright use its downloaded browser)
 */
function findChromium(): string | undefined {
  if (process.env.AGENT_BROWSER_EXECUTABLE_PATH) {
    return process.env.AGENT_BROWSER_EXECUTABLE_PATH;
  }
  // NixOS: find chromium in the store
  try {
    const entries = execSync(
      'find /nix/store -maxdepth 1 -name "*chromium-*" -type d 2>/dev/null | grep -v "unwrapped\\|drv\\|patch" | sort -V | tail -1',
      { encoding: "utf8", timeout: 5000 },
    ).trim();
    if (entries) {
      const bin = join(entries, "bin", "chromium");
      if (existsSync(bin)) return bin;
    }
  } catch { /* not NixOS or no chromium */ }
  return undefined;
}

const CHROMIUM_PATH = findChromium();

interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

function run(args: string[], signal?: AbortSignal): Promise<ExecResult> {
  const env = { ...process.env };
  if (CHROMIUM_PATH) {
    env.AGENT_BROWSER_EXECUTABLE_PATH = CHROMIUM_PATH;
  }
  return new Promise((resolve, reject) => {
    execFile(BIN, args, {
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
      signal,
      env,
    }, (error, stdout, stderr) => {
      if (error && !("code" in error)) {
        reject(error);
        return;
      }
      resolve({
        stdout: stdout ?? "",
        stderr: stderr ?? "",
        code: error && "code" in error ? (error.code as number) : (error ? 1 : 0),
      });
    });
  });
}

export default function agentBrowserExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "browser",
    label: "Browser",
    description:
      "Control a headless browser via agent-browser CLI. " +
      "The browser daemon persists between calls, so you can open a page, " +
      "take a snapshot, click elements, fill forms, and navigate across " +
      "multiple tool invocations.\n\n" +
      "Common commands:\n" +
      "  open <url>              – launch + navigate\n" +
      "  snapshot                – accessibility tree with @refs (best for AI)\n" +
      "  click @e2               – click element by snapshot ref\n" +
      "  fill @e3 \"text\"         – clear and fill input\n" +
      "  type @e3 \"text\"         – type into element\n" +
      "  press Enter             – press key\n" +
      "  get text @e1            – get element text\n" +
      "  get url                 – current URL\n" +
      "  get title               – page title\n" +
      "  scroll down 500         – scroll\n" +
      "  wait 2000               – wait ms\n" +
      "  wait --text \"Welcome\"   – wait for text\n" +
      "  find role button click --name \"Submit\"\n" +
      "  find text \"Sign In\" click\n" +
      "  eval <js>               – run JavaScript\n" +
      "  tab / tab new / tab close\n" +
      "  close                   – close browser\n\n" +
      "Pass the command as a single string, e.g. \"open https://example.com\".",
    promptSnippet:
      "browser: control a headless browser (open, snapshot, click, fill, navigate, read pages)",
    promptGuidelines: [
      "Use browser with 'snapshot' to get an accessibility tree with @refs before clicking or filling.",
      "Use browser with 'get text <sel>' to extract text from elements.",
      "Use browser_screenshot when you need to visually verify a page.",
    ],
    parameters: Type.Object({
      command: Type.String({
        description:
          'agent-browser command to run, e.g. "open https://example.com", "snapshot", "click @e2"',
      }),
    }),
    async execute(_toolCallId, params, signal) {
      const args = params.command.trim().split(/\s+/);
      const result = await run(args, signal);

      const output = result.stdout || result.stderr;
      const text = result.code === 0
        ? output
        : `Exit code ${result.code}\n${output}`;

      return {
        content: [{ type: "text", text: text.slice(0, 100_000) }],
        details: { command: params.command, exitCode: result.code },
        isError: result.code !== 0,
      };
    },
  });

  pi.registerTool({
    name: "browser_screenshot",
    label: "Browser Screenshot",
    description:
      "Take a screenshot of the current browser page. Returns the image " +
      "so you can visually inspect the page. Use 'browser' tool with " +
      "'open <url>' first if no page is loaded. Pass --full for a full-page " +
      "screenshot.",
    promptSnippet:
      "browser_screenshot: capture the current browser page as an image",
    parameters: Type.Object({
      full: Type.Optional(
        Type.Boolean({ description: "Full-page screenshot (default: viewport only)" }),
      ),
      selector: Type.Optional(
        Type.String({ description: "CSS selector or @ref to screenshot a specific element" }),
      ),
    }),
    async execute(_toolCallId, params, signal) {
      const screenshotPath = `/tmp/pi-screenshot-${Date.now()}.png`;
      const args = ["screenshot", screenshotPath];
      if (params.full) args.push("--full");
      if (params.selector) args.push("--selector", params.selector);

      const result = await run(args, signal);

      if (result.code !== 0) {
        return {
          content: [{ type: "text", text: `Screenshot failed (exit ${result.code}):\n${result.stderr || result.stdout}` }],
          details: { exitCode: result.code },
          isError: true,
        };
      }

      try {
        const imageBuffer = await readFile(screenshotPath);
        const base64 = imageBuffer.toString("base64");
        return {
          content: [
            {
              type: "image",
              source: { type: "base64", mediaType: "image/png", data: base64 },
            },
          ],
          details: { path: screenshotPath },
        };
      } catch (readError) {
        return {
          content: [{ type: "text", text: `Screenshot saved to ${screenshotPath} but could not read it: ${readError}` }],
          details: { path: screenshotPath },
        };
      }
    },
  });

  // Close the browser daemon on session shutdown to avoid orphaned Chrome
  pi.on("session_shutdown", async () => {
    try {
      await run(["close"]);
    } catch {
      // Browser may not be running; ignore
    }
  });
}
