<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch, watchEffect } from "vue";
import {
  UnauthorizedError,
  api,
  fileUrl,
  initTokenFallback,
  rememberToken,
  token,
} from "./api";
import { compressImage } from "./compress";
import ScreenPreview from "./ScreenPreview.vue";
import {
  TEMPLATES,
  defaultConfig,
  defaultWelcomeText,
  type MetaInfo,
  type WelcomeConfig,
} from "../shared/types";
import {
  isLocale,
  persistUiLocale,
  resolveLocale,
  setLocale,
  t,
  useLocale,
  type Locale,
} from "../shared/i18n";

type View = "loading" | "ready" | "unauthorized" | "error";

interface HistoryEntry {
  title: string;
  guest: string;
  subtitle: string;
  ts: number;
}

const HISTORY_KEY = "welcome-history";
const DRAFT_KEY = "welcome-draft";
const MAX_HISTORY = 12;

const view = ref<View>("loading");
const errorMsg = ref("");
const online = ref(true);
const meta = ref<MetaInfo | null>(null);
const form = reactive<WelcomeConfig>(defaultConfig());

// Control-page UI language (own preference, independent of the screen locale)
const locale = useLocale();
watchEffect(() => {
  document.title = t("app.title.control");
});

function switchUiLocale(next: Locale) {
  setLocale(next);
  persistUiLocale(next);
}

const saving = ref(false);
const uploadBgPct = ref(-1); // -1 = not uploading
const uploadLogoPct = ref(-1);
const toast = ref("");
const isDirty = ref(false);
const draftAvailable = ref(false);
const history = ref<HistoryEntry[]>([]);

let lastSavedJson = "";
let toastTimer = 0;
let pollTimer = 0;

/** Address the phone currently uses to reach the screen (defines which IPs are reachable) */
const accessIp = location.hostname;

function showToast(text: string) {
  toast.value = text;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.value = ""), 2200);
}

// select values are strings; narrow them back to the union types via computed
const summonCorner = computed({
  get: () => form.settings.qr.summonCorner,
  set: (v: string) => {
    form.settings.qr.summonCorner =
      v === "bottom-left" ? "bottom-left" : "bottom-right";
  },
});
const clockFormat = computed({
  get: () => form.settings.clock.format,
  set: (v: string) => {
    form.settings.clock.format = v === "12h" ? "12h" : "24h";
  },
});
const marqueeSpeed = computed({
  get: () => form.settings.marqueeSpeed,
  set: (v: string) => {
    form.settings.marqueeSpeed = v === "slow" || v === "fast" ? v : "normal";
  },
});
// Screen IP used in QR URLs; empty = auto
const selectedIp = computed({
  get: () => form.settings.network?.ip ?? "",
  set: (v: string) => {
    form.settings.network = { ip: v === "auto" ? "" : v };
  },
});
// Screen chrome language: an explicit locale or "auto" (follow the kiosk OS)
const screenLocale = computed({
  get: () => (isLocale(form.settings.locale) ? form.settings.locale : "auto"),
  set: (v: string) => {
    form.settings.locale = v === "zh-CN" || v === "en" ? v : "auto";
  },
});

function readJson(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

function loadHistory() {
  const list = readJson(HISTORY_KEY);
  if (Array.isArray(list)) {
    history.value = list.filter(
      (e): e is HistoryEntry =>
        !!e &&
        typeof e === "object" &&
        typeof (e as HistoryEntry).guest === "string",
    );
  }
}

async function load() {
  view.value = "loading";
  initTokenFallback();
  if (!token) {
    errorMsg.value = t("error.noToken");
    view.value = "error";
    return;
  }
  try {
    const [m, cfg] = await Promise.all([api.meta(), api.config()]);
    rememberToken();
    meta.value = m;
    online.value = true;
    Object.assign(form, cfg);
    localizeFreshDefaults(cfg);
    lastSavedJson = JSON.stringify(form);
    isDirty.value = false;
    loadHistory();
    // offer a restore when a local draft differs from the server
    const draft = readJson(DRAFT_KEY) as WelcomeConfig | null;
    draftAvailable.value = !!draft && JSON.stringify(draft) !== lastSavedJson;
    view.value = "ready";
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      view.value = "unauthorized";
    } else {
      // TypeError = fetch-level network failure; its browser message is not localized
      errorMsg.value =
        e instanceof Error && !(e instanceof TypeError)
          ? e.message
          : t("error.connect");
      online.value = false;
      view.value = "error";
    }
  }
}

