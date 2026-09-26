// Clock/date formatting and night-window checks, shared by screen and control preview.
import { onUnmounted, ref } from "vue";
import type { Locale } from "./i18n";
import type { ClockSettings, ScheduleSettings } from "./types";

/** Ticking current time (1 Hz) for clock, date, and night-window checks */
export function useNow() {
  const now = ref(new Date());
  const timer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
  onUnmounted(() => window.clearInterval(timer));
  return now;
}

const WEEKDAYS: Record<Locale, readonly string[]> = {
  "zh-CN": ["日", "一", "二", "三", "四", "五", "六"],
  en: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
};
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatTime(
  d: Date,
  clock?: ClockSettings,
  locale: Locale = "zh-CN",
): string {
  const showSeconds = clock?.showSeconds ?? false;
  const seconds = showSeconds
    ? `:${String(d.getSeconds()).padStart(2, "0")}`
    : "";
  if (clock?.format === "12h") {
    const h24 = d.getHours();
    const h12 = h24 % 12 || 12;
    const mm = String(d.getMinutes()).padStart(2, "0");
    if (locale === "en") {
      return `${h12}:${mm}${seconds} ${h24 >= 12 ? "PM" : "AM"}`;
    }
    return `${h24 >= 12 ? "下午" : "上午"} ${h12}:${mm}${seconds}`;
  }
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}${seconds}`;
}

export function formatDate(d: Date, locale: Locale = "zh-CN"): string {
  if (locale === "en") {
    return `${WEEKDAYS.en[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS["zh-CN"][d.getDay()]}`;
}

/** Night-window check; start > end means an overnight range, equal start/end disables */
export function isNightTime(d: Date, s: ScheduleSettings | undefined): boolean {
  if (!s?.enabled || !s.start || !s.end || s.start === s.end) return false;
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
    if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
    return h * 60 + m;
  };
  const start = toMin(s.start);
  const end = toMin(s.end);
  if (start < 0 || end < 0) return false;
  const cur = d.getHours() * 60 + d.getMinutes();
  return start < end ? cur >= start && cur < end : cur >= start || cur < end;
}
