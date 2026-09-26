import type { Component } from "vue";
import ClassicRed from "./ClassicRed.vue";
import TechBlue from "./TechBlue.vue";
import MinimalWhite from "./MinimalWhite.vue";

// Built-in templates. Styles use container-query units so the same component
// renders fullscreen and scaled down in the control-page 16:9 preview.
export const templateMap: Record<string, Component> = {
  "classic-red": ClassicRed,
  "tech-blue": TechBlue,
  "minimal-white": MinimalWhite,
};
