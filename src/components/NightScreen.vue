<script setup lang="ts">
import { computed } from "vue";
import type { WelcomeConfig } from "../../shared/types";
import { resolveLocale } from "../../shared/i18n";
import { formatDate, formatTime, useNow } from "../../shared/time";

const props = defineProps<{ config: WelcomeConfig }>();
const now = useNow();
// Night-screen chrome follows the configured locale ("auto" = the kiosk OS language)
const tplLocale = computed(() => resolveLocale(props.config.settings?.locale));
</script>

<template>
  <div class="night">
    <div class="night-inner">
      <div v-if="config.elements.clock" class="clock">
        {{ formatTime(now, config.settings?.clock, tplLocale) }}
      </div>
      <div v-if="config.elements.date" class="date">
        {{ formatDate(now, tplLocale) }}
      </div>
      <div
        v-if="!config.elements.clock && !config.elements.date"
        class="blank"
      ></div>
    </div>
  </div>
</template>

<style scoped>
/* Night mode: black background with a dim clock to protect the panel */
.night {
  position: absolute;
  inset: 0;
  z-index: 800;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;
}
.night-inner {
  text-align: center;
  animation: night-pulse 8s ease-in-out infinite alternate;
}
.clock {
  font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: min(11cqw, 20cqh);
  font-weight: 300;
  color: rgba(255, 255, 255, 0.32);
  letter-spacing: 0.08em;
}
.date {
  margin-top: 2cqh;
  font-size: min(3cqw, 5.5cqh);
  color: rgba(255, 255, 255, 0.18);
  letter-spacing: 0.14em;
}
@keyframes night-pulse {
  from {
    opacity: 1;
  }
  to {
    opacity: 0.55;
  }
}
</style>
