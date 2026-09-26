// Data model shared by the screen and the control page; mirrors the Rust structs in src-tauri/src/config.rs.
import type { Locale, LocaleSetting, MessageKey } from "./i18n";

export interface WelcomeText {
  title: string;
  guest: string;
  subtitle: string;
}

export interface Elements {
  clock: boolean;
  date: boolean;
  /** Scrolling marquee; empty string disables it */
  marquee: string;
}

export type SummonCorner = "bottom-left" | "bottom-right";
export type ClockFormat = "24h" | "12h";
export type MarqueeSpeed = "slow" | "normal" | "fast";

export interface QrSettings {
  summonCorner: SummonCorner;
  /** Seconds before the QR overlay auto-hides (10–120) */
  displaySeconds: number;
  /** Long-press seconds required to summon the QR overlay (1–5 in 0.5 steps) */
  holdSeconds: number;
}

export interface ClockSettings {
  format: ClockFormat;
  showSeconds: boolean;
}

export interface ScheduleSettings {
  /** Night mode: the screen dims during this period */
  enabled: boolean;
  /** Start time (HH:MM) */
  start: string;
  /** End time (HH:MM, may cross midnight, e.g. 22:00 → 07:00) */
  end: string;
}

export interface NetworkSettings {
  /** Screen IP used in QR URLs; empty = auto. Pick manually with multiple NICs */
  ip: string;
}

export interface Settings {
  autoStart: boolean;
  /** Setup mode: when false the QR overlay stays on screen until the first config save */
  setupDone: boolean;
  /** Language of on-screen chrome (dates, QR prompts): an explicit locale or "auto" (follow the OS) */
  locale: LocaleSetting;
  clock: ClockSettings;
  marqueeSpeed: MarqueeSpeed;
  schedule: ScheduleSettings;
  network: NetworkSettings;
  qr: QrSettings;
}

export interface WelcomeConfig {
  templateId: string;
  welcome: WelcomeText;
  /** Uploaded background as a relative path (files/xxx.jpg); empty = template default */
  background: string;
  /** Uploaded logo as a relative path; empty = none */
  logo: string;
  elements: Elements;
  settings: Settings;
}

/** Appearance-only subset of WelcomeConfig captured by a profile. Activating a
 * profile swaps these fields; all settings.* stay as the device's current values. */
export interface ProfileContent {
  templateId: string;
  welcome: WelcomeText;
  background: string;
  logo: string;
  elements: Elements;
}

/** Profile list entry (content is only needed when activating, server-side) */
export interface ProfileMeta {
  id: string;
  name: string;
  /** Epoch milliseconds */
  savedAt: number;
}

export interface ProfilesInfo {
  /** Profile the live config was last activated from; null after a manual save */
  activeId: string | null;
  profiles: ProfileMeta[];
}

export interface TemplateMeta {
  id: string;
  /** i18n message keys for the control-page picker */
  nameKey: MessageKey;
  descKey: MessageKey;
  swatch: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "classic-red",
    nameKey: "template.classicRed.name",
    descKey: "template.classicRed.desc",
    swatch: "linear-gradient(135deg, #a4161a 0%, #660708 100%)",
  },
  {
    id: "tech-blue",
    nameKey: "template.techBlue.name",
    descKey: "template.techBlue.desc",
    swatch: "linear-gradient(135deg, #0b2447 0%, #19376d 60%, #576cbc 100%)",
  },
  {
    id: "minimal-white",
    nameKey: "template.minimalWhite.name",
    descKey: "template.minimalWhite.desc",
    swatch: "linear-gradient(135deg, #faf7f2 0%, #e8e2d8 100%)",
  },
];

export const MARQUEE_DURATION: Record<MarqueeSpeed, string> = {
  slow: "40s",
  normal: "28s",
  fast: "18s",
};

export function defaultConfig(): WelcomeConfig {
  return {
    templateId: "classic-red",
    welcome: defaultWelcomeText("zh-CN"),
    background: "",
    logo: "",
    elements: { clock: true, date: true, marquee: "" },
    settings: {
      autoStart: false,
      setupDone: false,
      locale: "auto",
      clock: { format: "24h", showSeconds: false },
      marqueeSpeed: "normal",
      schedule: { enabled: false, start: "22:00", end: "07:00" },
      network: { ip: "" },
      qr: {
        summonCorner: "bottom-right",
        displaySeconds: 30,
        holdSeconds: 1.5,
      },
    },
  };
}

/** Locale-specific default greeting. The Rust side defaults to the zh-CN variant,
 * so fresh configs read back from the server carry Chinese until the first save. */
export function defaultWelcomeText(locale: Locale): WelcomeText {
  return locale === "en"
    ? { title: "Welcome", guest: "", subtitle: "Thank you for visiting" }
    : { title: "热烈欢迎", guest: "", subtitle: "莅临参观指导" };
}

export interface ConnectionInfo {
  ip: string;
  port: number;
  /** All usable local IPv4 addresses */
  ips: string[];
  token: string;
  controlUrl: string;
}

export interface MetaIp {
  name: string;
  addr: string;
}

export interface MetaInfo {
  ip: string;
  port: number;
  url: string;
  version: string;
  ips: MetaIp[];
}