/** Fresh installs read back the server's zh-CN greeting defaults; match the
 * operator's UI language so the editor starts in the language they will type in */
function localizeFreshDefaults(cfg: WelcomeConfig) {
  if (cfg.settings?.setupDone) return;
  const zh = defaultWelcomeText("zh-CN");
  if (
    cfg.welcome.title === zh.title &&
    cfg.welcome.subtitle === zh.subtitle &&
    !cfg.welcome.guest
  ) {
    Object.assign(form.welcome, defaultWelcomeText(locale.value));
  }
}
load();
// Poll the screen every 5s to drive the online indicator
pollTimer = window.setInterval(async () => {
  if (view.value !== "ready") return;
  try {
    meta.value = await api.meta();
    online.value = true;
  } catch (e) {
    online.value = false;
    if (e instanceof UnauthorizedError) view.value = "unauthorized";
  }
}, 5000);

// ---- Draft & unsaved-changes indicator ----

watch(
  form,
  () => {
    if (view.value !== "ready") return;
    const current = JSON.stringify(form);
    isDirty.value = current !== lastSavedJson;
    if (isDirty.value) writeJson(DRAFT_KEY, form);
  },
  { deep: true },
);

window.addEventListener("beforeunload", (e) => {
  if (isDirty.value) {
    e.preventDefault();
    e.returnValue = "";
  }
});

function restoreDraft() {
  const draft = readJson(DRAFT_KEY) as WelcomeConfig | null;
  if (draft) {
    mergeInto(form, draft);
    showToast(t("draft.restored"));
  }
  draftAvailable.value = false;
}

function discardDraft() {
  writeJson(DRAFT_KEY, null);
  draftAvailable.value = false;
}

onUnmounted(() => {
  window.clearInterval(pollTimer);
  window.clearTimeout(toastTimer);
});

// ---- Save ----

async function save() {
  saving.value = true;
  try {
    const saved = await api.save(
      JSON.parse(JSON.stringify(form)) as WelcomeConfig,
    );
    Object.assign(form, saved);
    lastSavedJson = JSON.stringify(saved);
    isDirty.value = false;
    writeJson(DRAFT_KEY, null);
    draftAvailable.value = false;
    pushHistory(
      saved.welcome.title,
      saved.welcome.guest,
      saved.welcome.subtitle,
    );
    showToast(t("save.saved"));
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      view.value = "unauthorized";
    } else {
      showToast(e instanceof Error ? e.message : t("save.failed"));
    }
  } finally {
    saving.value = false;
  }
}

// ---- History ----

function pushHistory(title: string, guest: string, subtitle: string) {
  const key = `${title}\n${guest}\n${subtitle}`;
  history.value = history.value.filter(
    (h) => `${h.title}\n${h.guest}\n${h.subtitle}` !== key,
  );
  history.value.unshift({ title, guest, subtitle, ts: Date.now() });
  history.value = history.value.slice(0, MAX_HISTORY);
  writeJson(HISTORY_KEY, history.value);
}

function applyHistory(h: HistoryEntry) {
  form.welcome.title = h.title;
  form.welcome.guest = h.guest;
  form.welcome.subtitle = h.subtitle;
}

// ---- Uploads (with progress) ----

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

function handleUploadError(e: unknown) {
  if (e instanceof UnauthorizedError) {
    view.value = "unauthorized";
  } else {
    showToast(e instanceof Error ? e.message : t("error.uploadFailed"));
  }
}

