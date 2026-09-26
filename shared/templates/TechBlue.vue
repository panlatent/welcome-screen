<script setup lang="ts">
import { computed } from "vue";
import { MARQUEE_DURATION, type WelcomeConfig } from "../types";
import { resolveLocale } from "../i18n";
import { formatDate, formatTime, useNow } from "../time";

const props = defineProps<{ config: WelcomeConfig; fileBase: string }>();
const now = useNow();
// Screen chrome follows the configured locale ("auto" = the kiosk OS language)
const tplLocale = computed(() => resolveLocale(props.config.settings?.locale));

const bgStyle = computed(() => {
  const base =
    "radial-gradient(ellipse at 20% 0%, #19376d 0%, #0b2447 55%, #050f24 100%)";
  if (!props.config.background) return { backgroundImage: base };
  return {
    backgroundImage: `url(${props.fileBase}/${props.config.background}), ${base}`,
    backgroundSize: "cover, cover",
    backgroundPosition: "center, center",
  };
});

const logoUrl = computed(() =>
  props.config.logo ? `${props.fileBase}/${props.config.logo}` : "",
);

const marqueeDuration = computed(
  () => MARQUEE_DURATION[props.config.settings?.marqueeSpeed ?? "normal"],
);
</script>

<template>
  <div class="tpl tech-blue slow-zoom" :style="bgStyle">
    <div class="inner">
      <!-- Tech grid and glow orbs -->
      <div class="grid"></div>
      <div class="glow glow-a"></div>
      <div class="glow glow-b"></div>

      <img v-if="logoUrl" :src="logoUrl" class="logo" alt="logo" />

      <div class="corner-info">
        <div v-if="config.elements.clock" class="clock">
          {{ formatTime(now, config.settings?.clock, tplLocale) }}
        </div>
        <div v-if="config.elements.date" class="date">
          {{ formatDate(now, tplLocale) }}
        </div>
      </div>

      <main class="content anti-burn">
        <div
          v-if="config.welcome.title"
          class="title-row"
          :class="{ solo: !config.welcome.guest }"
        >
          <span class="line"></span>
          <h1 class="title">{{ config.welcome.title }}</h1>
          <span class="line"></span>
        </div>
        <div v-if="config.welcome.guest" class="guest">
          {{ config.welcome.guest }}
        </div>
        <div v-if="config.welcome.subtitle" class="subtitle">
          {{ config.welcome.subtitle }}
        </div>
      </main>

      <div v-if="config.elements.marquee" class="marquee">
        <div
          class="marquee-track"
          :style="{ animationDuration: marqueeDuration }"
        >
          <span>{{ config.elements.marquee }}　　</span>
          <span>{{ config.elements.marquee }}　　</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Container queries: templates scale with their container — the same component
   renders fullscreen and in the control-page mini preview */
.tpl {
  position: absolute;
  inset: 0;
  overflow: hidden;
  container-type: size;
}
.inner {
  position: absolute;
  inset: 0;
}

.grid {
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(120, 170, 255, 0.05) 0 1px,
      transparent 1px 90px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(120, 170, 255, 0.05) 0 1px,
      transparent 1px 90px
    );
  pointer-events: none;
}

.glow {
  position: absolute;
  width: 46cqw;
  height: 46cqw;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  pointer-events: none;
}
.glow-a {
  left: -12cqw;
  top: -14cqw;
  background: radial-gradient(
    circle,
    rgba(87, 108, 188, 0.55),
    transparent 65%
  );
  animation: glow-float 22s ease-in-out infinite alternate;
}
.glow-b {
  right: -14cqw;
  bottom: -16cqw;
  background: radial-gradient(
    circle,
    rgba(46, 196, 222, 0.35),
    transparent 65%
  );
  animation: glow-float 26s ease-in-out infinite alternate-reverse;
}
@keyframes glow-float {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(5cqw, 4cqh) scale(1.15);
  }
}

.logo {
  position: absolute;
  top: 5.5cqh;
  left: 5.5cqw;
  max-height: 9cqh;
  max-width: 22cqw;
  object-fit: contain;
}

.content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 8cqw;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 3cqw;
  margin-bottom: 4.5cqh;
}
.title-row.solo {
  margin-bottom: 0;
}
.line {
  display: inline-block;
  width: 9cqw;
  height: 2px;
  background: linear-gradient(90deg, transparent, #6fc3ff);
}
.title-row .line:last-child {
  background: linear-gradient(90deg, #6fc3ff, transparent);
}
.title {
  font-size: min(5cqw, 9cqh);
  font-weight: 500;
  letter-spacing: 0.42em;
  text-indent: 0.42em;
  color: #9fd0ff;
}
.title-row.solo .title {
  font-size: min(9cqw, 16cqh);
  color: #eaf4ff;
}

.guest {
  font-size: min(10.5cqw, 19cqh);
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.05em;
  line-height: 1.2;
  max-width: 84cqw;
  word-break: break-word;
  text-shadow:
    0 0 22px rgba(111, 195, 255, 0.55),
    0 0 60px rgba(87, 108, 188, 0.4);
}

.subtitle {
  margin-top: 3.5cqh;
  font-size: min(3.8cqw, 7cqh);
  font-weight: 300;
  letter-spacing: 0.5em;
  text-indent: 0.5em;
  color: rgba(200, 224, 255, 0.85);
}

.corner-info {
  position: absolute;
  top: 5.5cqh;
  right: 5.5cqw;
  text-align: right;
}
.clock {
  font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: min(4.4cqw, 8cqh);
  font-weight: 600;
  color: #dcecff;
  letter-spacing: 0.04em;
  text-shadow: 0 0 18px rgba(111, 195, 255, 0.5);
}
.date {
  margin-top: 1cqh;
  font-size: min(1.6cqw, 3cqh);
  color: rgba(180, 210, 250, 0.7);
  letter-spacing: 0.12em;
}

.marquee {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6.5cqh;
  border-top: 1px solid rgba(111, 195, 255, 0.22);
  background: linear-gradient(
    90deg,
    transparent,
    rgba(8, 20, 44, 0.75),
    transparent
  );
  overflow: hidden;
  display: flex;
  align-items: center;
}
.marquee-track {
  display: inline-flex;
  white-space: nowrap;
  animation: marquee-scroll 28s linear infinite;
  font-size: min(2cqw, 3.6cqh);
  color: #a9cdf5;
  letter-spacing: 0.12em;
}
@keyframes marquee-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
</style>
