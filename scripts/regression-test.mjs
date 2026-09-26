// Regression tests: server-side validation/clamping, file cleanup, token reset.
// Requires the app to be running locally on port 7480.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dataDir = join(process.env.APPDATA, "io.github.panlatent.welcomescreen");
const { token } = JSON.parse(
  readFileSync(join(dataDir, "config.json"), "utf8"),
).settings;
const base = "http://127.0.0.1:7480";
const H = { "Content-Type": "application/json" };
const cfgUrl = `${base}/api/config?t=${token}`;

let failed = 0;
function check(name, ok, detail = "") {
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  | " + detail : ""}`,
  );
  if (!ok) failed++;
}

async function put(body, tokenArg = token) {
  const res = await fetch(`${base}/api/config?t=${tokenArg}`, {
    method: "PUT",
    headers: H,
    body: JSON.stringify(body),
  });
  return {
    status: res.status,
    body: res.ok ? await res.json() : await res.json().catch(() => ({})),
  };
}

let cfg = await (await fetch(cfgUrl)).json();

// --- Text truncation + numeric clamping + corner whitelist ---
const longTitle = "非".repeat(25);
let r = await put({
  ...cfg,
  welcome: { ...cfg.welcome, title: longTitle },
  settings: {
    ...cfg.settings,
    qr: { ...cfg.settings.qr, displaySeconds: 999, summonCorner: "top-left" },
  },
});
check(
  "oversized title truncated to 20 chars",
  r.body.welcome?.title?.length === 20,
  `len=${r.body.welcome?.title?.length}`,
);
check(
  "displaySeconds clamped to 120",
  r.body.settings?.qr?.displaySeconds === 120,
  String(r.body.settings?.qr?.displaySeconds),
);
check(
  "invalid corner normalized to bottom-right",
  r.body.settings?.qr?.summonCorner === "bottom-right",
  r.body.settings?.qr?.summonCorner,
);

// --- Server-side validation of the newer settings ---
r = await put({
  ...cfg,
  settings: {
    ...cfg.settings,
    clock: { format: "25h", showSeconds: true },
    marqueeSpeed: "hyper",
    qr: { ...cfg.settings.qr, holdSeconds: 99 },
    schedule: { enabled: true, start: "25:00", end: "abc" },
  },
});
check(
  "invalid clock format normalized to 24h",
  r.body.settings?.clock?.format === "24h",
  r.body.settings?.clock?.format,
);
check(
  "invalid marquee speed normalized to normal",
  r.body.settings?.marqueeSpeed === "normal",
  r.body.settings?.marqueeSpeed,
);
check(
  "holdSeconds clamped to 5",
  r.body.settings?.qr?.holdSeconds === 5,
  String(r.body.settings?.qr?.holdSeconds),
);
check(
  "invalid night start reset to 22:00",
  r.body.settings?.schedule?.start === "22:00",
  r.body.settings?.schedule?.start,
);
check(
  "invalid night end reset to 07:00",
  r.body.settings?.schedule?.end === "07:00",
  r.body.settings?.schedule?.end,
);
check(
  "setupDone=true after the first save",
  r.body.settings?.setupDone === true,
  String(r.body.settings?.setupDone),
);

// --- Multi-NIC IP selection ---
const meta = await (await fetch(`${base}/api/meta?t=${token}`)).json();
const anyIp = meta.ips?.[0]?.addr;
check(
  "meta returns the adapter list",
  Array.isArray(meta.ips) && meta.ips.length > 0,
  JSON.stringify(meta.ips),
);
check(
  "meta.url uses a valid IP",
  meta.ips.some((i) => meta.url.includes(i.addr)),
  meta.url,
);
r = await put({
  ...cfg,
  settings: { ...cfg.settings, network: { ip: "203.0.113.99" } },
});
check(
  "non-local IP reset to auto",
  r.body.settings?.network?.ip === "",
  JSON.stringify(r.body.settings?.network),
);
if (anyIp) {
  r = await put({
    ...cfg,
    settings: { ...cfg.settings, network: { ip: anyIp } },
  });
  check(
    "selected local IP preserved",
    r.body.settings?.network?.ip === anyIp,
    r.body.settings?.network?.ip,
  );
  const meta2 = await (await fetch(`${base}/api/meta?t=${token}`)).json();
  check(
    "meta.url switched to the selected IP",
    meta2.url.includes(anyIp),
    meta2.url,
  );
  // restore auto selection
  await put({ ...cfg, settings: { ...cfg.settings, network: { ip: "" } } });
}

// --- Path traversal rejection ---
r = await put({ ...cfg, background: "../../secret.jpg" });
check(
  "path traversal rejected with 400",
  r.status === 400,
  `status=${r.status}`,
);
r = await put({ ...cfg, logo: "files/../../x.png" });
check(
  "traversal inside files/ rejected with 400",
  r.status === 400,
  `status=${r.status}`,
);

// --- Unreferenced file cleanup ---
async function uploadPng() {
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" +
      "0000000d4944415478da63f8ffff3f00050202f44c30710000000049454e44ae426082",
    "hex",
  );
  const fd = new FormData();
  fd.append("file", new Blob([png], { type: "image/png" }), "t.png");
  const res = await fetch(`${base}/api/upload?t=${token}`, {
    method: "POST",
    body: fd,
  });
  return (await res.json()).path;
}
const fileA = await uploadPng();
const fileB = await uploadPng();
r = await put({ ...cfg, background: fileA, logo: fileB });
check("two referenced files save with 200", r.status === 200);
let kept = r.body.background === fileA && r.body.logo === fileB;
check("referenced paths returned as-is", kept);
r = await put({ ...cfg, background: "", logo: "" });
await new Promise((res) => setTimeout(res, 300));
const aGone = !existsSync(join(dataDir, fileA));
const bGone = !existsSync(join(dataDir, fileB));
check("unreferenced file A cleaned up", aGone);
check("unreferenced file B cleaned up", bGone);

// --- Locale normalization ---
r = await put({ ...cfg, settings: { ...cfg.settings, locale: "fr-FR" } });
check(
  "invalid locale normalized to auto",
  r.body.settings?.locale === "auto",
  r.body.settings?.locale,
);
r = await put({ ...cfg, settings: { ...cfg.settings, locale: "en" } });
check(
  "explicit locale preserved",
  r.body.settings?.locale === "en",
  r.body.settings?.locale,
);

// --- Token reset ---
const oldToken = token;
const resetRes = await fetch(`${base}/api/token?t=${oldToken}`, {
  method: "POST",
});
const reset = await resetRes.json();
check(
  "token reset returns a new token/url",
  resetRes.status === 200 &&
    reset.token !== oldToken &&
    reset.url.includes(reset.token),
);
const oldAuth = await fetch(`${base}/api/config?t=${oldToken}`);
check("old token invalid immediately (401)", oldAuth.status === 401);
const newAuth = await fetch(`${base}/api/config?t=${reset.token}`);
check("new token works (200)", newAuth.status === 200);

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
