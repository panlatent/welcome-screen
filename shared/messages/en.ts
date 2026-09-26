// English catalog — must cover every key defined in zh-CN.ts (checked at compile time).
import type { Messages } from "./zh-CN";

export const en: Messages = {
  // App chrome
  "app.title.screen": "Welcome Screen",
  "app.title.control": "Welcome Screen Control",
  "header.screen": "Screen",
  "status.online": "Online",
  "status.offline": "Offline",

  // Page states
  "view.loading": "Connecting to the screen…",
  "view.unauthorizedTitle": "Connection Expired",
  "view.unauthorizedBody1":
    "The connection token is incorrect or has been reset.",
  "view.unauthorizedBody2":
    "Long-press the bottom corner of the screen for {n} s to summon the QR code, then scan it again.",
  "view.errorTitle": "Cannot connect to the screen",
  "view.errorHint":
    "Make sure the phone and the screen are on the same network. Some corporate Wi-Fi networks enable client isolation — ask IT to allow the connection.",
  "view.retry": "Retry",

  // Draft restore
  "draft.detected": "Unsaved draft detected",
  "draft.restore": "Restore",
  "draft.discard": "Discard",
  "draft.restored": "Draft restored",

  // Live preview
  "preview.title": "Live Preview",
  "preview.tip":
    "The preview is proportional to the actual display; the screen itself is authoritative",

  // Greeting card
  "greeting.title": "Greeting",
  "greeting.recent": "Recent",
  "greeting.noSubject": "(no guest)",
  "greeting.titleLabel": "Headline",
  "greeting.titlePlaceholder": "e.g. Warmly Welcome",
  "greeting.guestLabel": "Guest (person / company)",
  "greeting.guestPlaceholder": "e.g. Mr. Smith & party",
  "greeting.subtitleLabel": "Closing line",
  "greeting.subtitlePlaceholder": "e.g. Thank you for visiting",

  // Template picker
  "template.title": "Screen Template",
  "template.classicRed.name": "Classic Red & Gold",
  "template.classicRed.desc": "Ceremonial · Official receptions",
  "template.techBlue.name": "Tech Blue",
  "template.techBlue.desc": "Modern · Corporate showrooms",
  "template.minimalWhite.name": "Minimal White",
  "template.minimalWhite.desc": "Clean & simple · Everyday use",

  // Background card
  "background.title": "Background Image",
  "background.alt": "Background preview",
  "background.default": "Using the template default background",
  "background.upload": "Upload Background",
  "background.reset": "Use Default",
  "background.tip":
    "Images are auto-compressed to ≤4K on upload and take effect on the screen once saved",

  // Logo card
  "logo.title": "Company Logo",
  "logo.alt": "Logo preview",
  "logo.empty": "No logo set",
  "logo.upload": "Upload Logo",
  "logo.remove": "Remove",
  "logo.tip": "A transparent PNG works best",

  "upload.progress": "Uploading {n}%",

  // Display elements card
  "elements.title": "Display Elements",
  "elements.clock": "Clock",
  "elements.clockFormat": "Clock format",
  "elements.24h": "24-hour",
  "elements.12h": "12-hour (AM/PM)",
  "elements.showSeconds": "Show seconds",
  "elements.date": "Date",
  "elements.marquee": "Marquee (empty = off)",
  "elements.marqueePlaceholder":
    "Text scrolling along the bottom of the screen",
  "elements.speed": "Marquee speed",
  "speed.slow": "Slow",
  "speed.normal": "Normal",
  "speed.fast": "Fast",

  // Screen & security card
  "security.title": "Screen & Security",
  "security.language": "Screen language",
  "security.languageTip":
    "Language of on-screen chrome such as dates and QR prompts",
  "lang.auto": "Follow system",
  "lang.zhCN": "简体中文",
  "lang.en": "English",
  "security.qrIp":
    "Screen QR IP (with multiple adapters, pick one the phone can reach)",
  "security.ipAuto": "Select automatically",
  "security.accessIp":
    "Current access address: {ip}. If other phones fail to connect after scanning, pick another IP and save.",
  "security.corner": "QR summon corner (long-press {n} s)",
  "security.cornerBottomRight": "Bottom-right",
  "security.cornerBottomLeft": "Bottom-left",
  "security.holdSeconds": "Long-press seconds (1–5; longer resists mis-taps)",
  "security.displaySeconds": "QR display duration (s, 10–120)",
  "security.autoStart": "Start automatically on boot",
  "security.nightMode": "Night Mode",
  "security.nightEnable": "Enable night hours (the screen dims)",
  "security.nightStart": "Start",
  "security.nightEnd": "End (next day)",
  "security.showQr": "Show QR on the screen",
  "security.showQrDone": "QR shown on the screen",
  "security.resetToken": "Reset connection token",
  "security.resetTokenConfirm":
    "Resetting invalidates the current QR code and links; other connected phones will be disconnected. Reset?",
  "security.resetTokenDone":
    "Connection token reset — re-scan to reconnect other phones",
  "security.currentConnection": "Current connection: {url}",

  // Config management card
  "config.title": "Config Management",
  "config.export": "Export config",
  "config.import": "Import config",
  "config.imported": "Imported — review and tap Save",
  "config.invalidFile": "Invalid config file",
  "config.resetDefaults": "Reset Display Settings",
  "config.resetConfirm":
    "Restores all display defaults (keeping auto-start and the token) and saves immediately. Continue?",
  "config.tip":
    "Exported configs can be imported on other screens to replicate this setup",

  // Save bar
  "save.saving": "Saving…",
  "save.apply": "Save & Apply",
  "save.applyDirty": "Save & Apply ●",
  "save.saved": "Saved — applied to the screen",
  "save.failed": "Save failed",

  // API / network errors
  "error.noToken":
    "The link is missing a connection token — re-scan the QR code on the screen.",
  "error.connect": "Cannot connect to the screen",
  "error.request": "Request failed ({status})",
  "error.upload": "Upload failed ({status})",
  "error.uploadFailed": "Upload failed",
  "error.uploadInterrupted": "Network error — upload interrupted",
  "error.imageProcess": "Cannot process the image",
  "error.imageCompress": "Image compression failed",
  "error.unauthorized": "Connection expired",

  // QR overlay (kiosk screen)
  "qr.setupTitle": "First-time setup · Scan to connect the control page",
  "qr.setupSub":
    "Scan with a phone on the same network as the screen to finish the initial setup; this page disappears once configured. If the screen is connected to several networks, scan the address on the same subnet as your phone.",
  "qr.connectTitle": "Scan to connect the phone control page",
  "qr.autoClose": "Closes in {n} s · tap outside to close",
};
