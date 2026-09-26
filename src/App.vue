<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  defaultConfig,
  type ConnectionInfo,
  type WelcomeConfig,
} from "../shared/types";
import { resolveLocale, setLocale, t } from "../shared/i18n";
import { isNightTime, useNow } from "../shared/time";
import { templateMap } from "../shared/templates";
import GestureLayer from "./components/GestureLayer.vue";
import QrOverlay from "./components/QrOverlay.vue";
import NightScreen from "./components/NightScreen.vue";

const config = ref<WelcomeConfig | null>(null);
const conn = ref<ConnectionInfo | null>(null);
const qrVisible = ref(false);
const now = useNow();

let unlistenConfig: UnlistenFn | null = null;
let unlistenQr: UnlistenFn | null = null;
let unlistenConn: UnlistenFn | null = null;

// Any render-relevant change re-keys the template and triggers a cross-fade
const renderKey = computed(() => JSON.stringify(config.value));
const tpl = computed(() => {
  if (!config.value) return null;
  return templateMap[config.value.templateId] ?? templateMap["classic-red"];
});
const fileBase = computed(() =>
  conn.value ? `http://127.0.0.1:${conn.value.port}` : "",
);
// Night mode dims the screen; the gesture layer and QR overlay sit above it
const nightActive = computed(() =>
  config.value
    ? isNightTime(now.value, config.value.settings?.schedule)
    : false,
);
// Setup mode: the QR overlay stays until the first config save
const setupMode = computed(
  () => !!config.value && config.value.settings?.setupDone === false,
);
// Setup mode with multiple NICs: one QR per address so phones scan their own
const setupUrls = computed(() => {
  if (!conn.value) return [];
  const { ips, port, token, ip } = conn.value;
  const list = ips.length ? ips : [ip];
  return list.slice(0, 3).map((addr) => ({
    ip: addr,
    url: `http://${addr}:${port}/c/?t=${token}`,
  }));
});

// Screen chrome language: explicit config value, else the kiosk OS language
function applyConfigLocale(cfg: WelcomeConfig) {
  setLocale(resolveLocale(cfg.settings?.locale));
  document.title = t("app.title.screen");
}

onMounted(async () => {
  // Suppress long-press system behaviors in the WebView (context menu, selection, drag)
  for (const ev of ["contextmenu", "selectstart", "dragstart"] as const) {
    window.addEventListener(ev, (e) => e.preventDefault());
  }
  try {
    const [cfg, info] = await Promise.all([
      invoke<WelcomeConfig>("get_config"),
      invoke<ConnectionInfo>("get_connection_info"),
    ]);
    config.value = cfg;
    conn.value = info;
    applyConfigLocale(cfg);
  } catch {
    // Browser-only dev preview (no Tauri): use defaults; ?tpl= selects a template
    const devParams = new URLSearchParams(location.search);
    const devTpl = devParams.get("tpl");
    const cfg = defaultConfig();
    if (devTpl) cfg.templateId = devTpl;
    if (devParams.get("night")) cfg.settings.schedule.enabled = true;
    cfg.settings.setupDone = true; // browser preview never enters setup mode
    config.value = cfg;
    applyConfigLocale(cfg);
  }
  unlistenConfig = await listen<WelcomeConfig>("config-changed", (e) => {
    config.value = e.payload;
    applyConfigLocale(e.payload);
    // IP/token changes alter QR URLs — re-fetch connection info to stay in sync
    invoke<ConnectionInfo>("get_connection_info")
      .then((info) => (conn.value = info))
      .catch(() => {});
  });
  unlistenQr = await listen("show-qr", () => {
    qrVisible.value = true;
  });
  // After a token reset, sync the new URL so the screen never shows a dead QR
  unlistenConn = await listen<{ token: string; url: string }>(
    "connection-changed",
    (e) => {
      if (conn.value) {
        conn.value.token = e.payload.token;
        conn.value.controlUrl = e.payload.url;
      }
    },
  );
});

onUnmounted(() => {
  unlistenConfig?.();
  unlistenQr?.();
  unlistenConn?.();
});
</script>

<template>
  <div class="screen-root">
    <Transition
      name="screen-fade"
      mode="out-in"
      :duration="{ enter: 700, leave: 700 }"
    >
      <component
        :is="tpl"
        v-if="config && tpl && !setupMode"
        :key="renderKey"
        :config="config"
        :file-base="fileBase"
      />
    </Transition>
    <Transition name="screen-fade">
      <NightScreen
        v-if="config && nightActive && !setupMode"
        :config="config"
      />
    </Transition>
    <GestureLayer
      v-if="config"
      :corner="config.settings.qr.summonCorner"
      :hold-seconds="config.settings.qr.holdSeconds"
      @summon="qrVisible = true"
    />
    <QrOverlay
      v-if="config && conn"
      v-model="qrVisible"
      :url="conn.controlUrl"
      :corner="config.settings.qr.summonCorner"
      :seconds="config.settings.qr.displaySeconds"
      :persistent="setupMode"
      :alternatives="setupUrls"
    />
  </div>
</template>

<style scoped>
.screen-root {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
