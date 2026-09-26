// Lightweight i18n core shared by the kiosk screen and the phone control page.
// A module-level reactive locale plus a t() function: templates call t() during
// render, so they re-render automatically when the locale changes.
import { ref } from "vue";
import { zhCN } from "./messages/zh-CN";
import { en } from "./messages/en";

export type Locale = "zh-CN" | "en";
/** Config value for the screen locale: an explicit locale or "auto" (follow the OS) */
export type LocaleSetting = Locale | "auto";
export type MessageKey = keyof typeof zhCN;

const messages: Record<Locale, Record<MessageKey, string>> = {
  "zh-CN": zhCN,
  en,
};

const UI_LOCALE_KEY = "welcome-ui-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "zh-CN" || value === "en";
}

/** Locale guess from the environment (WebView / browser languages) */
export function detectLocale(): Locale {
  const langs =
    typeof navigator !== "undefined"
      ? (navigator.languages ?? [navigator.language])
      : [];
  return langs.some((l) => l?.toLowerCase().startsWith("zh")) ? "zh-CN" : "en";
}

/** Resolve a stored locale setting; anything unknown (incl. "auto") falls back to detection */
export function resolveLocale(setting: string | null | undefined): Locale {
  return isLocale(setting) ? setting : detectLocale();
}

const locale = ref<Locale>(detectLocale());

/** Reactive current locale for template bindings */
export function useLocale() {
  return locale;
}

export function setLocale(next: Locale) {
  locale.value = next;
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
}

/** Translate a key in the current locale, interpolating {placeholder} params */
export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const msg = messages[locale.value][key] ?? key;
  if (!params) return msg;
  return msg.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in params ? String(params[name]) : m,
  );
}

// Control-page UI preference. The kiosk screen locale lives in the config
// (settings.locale) instead, so it deploys together with the rest of the setup.

export function loadUiLocale(): Locale {
  try {
    const stored = localStorage.getItem(UI_LOCALE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* storage unavailable — fall back to detection */
  }
  return detectLocale();
}

export function persistUiLocale(l: Locale) {
  try {
    localStorage.setItem(UI_LOCALE_KEY, l);
  } catch {
    /* storage unavailable — ignore */
  }
}
