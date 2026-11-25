<script setup lang="ts">
import { computed } from "vue";
import {
  MARQUEE_DURATION,
  type MarqueeSpeed,
  type WelcomeConfig,
} from "../types";
import { clampTextScale, fitFont, type FitOptions } from "../fit";
import { resolveLocale } from "../i18n";
import { formatDate, formatTime, useNow } from "../time";

const props = defineProps<{ config: WelcomeConfig; fileBase: string }>();
const now = useNow();
// Screen chrome follows the configured locale ("auto" = the kiosk OS language)
const tplLocale = computed(() => resolveLocale(props.config.settings?.locale));

// Greeting text auto-fit: sizes shrink with the text length to keep each line
// intact (84cqw = the content area inside the 8cqw side paddings); the manual
// textScale preference only moves the cap, so it can enlarge but never wrap
const scale = computed(() => clampTextScale(props.config.textScale));
const solo = computed(() => !props.config.welcome.guest);

function fitStyle(text: string, opts: Omit<FitOptions, "scale">) {
  const fit = fitFont(text, { ...opts, scale: scale.value });
  return { fontSize: fit.fontSize, whiteSpace: fit.wrap ? "normal" : "nowrap" };
}
const titleStyle = computed(() =>
  fitStyle(props.config.welcome.title, {
    maxWidth: 84,
    letterEm: 0.28,
    capW: solo.value ? 10 : 6.5,
    capH: solo.value ? 18 : 11,
    floorW: 2,
  }),
);
const guestStyle = computed(() =>
  fitStyle(props.config.welcome.guest, {
    maxWidth: 84,
    letterEm: 0.06,
    capW: 10.5,
    capH: 19,
    floorW: 3.8,
  }),
);
const subtitleStyle = computed(() =>
  fitStyle(props.config.welcome.subtitle, {
    maxWidth: 84,
    letterEm: 0.34,
    capW: 4.2,
    capH: 7.5,
    floorW: 1.8,
  }),
);

const bgStyle = computed(() => {
  const base =
    "radial-gradient(ellipse at 50% 30%, #a4161a 0%, #7a1114 45%, #570a0d 100%)";
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
  <div class="tpl classic-red slow-zoom" :style="bgStyle">
    <div class="inner">
      <!-- Gold frame and corner ornaments -->
      <div class="frame"></div>
      <div class="corner tl"></div>
      <div class="corner tr"></div>
      <div class="corner bl"></div>
      <div class="corner br"></div>

      <img v-if="logoUrl" :src="logoUrl" class="logo" alt="logo" />

      <main class="content anti-burn">
        <h1
          v-if="config.welcome.title"
          class="title"
          :class="{ solo: !config.welcome.guest }"
          :style="titleStyle"
        >
          {{ config.welcome.title }}
        </h1>
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

      <div class="corner-info">
        <div v-if="config.elements.clock" class="clock">
          {{ formatTime(now, config.settings?.clock, tplLocale) }}
        </div>
        <div v-if="config.elements.date" class="date">
          {{ formatDate(now, tplLocale) }}
        </div>
      </div>

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

/* Gold ornaments */
.frame {
  position: absolute;
  inset: 1.5cqw;
  border: 1px solid rgba(230, 196, 128, 0.32);
  pointer-events: none;
}
.corner {
  position: absolute;
  width: 3.4cqw;
  height: 3.4cqw;
  pointer-events: none;
}
.corner::before {
  content: "";
  position: absolute;
  inset: 0;
  border: 0 solid #e0b56a;
}
.corner.tl {
  left: 1.5cqw;
  top: 1.5cqw;
}
.corner.tl::before {
  border-left-width: 0.22cqw;
  border-top-width: 0.22cqw;
}
.corner.tr {
  right: 1.5cqw;
  top: 1.5cqw;
}
.corner.tr::before {
  border-right-width: 0.22cqw;
  border-top-width: 0.22cqw;
}
.corner.bl {
  left: 1.5cqw;
  bottom: 1.5cqw;
}
.corner.bl::before {
  border-left-width: 0.22cqw;
  border-bottom-width: 0.22cqw;
}
.corner.br {
  right: 1.5cqw;
  bottom: 1.5cqw;
}
.corner.br::before {
  border-right-width: 0.22cqw;
  border-bottom-width: 0.22cqw;
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

/* Font sizes come from fitFont() inline styles (auto-fit + manual textScale);
   balance evens out the rare fallback to multiple lines */
.title {
  font-family: "KaiTi", "STKaiti", "Microsoft YaHei", serif;
  letter-spacing: 0.28em;
  text-indent: 0.28em; /* offset trailing letter-spacing for visual centering */
  color: transparent;
  background: linear-gradient(180deg, #f7dfa5 0%, #e8bd6d 55%, #d9a54e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  margin-bottom: 4cqh;
  font-weight: 400;
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  text-wrap: balance;
}

.guest {
  font-family: "SimSun", "STSong", "Microsoft YaHei", serif;
  font-weight: 700;
  color: #fdf6e3;
  letter-spacing: 0.06em;
  line-height: 1.2;
  text-shadow:
    0 0 28px rgba(240, 190, 110, 0.35),
    0 6px 30px rgba(0, 0, 0, 0.5);
  max-width: 84cqw;
  word-break: break-word;
  text-wrap: balance;
}

.subtitle {
  margin-top: 3.5cqh;
  font-family: "KaiTi", "STKaiti", "Microsoft YaHei", serif;
  letter-spacing: 0.34em;
  text-indent: 0.34em;
  color: #eecf95;
  text-wrap: balance;
}

.corner-info {
  position: absolute;
  right: 5.5cqw;
  bottom: 8cqh;
  text-align: right;
  font-family: "SimSun", "Microsoft YaHei", serif;
}
.clock {
  font-size: min(4.6cqw, 8cqh);
  color: #f3d9a4;
  letter-spacing: 0.06em;
}
.date {
  margin-top: 1.2cqh;
  font-size: min(1.7cqw, 3cqh);
  color: rgba(243, 217, 164, 0.75);
  letter-spacing: 0.1em;
}

.marquee {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6.5cqh;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 0, 0, 0.28),
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
  color: #f3d9a4;
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
