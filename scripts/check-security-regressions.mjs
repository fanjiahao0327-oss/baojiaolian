import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK ${message}`);
  }
}

const verifyRoute = read("src/app/api/payment/verify/route.ts");
assert(
  !verifyRoute.includes("startsWith(\"VP-\")") && !verifyRoute.includes("startsWith('VP-')"),
  "client-side payment verify must not directly credit virtual-pay VP orders",
);

const coachRoute = read("src/app/api/coach/route.ts");
assert(
  !coachRoute.includes("ORDER BY created_at DESC LIMIT 1"),
  "coach route must not attach requests to the latest conversation implicitly",
);
assert(
  coachRoute.includes("conversationId"),
  "coach route should use an explicit conversationId for follow-up messages",
);
assert(
  coachRoute.includes("objection_followup"),
  "coach route should support explicit objection followup mode",
);
assert(
  coachRoute.includes("buildObjectionModeInstructions"),
  "coach route should apply objection followup mode instructions",
);
assert(
  coachRoute.includes("normalizeObjectionFollowupData"),
  "coach route should normalize objection followup payloads",
);

const webHome = read("src/app/page.tsx");
assert(
  webHome.includes("ObjectionFollowupForm"),
  "web app should expose the customer objection followup form",
);
assert(
  webHome.includes("mode: options.mode || \"diagnosis\""),
  "web app should send explicit coach mode to the coach API",
);

const objectionForm = read("src/components/ObjectionFollowupForm.tsx");
assert(
  !objectionForm.includes("@/lib/objection-followup\""),
  "web objection form must not import server-side objection prompt helpers into the browser bundle",
);

const gitignore = read(".gitignore");
assert(
  /^\.env$/m.test(gitignore),
  ".env must be ignored so local secrets are not tracked again",
);

const vercelignore = read(".vercelignore");
assert(
  /^\.env$/m.test(vercelignore) && /^\.env\.\*$/m.test(vercelignore),
  ".env files must be excluded from local Vercel deployment bundles",
);
