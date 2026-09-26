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
  const base = "linear-gradient(160deg, #faf7f2 0%, #f1ece3 60%, #e8e2d8 100%)";
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
  <div class="tpl minimal-white slow-zoom" :style="bgStyle">
    <div class="inner">
      <div class="vignette"></div>

      <img v-if="logoUrl" :src="logoUrl" class="logo" alt="logo" />

      <main class="content anti-burn">
        <h1
          v-if="config.welcome.title"
          class="title"
          :class="{ solo: !config.welcome.guest }"
        >
          {{ config.welcome.title }}
        </h1>
        <div v-if="config.welcome.guest" class="guest">
          {{ config.welcome.guest }}
        </div>
        <div v-if="config.welcome.subtitle" class="subtitle">
          {{ config.welcome.subtitle }}
        </div>
        <div class="seal" :class="{ latin: tplLocale === 'en' }">
          {{ tplLocale === "en" ? "WELCOME" : "欢迎" }}
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

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 55%,
    rgba(60, 50, 40, 0.12) 100%
  );
  pointer-events: none;
}

.logo {
  position: absolute;
  top: 5.5cqh;
  left: 5.5cqw;
  max-height: 9cqh;
  max-width: 22cqw;
  object-fit: contain;
  filter: grayscale(1) contrast(1.05);
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
  color: #2b2926;
}

.title {
  font-size: min(4.6cqw, 8cqh);
  font-weight: 300;
  letter-spacing: 0.6em;
  text-indent: 0.6em;
  color: #6f6a62;
  margin-bottom: 4cqh;
}
.title.solo {
  font-size: min(8cqw, 15cqh);
  font-weight: 200;
  color: #2b2926;
}

.guest {
  font-size: min(10cqw, 18cqh);
  font-weight: 200;
  letter-spacing: 0.08em;
  line-height: 1.25;
  max-width: 84cqw;
  word-break: break-word;
  color: #211f1c;
}

.subtitle {
  margin-top: 3.5cqh;
  font-size: min(3.6cqw, 6.5cqh);
  font-weight: 300;
  letter-spacing: 0.45em;
  text-indent: 0.45em;
  color: #8a847a;
}

.seal {
  margin-top: 5cqh;
  width: min(7cqw, 12cqh);
  height: min(7cqw, 12cqh);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #b3352c;
  color: #faf7f2;
  font-size: min(2.8cqw, 5cqh);
  line-height: 1.3;
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(179, 53, 44, 0.3);
}
/* Latin "WELCOME" needs a narrower face to fit the square stamp */
.seal.latin {
  font-size: min(1.3cqw, 2.3cqh);
  letter-spacing: 0.08em;
  text-indent: 0.08em;
  font-weight: 600;
}

.corner-info {
  position: absolute;
  right: 5.5cqw;
  bottom: 8cqh;
  text-align: right;
}
.clock {
  font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: min(4.2cqw, 7.5cqh);
  font-weight: 300;
  color: #3a3733;
  letter-spacing: 0.05em;
}
.date {
  margin-top: 1.2cqh;
  font-size: min(1.6cqw, 3cqh);
  color: #948d83;
  letter-spacing: 0.1em;
}

.marquee {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6cqh;
  overflow: hidden;
  display: flex;
  align-items: center;
  border-top: 1px solid rgba(60, 50, 40, 0.08);
}
.marquee-track {
  display: inline-flex;
  white-space: nowrap;
  animation: marquee-scroll 28s linear infinite;
  font-size: min(1.9cqw, 3.4cqh);
  color: #6f6a62;
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