async function uploadBackground() {
  const file = await pickFile("image/*");
  if (!file) return;
  uploadBgPct.value = 0;
  try {
    const compressed = await compressImage(file, {
      maxSide: 2560,
      mime: "image/jpeg",
      quality: 0.85,
    });
    const { path } = await api.upload(compressed, "background", (pct) => {
      uploadBgPct.value = pct;
    });
    form.background = path;
    await save();
  } catch (e) {
    handleUploadError(e);
  } finally {
    uploadBgPct.value = -1;
  }
}

async function uploadLogo() {
  const file = await pickFile("image/png,image/jpeg,image/webp");
  if (!file) return;
  uploadLogoPct.value = 0;
  try {
    const compressed = await compressImage(file, {
      maxSide: 512,
      mime: "image/png",
      keepSmallPng: true,
    });
    const { path } = await api.upload(compressed, "logo", (pct) => {
      uploadLogoPct.value = pct;
    });
    form.logo = path;
    await save();
  } catch (e) {
    handleUploadError(e);
  } finally {
    uploadLogoPct.value = -1;
  }
}

// ---- Screen actions & security ----

async function showQrOnScreen() {
  try {
    await api.showQr();
    showToast(t("security.showQrDone"));
  } catch (e) {
    handleUploadError(e);
  }
}

async function resetToken() {
  if (!window.confirm(t("security.resetTokenConfirm"))) {
    return;
  }
  try {
    const { url } = await api.resetToken();
    if (meta.value) meta.value.url = url;
    showToast(t("security.resetTokenDone"));
  } catch (e) {
    handleUploadError(e);
  }
}

// ---- Config management: export / import / reset ----

