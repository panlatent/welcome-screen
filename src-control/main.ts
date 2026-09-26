import { createApp } from "vue";
import { loadUiLocale, setLocale } from "../shared/i18n";
import App from "./App.vue";
import "./style.css";

// Apply the remembered (or detected) UI language before mount so the first paint matches
setLocale(loadUiLocale());

createApp(App).mount("#app");
