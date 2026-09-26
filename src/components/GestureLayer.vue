<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import type { SummonCorner } from "../../shared/types";

const HOLD_MS_DEFAULT = 3000;
const CANCEL_SLOP_PX = 24;

const props = defineProps<{ corner: SummonCorner; holdSeconds?: number }>();
const emit = defineEmits<{ summon: [] }>();

const holdMs = computed(() => Math.max(1, props.holdSeconds ?? 3) * 1000);

const pressing = ref(false);
const progress = ref(0); // 0~1

let startTs = 0;
let startX = 0;
let startY = 0;
let rafId = 0;

const ringVisible = computed(() => pressing.value && progress.value > 0.18);
const R = 26;
const CIRC = 2 * Math.PI * R;
const dashOffset = computed(() => CIRC * (1 - progress.value));

function tick() {
  progress.value = Math.min(1, (performance.now() - startTs) / holdMs.value);
  if (progress.value >= 1) {
    pressing.value = false;
    emit("summon");
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function onDown(e: PointerEvent) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  startTs = performance.now();
  startX = e.clientX;
  startY = e.clientY;
  pressing.value = true;
  progress.value = 0;
  rafId = requestAnimationFrame(tick);
}

function onMove(e: PointerEvent) {
  if (!pressing.value) return;
  if (Math.hypot(e.clientX - startX, e.clientY - startY) > CANCEL_SLOP_PX)
    cancel();
}

function cancel() {
  pressing.value = false;
  progress.value = 0;
  cancelAnimationFrame(rafId);
}

onUnmounted(() => cancelAnimationFrame(rafId));
</script>

<template>
  <div
    class="gesture-zone"
    :class="corner"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="cancel"
    @pointercancel="cancel"
    @pointerleave="cancel"
  >
    <Transition name="pop-fade">
      <svg
        v-if="ringVisible"
        class="progress-ring"
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <circle class="ring-bg" cx="32" cy="32" :r="R" />
        <circle
          class="ring-fg"
          cx="32"
          cy="32"
          :r="R"
          :stroke-dasharray="CIRC"
          :stroke-dashoffset="dashOffset"
        />
      </svg>
    </Transition>
  </div>
</template>

<style scoped>
.gesture-zone {
  position: fixed;
  width: 200px;
  height: 200px;
  z-index: 900;
  touch-action: none;
}
.gesture-zone.bottom-left {
  left: 0;
  bottom: 0;
}
.gesture-zone.bottom-right {
  right: 0;
  bottom: 0;
}

.progress-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 64px;
  height: 64px;
  transform: translate(-50%, -50%);
}
.gesture-zone.bottom-left .progress-ring {
  left: 64px;
  top: auto;
  bottom: 64px;
  transform: none;
}
.gesture-zone.bottom-right .progress-ring {
  left: auto;
  right: 64px;
  top: auto;
  bottom: 64px;
  transform: none;
}

.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.25);
  stroke-width: 5;
}
.ring-fg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.85);
  stroke-width: 5;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: center;
}
</style>
