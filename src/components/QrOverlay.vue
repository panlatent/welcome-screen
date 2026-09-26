<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import QRCode from "qrcode";
import { openUrl } from "@tauri-apps/plugin-opener";
import { t } from "../../shared/i18n";
import type { SummonCorner } from "../../shared/types";

const props = defineProps<{
  url: string;
  /** Loopback control URL for the open-on-this-PC button */
  localUrl: string;
  corner: SummonCorner;
  seconds: number;
  /** Setup mode: persistent, no countdown, not dismissable; removed by the parent after the first save */
  persistent?: boolean;
  /** Per-address QR codes shown in setup mode (multi-NIC hosts) */
  alternatives?: { ip: string; url: string }[];
}>();
const model = defineModel<boolean>({ required: true });

const countdown = ref(props.seconds);
const canvasRefs = ref<(HTMLCanvasElement | null)[]>([]);
const openFailed = ref(false);
let timer = 0;
let failTimer = 0;

// setup mode: up to 3 cards; normal mode: a single card
const cards = computed(() =>
  props.persistent && props.alternatives?.length
    ? props.alternatives.slice(0, 3)
    : [{ ip: "", url: props.url }],
);

watch(
  [model, () => props.persistent, () => props.url, cards],
  async ([visible]) => {
    if (!(visible || props.persistent)) {
      window.clearInterval(timer);
      return;
    }
    countdown.value = Math.max(5, props.seconds);
    // wait for the canvases to render, then draw each one
    await nextTick();
    for (const [i, card] of cards.value.entries()) {
      const canvas = canvasRefs.value[i];
      if (canvas) {
        await QRCode.toCanvas(canvas, card.url, {
          width: 460,
          margin: 2,
          color: { dark: "#1a1a1a", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
      }
    }
    window.clearInterval(timer);
    if (!props.persistent) {
      timer = window.setInterval(() => {
        countdown.value -= 1;
        if (countdown.value <= 0) model.value = false;
      }, 1000);
    }
  },
  { immediate: true },
);

function dismiss() {
  if (!props.persistent) model.value = false;
}

// Open the control page in the machine's own browser; keep the overlay open
// (the countdown closes it) and flash the failure on the button itself
async function openLocal() {
  try {
    await openUrl(props.localUrl);
  } catch (err) {
    console.error("[qr] failed to open the local browser", err);
    openFailed.value = true;
    window.clearTimeout(failTimer);
    failTimer = window.setTimeout(() => (openFailed.value = false), 2000);
  }
}

onUnmounted(() => {
  window.clearTimeout(failTimer);
});
</script>

<template>
  <Transition name="pop-fade">
    <div v-if="model || persistent" class="qr-mask" @pointerdown="dismiss">
      <div class="qr-card" :class="corner" @pointerdown.stop>
        <template v-if="persistent">
          <div class="qr-title">{{ t("qr.setupTitle") }}</div>
          <div class="qr-sub">{{ t("qr.setupSub") }}</div>
        </template>
        <template v-else>
          <div class="qr-title">{{ t("qr.connectTitle") }}</div>
        </template>
        <div class="qr-row">
          <div v-for="(card, i) in cards" :key="card.url || i" class="qr-item">
            <canvas
              :ref="(el) => (canvasRefs[i] = el as HTMLCanvasElement | null)"
              class="qr-canvas"
            ></canvas>
            <div v-if="card.ip" class="qr-ip">{{ card.ip }}</div>
          </div>
        </div>
        <button
          type="button"
          class="qr-open-local"
          :class="{ failed: openFailed }"
          @click="openLocal"
        >
          {{ openFailed ? t("qr.openFailed") : t("qr.openLocal") }}
        </button>
        <div v-if="!persistent" class="qr-url">{{ url }}</div>
        <div v-if="!persistent" class="qr-hint">
          {{ t("qr.autoClose", { n: countdown }) }}
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.qr-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.35);
}
.qr-card {
  position: absolute;
  bottom: 14vh;
  background: #fff;
  border-radius: 18px;
  padding: 26px 30px 18px;
  text-align: center;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
}
.qr-card.bottom-right {
  right: 8vw;
}
.qr-card.bottom-left {
  left: 8vw;
}
.qr-title {
  font-size: 22px;
  font-weight: 600;
  color: #222;
  margin-bottom: 14px;
}
.qr-sub {
  font-size: 14px;
  color: #888;
  margin: -6px 0 16px;
  max-width: 420px;
  line-height: 1.7;
  text-align: left;
}
.qr-row {
  display: flex;
  gap: 24px;
  justify-content: center;
}
.qr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.qr-canvas {
  width: min(300px, 36vh);
  height: min(300px, 36vh);
  border-radius: 8px;
}
.qr-row .qr-canvas {
  width: min(260px, 32vh);
  height: min(260px, 32vh);
}
.qr-ip {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #444;
  font-family: Consolas, monospace;
}
.qr-open-local {
  margin-top: 14px;
  width: 100%;
  height: 48px;
  border-radius: 10px;
  border: 1.5px solid #b8ada0;
  background: #fff;
  color: #4a4238;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}
.qr-open-local:active {
  background: #f4efe8;
}
.qr-open-local.failed {
  border-color: #c0392b;
  color: #c0392b;
}
.qr-url {
  margin-top: 10px;
  font-size: 13px;
  color: #999;
  word-break: break-all;
}
.qr-hint {
  margin-top: 6px;
  font-size: 13px;
  color: #bbb;
}
</style>
