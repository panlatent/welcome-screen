// Regression tests: server-side validation/clamping, file cleanup, token reset,
// welcome profiles.
// Requires the app to be running locally (default port 7480; override with PORT).
//
// Safety: the tests mutate the running app's real data. config.json, profiles.json
// and files/ are backed up first and restored afterwards; a leftover .test-backup/
// in the data dir means a restore failed — recover from there manually. Restart
// the app after a run so it reloads the restored config.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { deepStrictEqual } from "node:assert";
import { join } from "node:path";

const PORT = Number(process.env.PORT ?? 7480);
const dataDir = join(process.env.APPDATA, "io.github.panlatent.welcomescreen");
const configPath = join(dataDir, "config.json");
const profilesPath = join(dataDir, "profiles.json");
const filesDir = join(dataDir, "files");
const backupDir = join(dataDir, ".test-backup");
const base = `http://127.0.0.1:${PORT}`;
const H = { "Content-Type": "application/json" };
const { token } = JSON.parse(readFileSync(configPath, "utf8")).settings;
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

// ---- Back up the live state so the tests cannot destroy a real deployment ----
const configRaw = readFileSync(configPath, "utf8");
const profilesRaw = existsSync(profilesPath)
  ? readFileSync(profilesPath, "utf8")
  : null;
const hadFilesDir = existsSync(filesDir);
rmSync(backupDir, { recursive: true, force: true });
mkdirSync(join(backupDir, "files"), { recursive: true });
if (hadFilesDir)
  cpSync(filesDir, join(backupDir, "files"), { recursive: true });

function restore() {
  try {
    writeFileSync(configPath, configRaw);
    if (profilesRaw !== null) {
      writeFileSync(profilesPath, profilesRaw);
    } else {
      rmSync(profilesPath, { force: true });
    }
    rmSync(filesDir, { recursive: true, force: true });
    if (hadFilesDir) {
      cpSync(join(backupDir, "files"), filesDir, { recursive: true });
    }
    rmSync(backupDir, { recursive: true, force: true });
    console.log(
      "\n(config.json, profiles.json and files/ restored — restart the app to reload)",
    );
  } catch (e) {
    console.error(`\nRESTORE FAILED — recover manually from ${backupDir}`, e);
  }
}

async function main() {
  try {
    await runTests();
  } finally {
    restore();
  }
}

async function runTests() {
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

  // --- Half-step hold seconds ---
  r = await put({
    ...cfg,
    settings: {
      ...cfg.settings,
      qr: { ...cfg.settings.qr, holdSeconds: 1.3 },
    },
  });
  check(
    "holdSeconds snapped to the 0.5 grid",
    r.body.settings?.qr?.holdSeconds === 1.5,
    String(r.body.settings?.qr?.holdSeconds),
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

  // --- Welcome profiles ---
  let res, info;
  const profilesUrl = `${base}/api/profiles?t=${token}`;
  const fileC = await uploadPng();
  const profileContent = {
    templateId: "tech-blue",
    welcome: { title: "欢迎", guest: "测试一行", subtitle: "参观指导" },
    background: fileC,
    logo: "",
    elements: { clock: false, date: true, marquee: "" },
  };
  res = await fetch(profilesUrl, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ name: "  方案A  ", content: profileContent }),
  });
  const created = await res.json();
  check(
    "profile created",
    res.status === 200 && typeof created.id === "string" && created.id,
    JSON.stringify(created),
  );
  check("profile name trimmed", created.name === "方案A", created.name);

  info = await (await fetch(profilesUrl)).json();
  check(
    "profile appears in the list",
    Array.isArray(info.profiles) &&
      info.profiles.some((p) => p.id === created.id),
  );
  check("no active profile initially", info.activeId === null);

  // Activation swaps appearance, keeps device settings
  const beforeCfg = await (await fetch(cfgUrl)).json();
  res = await fetch(`${base}/api/profiles/${created.id}/activate?t=${token}`, {
    method: "POST",
  });
  const act = await res.json();
  check(
    "activate returns 200 with activeId",
    res.status === 200 && act.activeId === created.id,
  );
  check("activate swaps the template", act.config?.templateId === "tech-blue");
  check(
    "activate swaps the greeting",
    act.config?.welcome?.title === "欢迎" &&
      act.config?.elements?.clock === false,
  );
  // JSON.stringify alone would false-fail on key order: the activate response
  // nests the config inside a json! value (alphabetical keys), GET does not
  let settingsKept = false;
  try {
    deepStrictEqual(act.config?.settings, beforeCfg.settings);
    settingsKept = true;
  } catch {
    /* fall through with settingsKept=false */
  }
  check(
    "activate keeps device settings",
    settingsKept,
    `\n    before=${JSON.stringify(beforeCfg.settings)}\n    after =${JSON.stringify(act.config?.settings)}`,
  );
  const afterCfg = await (await fetch(cfgUrl)).json();
  check(
    "config GET reflects the applied profile",
    afterCfg.templateId === "tech-blue" && afterCfg.background === fileC,
  );
  info = await (await fetch(profilesUrl)).json();
  check("activeId set after activation", info.activeId === created.id);

  // Renaming the active profile keeps it active
  res = await fetch(`${base}/api/profiles/${created.id}?t=${token}`, {
    method: "PUT",
    headers: H,
    body: JSON.stringify({ name: "  方案B  " }),
  });
  const upd = await res.json();
  check(
    "profile renamed (trimmed)",
    res.status === 200 && upd.name === "方案B",
    upd.name,
  );
  info = await (await fetch(profilesUrl)).json();
  check(
    "rename keeps the profile active",
    info.activeId === created.id &&
      info.profiles.some((p) => p.id === created.id && p.name === "方案B"),
  );

  // A manual save detaches the active profile
  r = await put({ ...afterCfg });
  check("plain config save still 200", r.status === 200);
  info = await (await fetch(profilesUrl)).json();
  check(
    "manual save detaches the active profile",
    info.activeId === null,
    `activeId=${info.activeId}`,
  );

  // An inactive profile's image survives config cleanup…
  r = await put({ ...afterCfg, background: "", logo: "" });
  await new Promise((res) => setTimeout(res, 300));
  check(
    "profile-referenced file survives config save",
    existsSync(join(dataDir, fileC)),
  );

  // …and is cleaned once the profile is deleted
  res = await fetch(`${base}/api/profiles/${created.id}?t=${token}`, {
    method: "DELETE",
  });
  check("profile deleted", res.status === 200);
  res = await fetch(`${base}/api/profiles/${created.id}?t=${token}`, {
    method: "DELETE",
  });
  check("second delete returns 404", res.status === 404);
  await new Promise((res) => setTimeout(res, 300));
  check(
    "profile-only file cleaned after delete",
    !existsSync(join(dataDir, fileC)),
  );

  // Validation
  res = await fetch(profilesUrl, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ name: "   ", content: profileContent }),
  });
  check("empty profile name rejected 400", res.status === 400);
  res = await fetch(profilesUrl, {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      name: "x",
      content: { ...profileContent, background: "../../secret.png" },
    }),
  });
  check("profile path traversal rejected 400", res.status === 400);
  res = await fetch(`${base}/api/profiles/nonexistent/activate?t=${token}`, {
    method: "POST",
  });
  check("activate unknown id returns 404", res.status === 404);

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
}

await main();
console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
