<script setup lang="ts">
import { computed } from "vue";
import { templateMap } from "../shared/templates";
import type { WelcomeConfig } from "../shared/types";

// Mini live preview: reuses the screen templates; container-query units scale to 16:9
const props = defineProps<{ config: WelcomeConfig }>();

const tpl = computed(
  () => templateMap[props.config.templateId] ?? templateMap["classic-red"],
);
</script>

<template>
  <div class="preview-box">
    <component :is="tpl" :config="config" file-base="" />
  </div>
</template>

<style scoped>
.preview-box {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  overflow: hidden;
  background: #000;
}
</style>