function exportConfig() {
  const blob = new Blob([JSON.stringify(form, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "welcome-config.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function mergeInto(target: WelcomeConfig, src: Partial<WelcomeConfig>) {
  const d = defaultConfig();
  Object.assign(target, {
    ...d,
    ...src,
    templateId: TEMPLATES.some((t) => t.id === src.templateId)
      ? src.templateId!
      : d.templateId,
    background:
      typeof src.background === "string" ? src.background : d.background,
    logo: typeof src.logo === "string" ? src.logo : d.logo,
  });
  target.welcome = { ...d.welcome, ...src.welcome };
  target.elements = { ...d.elements, ...src.elements };
  target.settings = { ...d.settings, ...src.settings };
  target.settings.qr = { ...d.settings.qr, ...src.settings?.qr };
  target.settings.clock = { ...d.settings.clock, ...src.settings?.clock };
  target.settings.schedule = {
    ...d.settings.schedule,
    ...src.settings?.schedule,
  };
}

async function importConfig() {
  const file = await pickFile("application/json,.json");
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text()) as Partial<WelcomeConfig>;
    mergeInto(form, parsed);
    showToast(t("config.imported"));
  } catch {
    showToast(t("config.invalidFile"));
  }
}

async function resetDefaults() {
  if (!window.confirm(t("config.resetConfirm"))) {
    return;
  }
  const keepAutoStart = form.settings.autoStart;
  const keepQr = { ...form.settings.qr };
  mergeInto(form, defaultConfig());
  form.settings.autoStart = keepAutoStart;
  form.settings.qr = keepQr;
  // Greeting defaults follow the resolved screen language, not always zh-CN
  Object.assign(
    form.welcome,
    defaultWelcomeText(resolveLocale(form.settings.locale)),
  );
  await save();
}
</script>

<template>
  <!-- Loading -->
  <div v-if="view === 'loading'" class="page-state">
    <div class="spinner"></div>
    <p>{{ t("view.loading") }}</p>
  </div>

  <!-- Invalid token -->
  <div v-else-if="view === 'unauthorized'" class="page-state">
    <div class="state-icon">⚠️</div>
    <h2>{{ t("view.unauthorizedTitle") }}</h2>
    <p>
      {{ t("view.unauthorizedBody1") }}<br />{{
        t("view.unauthorizedBody2", { n: form.settings.qr.holdSeconds })
      }}
    </p>
  </div>

  <!-- Connection errors -->
  <div v-else-if="view === 'error'" class="page-state">
    <div class="state-icon">📡</div>
    <h2>{{ t("view.errorTitle") }}</h2>
    <p>{{ errorMsg }}</p>
    <p class="hint">{{ t("view.errorHint") }}</p>
    <button class="btn primary" @click="load">{{ t("view.retry") }}</button>
  </div>

  <!-- Main form -->
  <template v-else>
    <header class="topbar">
      <div>
        <div class="app-name">{{ t("app.title.control") }}</div>
        <div class="app-meta">
          {{ t("header.screen") }} {{ meta?.ip ?? "…" }} ·
          {{ online ? t("status.online") : t("status.offline") }}
        </div>
      </div>
      <div class="topbar-right">
        <div
          class="lang-switch"
          role="group"
          :aria-label="t('security.language')"
        >
          <button
            type="button"
            :class="{ active: locale === 'zh-CN' }"
            @click="switchUiLocale('zh-CN')"
          >
            中
          </button>
          <button
            type="button"
            :class="{ active: locale === 'en' }"
            @click="switchUiLocale('en')"
          >
            EN
          </button>
        </div>
        <span class="dot" :class="online ? 'online' : 'offline'"></span>
      </div>
    </header>

    <!-- Draft restore -->
    <div v-if="draftAvailable" class="draft-bar">
      <span>{{ t("draft.detected") }}</span>
      <button class="btn small" @click="restoreDraft">
        {{ t("draft.restore") }}
      </button>
      <button class="btn small" @click="discardDraft">
        {{ t("draft.discard") }}
      </button>
    </div>

    <!-- Live preview -->
    <section class="card">
      <div class="card-title">{{ t("preview.title") }}</div>
      <ScreenPreview :config="form" />
      <p class="tip">{{ t("preview.tip") }}</p>
    </section>

    <!-- Greeting -->
    <section class="card">
      <div class="card-title">{{ t("greeting.title") }}</div>
      <div v-if="history.length" class="history">
        <div class="history-label">{{ t("greeting.recent") }}</div>
        <div class="history-chips">
          <button
            v-for="h in history"
            :key="h.ts"
            class="chip"
            @click="applyHistory(h)"
          >
            {{ h.guest || h.title || t("greeting.noSubject") }}
          </button>
        </div>
      </div>
      <div class="field">
        <label>
          {{ t("greeting.titleLabel") }}
          <span class="count">{{ form.welcome.title.length }}/20</span>
        </label>
        <input
          v-model="form.welcome.title"
          type="text"
          maxlength="20"
          :placeholder="t('greeting.titlePlaceholder')"
        />
      </div>
      <div class="field">
        <label>
          {{ t("greeting.guestLabel") }}
          <span class="count">{{ form.welcome.guest.length }}/40</span>
        </label>
        <input
          v-model="form.welcome.guest"
          type="text"
          maxlength="40"
          :placeholder="t('greeting.guestPlaceholder')"
        />
      </div>
      <div class="field">
        <label>
          {{ t("greeting.subtitleLabel") }}
          <span class="count">{{ form.welcome.subtitle.length }}/30</span>
        </label>
        <input
          v-model="form.welcome.subtitle"
          type="text"
          maxlength="30"
          :placeholder="t('greeting.subtitlePlaceholder')"
        />
      </div>
    </section>

    <!-- Template -->
    <section class="card">
      <div class="card-title">{{ t("template.title") }}</div>
      <div class="tpl-list">
        <div
          v-for="tpl in TEMPLATES"
          :key="tpl.id"
          class="tpl-item"
          :class="{ active: form.templateId === tpl.id }"
          @click="form.templateId = tpl.id"
        >
          <div class="tpl-swatch" :style="{ background: tpl.swatch }"></div>
          <div class="tpl-name">{{ t(tpl.nameKey) }}</div>
          <div class="tpl-desc">{{ t(tpl.descKey) }}</div>
        </div>
      </div>
    </section>

    <!-- Background -->
    <section class="card">
      <div class="card-title">{{ t("background.title") }}</div>
      <div class="preview-wrap">
        <img
          v-if="form.background"
          :src="fileUrl(form.background)"
          class="preview-img"
          :alt="t('background.alt')"
        />
        <div v-else class="preview-empty">{{ t("background.default") }}</div>
      </div>
      <div v-if="uploadBgPct >= 0" class="progress">
        <div class="progress-fill" :style="{ width: uploadBgPct + '%' }"></div>
      </div>
      <div class="btn-row">
        <button
          class="btn primary"
          :disabled="uploadBgPct >= 0"
          @click="uploadBackground"
        >
          {{
            uploadBgPct >= 0
              ? t("upload.progress", { n: uploadBgPct })
              : t("background.upload")
          }}
        </button>
        <button
          v-if="form.background"
          class="btn"
          @click="form.background = ''"
        >
          {{ t("background.reset") }}
        </button>
      </div>
      <p class="tip">{{ t("background.tip") }}</p>
    </section>

    <!-- Logo -->
    <section class="card">
      <div class="card-title">{{ t("logo.title") }}</div>
      <div class="preview-wrap">
        <img
          v-if="form.logo"
          :src="fileUrl(form.logo)"
          class="preview-logo"
          :alt="t('logo.alt')"
        />
        <div v-else class="preview-empty">{{ t("logo.empty") }}</div>
      </div>
      <div v-if="uploadLogoPct >= 0" class="progress">
        <div
          class="progress-fill"
          :style="{ width: uploadLogoPct + '%' }"
        ></div>
      </div>
      <div class="btn-row">
        <button
          class="btn primary"
          :disabled="uploadLogoPct >= 0"
          @click="uploadLogo"
        >
          {{
            uploadLogoPct >= 0
              ? t("upload.progress", { n: uploadLogoPct })
              : t("logo.upload")
          }}
        </button>
        <button v-if="form.logo" class="btn" @click="form.logo = ''">
          {{ t("logo.remove") }}
        </button>
      </div>
      <p class="tip">{{ t("logo.tip") }}</p>
    </section>

    <!-- Display elements -->
    <section class="card">
      <div class="card-title">{{ t("elements.title") }}</div>
      <div class="switch-row">
        <span class="label">{{ t("elements.clock") }}</span>
        <span class="switch">
          <input v-model="form.elements.clock" type="checkbox" />
          <span class="track"></span>
          <span class="thumb"></span>
        </span>
      </div>
      <div class="field" style="margin-top: 10px">
        <label>{{ t("elements.clockFormat") }}</label>
        <select v-model="clockFormat">
          <option value="24h">{{ t("elements.24h") }}</option>
          <option value="12h">{{ t("elements.12h") }}</option>
        </select>
      </div>
      <div class="switch-row">
        <span class="label">{{ t("elements.showSeconds") }}</span>
        <span class="switch">
          <input v-model="form.settings.clock.showSeconds" type="checkbox" />
          <span class="track"></span>
          <span class="thumb"></span>
        </span>
      </div>
      <div class="switch-row">
        <span class="label">{{ t("elements.date") }}</span>
        <span class="switch">
          <input v-model="form.elements.date" type="checkbox" />
          <span class="track"></span>
          <span class="thumb"></span>
        </span>
      </div>
      <div class="field" style="margin-top: 10px">
        <label>{{ t("elements.marquee") }}</label>
        <input
          v-model="form.elements.marquee"
          type="text"
          maxlength="80"
          :placeholder="t('elements.marqueePlaceholder')"
        />
      </div>
      <div class="field">
        <label>{{ t("elements.speed") }}</label>
        <select v-model="marqueeSpeed">
          <option value="slow">{{ t("speed.slow") }}</option>
          <option value="normal">{{ t("speed.normal") }}</option>
          <option value="fast">{{ t("speed.fast") }}</option>
        </select>
      </div>
    </section>

    <!-- Screen & security -->
    <section class="card">
      <div class="card-title">{{ t("security.title") }}</div>
      <div class="field">
        <label>{{ t("security.language") }}</label>
        <select v-model="screenLocale">
          <option value="auto">{{ t("lang.auto") }}</option>
          <option value="zh-CN">{{ t("lang.zhCN") }}</option>
          <option value="en">{{ t("lang.en") }}</option>
        </select>
        <p class="tip" style="margin-top: 6px">
          {{ t("security.languageTip") }}
        </p>
      </div>
      <div v-if="meta?.ips?.length" class="field">
        <label>{{ t("security.qrIp") }}</label>
        <select v-model="selectedIp">
          <option value="auto">{{ t("security.ipAuto") }}</option>
          <option v-for="i in meta.ips" :key="i.addr" :value="i.addr">
            {{ i.addr }}（{{ i.name }}）
          </option>
        </select>
        <p class="tip" style="margin-top: 6px">
          {{ t("security.accessIp", { ip: accessIp }) }}
        </p>
      </div>
      <div class="field">
        <label>{{
          t("security.corner", { n: form.settings.qr.holdSeconds })
        }}</label>
        <select v-model="summonCorner">
          <option value="bottom-right">
            {{ t("security.cornerBottomRight") }}
          </option>
          <option value="bottom-left">
            {{ t("security.cornerBottomLeft") }}
          </option>
        </select>
      </div>
      <div class="field">
        <label>{{ t("security.holdSeconds") }}</label>
        <input
          v-model.number="form.settings.qr.holdSeconds"
          type="number"
          min="1"
          max="5"
        />
      </div>
      <div class="field">
        <label>{{ t("security.displaySeconds") }}</label>
        <input
          v-model.number="form.settings.qr.displaySeconds"
          type="number"
          min="10"
          max="120"
        />
      </div>
      <div class="switch-row">
        <span class="label">{{ t("security.autoStart") }}</span>
        <span class="switch">
          <input v-model="form.settings.autoStart" type="checkbox" />
          <span class="track"></span>
          <span class="thumb"></span>
        </span>
      </div>
      <div class="card-subtitle">{{ t("security.nightMode") }}</div>
      <div class="switch-row">
        <span class="label">{{ t("security.nightEnable") }}</span>
        <span class="switch">
          <input v-model="form.settings.schedule.enabled" type="checkbox" />
          <span class="track"></span>
          <span class="thumb"></span>
        </span>
      </div>
      <div v-if="form.settings.schedule.enabled" class="time-row">
        <div class="field">
          <label>{{ t("security.nightStart") }}</label>
          <input v-model="form.settings.schedule.start" type="time" />
        </div>
        <div class="field">
          <label>{{ t("security.nightEnd") }}</label>
          <input v-model="form.settings.schedule.end" type="time" />
        </div>
      </div>
      <div class="btn-row" style="margin-top: 12px">
        <button class="btn block" @click="showQrOnScreen">
          {{ t("security.showQr") }}
        </button>
      </div>
      <div class="btn-row">
        <button class="btn danger block" @click="resetToken">
          {{ t("security.resetToken") }}
        </button>
      </div>
      <p v-if="meta" class="tip">
        {{ t("security.currentConnection", { url: meta.url }) }}
      </p>
    </section>

    <!-- Config management -->
    <section class="card">
      <div class="card-title">{{ t("config.title") }}</div>
      <div class="btn-row">
        <button class="btn" @click="exportConfig">
          {{ t("config.export") }}
        </button>
        <button class="btn" @click="importConfig">
          {{ t("config.import") }}
        </button>
      </div>
      <div class="btn-row">
        <button class="btn danger block" @click="resetDefaults">
          {{ t("config.resetDefaults") }}
        </button>
      </div>
      <p class="tip">{{ t("config.tip") }}</p>
    </section>

    <!-- Save bar -->
    <div class="save-bar">
      <div class="save-bar-inner">
        <button class="btn primary" :disabled="saving" @click="save">
          {{
            saving
              ? t("save.saving")
              : isDirty
                ? t("save.applyDirty")
                : t("save.apply")
          }}
        </button>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="pop-fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </template>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 6px;
}
.app-name {
  font-size: 19px;
  font-weight: 700;
  color: #f5f2ec;
}
.app-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #8b939c;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.lang-switch {
  display: flex;
  border: 1px solid #2c3540;
  border-radius: 8px;
  overflow: hidden;
}
.lang-switch button {
  background: #12161c;
  color: #8b939c;
  border: none;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.lang-switch button.active {
  background: #e8a54b;
  color: #101418;
  font-weight: 600;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot.online {
  background: #4cc38a;
  box-shadow: 0 0 8px rgba(76, 195, 138, 0.6);
}
.dot.offline {
  background: #6b7280;
}

.draft-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 14px 0;
  padding: 10px 12px;
  background: rgba(232, 165, 75, 0.1);
  border: 1px solid rgba(232, 165, 75, 0.4);
  border-radius: 10px;
  font-size: 13px;
  color: #f0d5a8;
}
.draft-bar span {
  flex: 1;
}
.btn.small {
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
}

.history {
  margin-bottom: 14px;
}
.history-label {
  font-size: 12px;
  color: #6f7880;
  margin-bottom: 8px;
}
.history-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.chip {
  flex: none;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  height: 32px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid #2c3540;
  background: #12161c;
  color: #c8c4bd;
  font-size: 13px;
  cursor: pointer;
}
.chip:active {
  border-color: #e8a54b;
}

.tpl-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.tpl-item {
  border: 2px solid #2c3540;
  border-radius: 12px;
  padding: 8px;
  text-align: center;
  cursor: pointer;
}
.tpl-item.active {
  border-color: #e8a54b;
  background: rgba(232, 165, 75, 0.08);
}
.tpl-swatch {
  height: 64px;
  border-radius: 8px;
}
.tpl-name {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #e8e6e1;
}
.tpl-desc {
  margin-top: 2px;
  font-size: 11px;
  color: #8b939c;
}

.preview-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #12161c;
  border-radius: 10px;
  min-height: 120px;
  margin-bottom: 12px;
  overflow: hidden;
}
.preview-img {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  display: block;
}
.preview-logo {
  max-height: 100px;
  max-width: 80%;
  object-fit: contain;
}
.preview-empty {
  color: #5c646d;
  font-size: 13px;
  padding: 30px 0;
}

