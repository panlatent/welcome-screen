<script setup lang="ts">
import { computed } from "vue";
import { MARQUEE_DURATION, type WelcomeConfig } from "../types";
import { clampTextScale, fitFont, type FitOptions } from "../fit";
import { resolveLocale } from "../i18n";
import { formatDate, formatTime, useNow } from "../time";

const props = defineProps<{ config: WelcomeConfig; fileBase: string }>();
const now = useNow();
// Screen chrome follows the configured locale ("auto" = the kiosk OS language)
const tplLocale = computed(() => resolveLocale(props.config.settings?.locale));

// Greeting text auto-fit: sizes shrink with the text length to keep each line
// intact; the manual textScale preference only moves the cap, so it can enlarge
// but never wrap
const scale = computed(() => clampTextScale(props.config.textScale));
const solo = computed(() => !props.config.welcome.guest);

function fitStyle(text: string, opts: Omit<FitOptions, "scale">) {
  const fit = fitFont(text, { ...opts, scale: scale.value });
  return { fontSize: fit.fontSize, whiteSpace: fit.wrap ? "normal" : "nowrap" };
}
const guestStyle = computed(() =>
  fitStyle(props.config.welcome.guest, {
    maxWidth: 84,
    letterEm: 0.05,
    capW: 10.5,
    capH: 19,
    floorW: 3.8,
  }),
);
const subtitleStyle = computed(() =>
  fitStyle(props.config.welcome.subtitle, {
    maxWidth: 84,
    letterEm: 0.5,
    capW: 3.8,
    capH: 7,
    floorW: 1.8,
  }),
);

// The title's decorative side lines eat 24cqw of the 84cqw content area; once
// the title has to shrink well below its design size, hide them and let the
// text use the full width instead
const LINE_WIDTH_CQW = 9;
const LINE_GAP_CQW = 3;
const titleRow = computed(() => {
  const base = {
    letterEm: 0.42,
    capW: solo.value ? 9 : 5,
    capH: solo.value ? 16 : 9,
    floorW: 2,
  };
  const withLines = fitFont(props.config.welcome.title, {
    ...base,
    maxWidth: 84 - 2 * (LINE_WIDTH_CQW + LINE_GAP_CQW),
    scale: scale.value,
  });
  const hideLines =
    withLines.wrap || withLines.sizeCqw < base.capW * scale.value * 0.6;
  if (hideLines) {
    return {
      style: fitStyle(props.config.welcome.title, { ...base, maxWidth: 84 }),
      lines: false,
    };
  }
  return {
    style: { fontSize: withLines.fontSize, whiteSpace: "nowrap" },
    lines: true,
  };
});

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
          <span v-if="titleRow.lines" class="line"></span>
          <h1 class="title" :style="titleRow.style">
            {{ config.welcome.title }}
          </h1>
          <span v-if="titleRow.lines" class="line"></span>
        </div>
        <div v-if="config.welcome.guest" class="guest" :style="guestStyle">
          {{ config.welcome.guest }}
        </div>
        <div
          v-if="config.welcome.subtitle"
          class="subtitle"
          :style="subtitleStyle"
        >
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
/* Font sizes come from fitFont() inline styles (auto-fit + manual textScale);
   balance evens out the rare fallback to multiple lines */
.title {
  font-weight: 500;
  letter-spacing: 0.42em;
  text-indent: 0.42em;
  color: #9fd0ff;
  text-wrap: balance;
}
.title-row.solo .title {
  color: #eaf4ff;
}

.guest {
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.05em;
  line-height: 1.2;
  max-width: 84cqw;
  word-break: break-word;
  text-shadow:
    0 0 22px rgba(111, 195, 255, 0.55),
    0 0 60px rgba(87, 108, 188, 0.4);
  text-wrap: balance;
}

.subtitle {
  margin-top: 3.5cqh;
  font-weight: 300;
  letter-spacing: 0.5em;
  text-indent: 0.5em;
  color: rgba(200, 224, 255, 0.85);
  text-wrap: balance;
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