.progress {
  height: 6px;
  border-radius: 3px;
  background: #2c3540;
  overflow: hidden;
  margin-bottom: 12px;
}
.progress-fill {
  height: 100%;
  background: #e8a54b;
  border-radius: 3px;
  transition: width 0.2s;
}

.card-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: #b8b2a8;
  margin: 14px 0 4px;
  padding-top: 12px;
  border-top: 1px solid #232b34;
}

.time-row {
  display: flex;
  gap: 10px;
}

.btn-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.btn-row .btn {
  flex: 1;
}
.tip {
  font-size: 12px;
  color: #5c646d;
  margin-top: 8px;
  word-break: break-all;
}

.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: rgba(30, 36, 44, 0.95);
  border: 1px solid #2c3540;
  color: #f0ede8;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
}

.page-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 32px;
  color: #b8b2a8;
}
.page-state h2 {
  color: #f0ede8;
  font-size: 20px;
  margin: 16px 0 10px;
}
.page-state p {
  font-size: 14px;
  line-height: 1.8;
}
.page-state .hint {
  margin-top: 8px;
  color: #6f7880;
  font-size: 12px;
}
.page-state .btn {
  margin-top: 24px;
}
.state-icon {
  font-size: 44px;
}
.spinner {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid #2c3540;
  border-top-color: #e8a54b;
  animation: spin 0.9s linear infinite;
  margin-bottom: 6px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
