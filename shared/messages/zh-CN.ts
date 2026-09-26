// Chinese (Simplified) catalog — the source of truth for message keys.
// en.ts is type-checked against this map, so a missing key fails the build.

export const zhCN = {
  // App chrome
  "app.title.screen": "欢迎屏",
  "app.title.control": "欢迎屏控制端",
  "header.screen": "大屏",
  "status.online": "在线",
  "status.offline": "已离线",

  // Page states
  "view.loading": "正在连接大屏…",
  "view.unauthorizedTitle": "连接已失效",
  "view.unauthorizedBody1": "连接令牌不正确或已被重置。",
  "view.unauthorizedBody2": "请在大屏底角长按呼出二维码，重新扫码进入。",
  "view.errorTitle": "无法连接大屏",
  "view.errorHint":
    "请确认手机与大屏在同一网络。部分公司 Wi-Fi 开启了隔离，需联系 IT 放行。",
  "view.retry": "重新连接",

  // Draft restore
  "draft.detected": "检测到未保存的草稿",
  "draft.restore": "恢复",
  "draft.discard": "丢弃",
  "draft.restored": "已恢复草稿",

  // Live preview
  "preview.title": "实时预览",
  "preview.tip": "预览与实际画面等比，最终以大屏显示为准",

  // Greeting card
  "greeting.title": "欢迎词",
  "greeting.recent": "最近使用",
  "greeting.noSubject": "（无主体）",
  "greeting.titleLabel": "引导语",
  "greeting.titlePlaceholder": "如：热烈欢迎",
  "greeting.guestLabel": "主体名称（人名/单位）",
  "greeting.guestPlaceholder": "如：张三一行",
  "greeting.subtitleLabel": "结束语",
  "greeting.subtitlePlaceholder": "如：莅临参观指导",

  // Template picker
  "template.title": "画面模板",
  "template.classicRed.name": "红金典雅",
  "template.classicRed.desc": "庄重喜庆 · 政务接待",
  "template.techBlue.name": "深蓝科技",
  "template.techBlue.desc": "现代科技 · 企业展厅",
  "template.minimalWhite.name": "简约白",
  "template.minimalWhite.desc": "简约纯净 · 日常使用",

  // Background card
  "background.title": "背景图片",
  "background.alt": "背景预览",
  "background.default": "使用模板默认背景",
  "background.upload": "上传背景图",
  "background.reset": "恢复默认",
  "background.tip": "上传后自动压缩到 4K 以内，保存后立即在大屏生效",

  // Logo card
  "logo.title": "企业 Logo",
  "logo.alt": "Logo 预览",
  "logo.empty": "未设置 Logo",
  "logo.upload": "上传 Logo",
  "logo.remove": "移除",
  "logo.tip": "建议使用透明背景 PNG",

  "upload.progress": "上传中 {n}%",

  // Display elements card
  "elements.title": "显示元素",
  "elements.clock": "时钟",
  "elements.clockFormat": "时钟制式",
  "elements.24h": "24 小时制",
  "elements.12h": "12 小时制（上午/下午）",
  "elements.showSeconds": "时钟显示秒",
  "elements.date": "日期",
  "elements.marquee": "滚动字幕（留空关闭）",
  "elements.marqueePlaceholder": "屏幕底部循环滚动的内容",
  "elements.speed": "字幕速度",
  "speed.slow": "慢",
  "speed.normal": "正常",
  "speed.fast": "快",

  // Screen & security card
  "security.title": "屏幕与安全",
  "security.language": "屏幕显示语言",
  "security.languageTip": "控制大屏上日期、二维码提示等界面文字的语言",
  "lang.auto": "跟随系统",
  "lang.zhCN": "简体中文",
  "lang.en": "English",
  "security.qrIp": "大屏二维码 IP（多网卡时选择手机可达的地址）",
  "security.ipAuto": "自动选择",
  "security.accessIp":
    "当前访问地址：{ip}。若其他手机扫码连不上，换一个 IP 再保存。",
  "security.corner": "二维码呼出角落（长按 {n} 秒）",
  "security.cornerBottomRight": "右下角",
  "security.cornerBottomLeft": "左下角",
  "security.holdSeconds": "长按秒数（1–5，0.5 秒步进，越长越防误触）",
  "security.displaySeconds": "二维码显示时长（秒，10–120）",
  "security.autoStart": "开机自动启动",
  "security.nightMode": "夜间息屏",
  "security.nightEnable": "启用夜间时段（大屏进入暗态）",
  "security.nightStart": "开始",
  "security.nightEnd": "结束（次日）",
  "security.showQr": "在大屏显示二维码",
  "security.showQrDone": "已在大屏显示二维码",
  "security.resetToken": "重置连接令牌",
  "security.resetTokenConfirm":
    "重置后当前二维码与链接全部失效，其他已连接的手机将断开。确定重置？",
  "security.resetTokenDone": "连接令牌已重置，请重新扫码连接其他手机",
  "security.currentConnection": "当前连接：{url}",

  // Config management card
  "config.title": "配置管理",
  "config.export": "导出配置",
  "config.import": "导入配置",
  "config.imported": "已导入，请检查后点击保存",
  "config.invalidFile": "配置文件格式不正确",
  "config.resetDefaults": "恢复默认设置",
  "config.resetConfirm":
    "画面与显示设置将全部恢复为默认（保留开机自启与二维码设置），并立即保存生效。确定？",
  "config.resetTip": "重置不影响开机自启、二维码与连接设置",
  "config.tip": "导出的配置文件可用于在其他大屏上快速导入同样设置",

  // Welcome profiles card
  "profile.title": "欢迎方案",
  "profile.tip":
    "保存多套欢迎画面，一键切换。方案包含模板、欢迎词、背景、Logo 与显示元素；语言、网络等设备设置保持不变。",
  "profile.empty": "还没有保存的方案",
  "profile.active": "使用中",
  "profile.apply": "应用",
  "profile.rename": "重命名",
  "profile.renamed": "方案已重命名为「{name}」",
  "profile.update": "更新",
  "profile.delete": "删除",
  "profile.saveAs": "保存为方案",
  "profile.namePrompt": "方案名称",
  "profile.nameDefault": "方案 {n}",
  "profile.applied": "已切换到「{name}」",
  "profile.saved": "方案「{name}」已保存",
  "profile.updated": "方案「{name}」已更新",
  "profile.deleted": "方案已删除",
  "profile.updateConfirm": "将用当前编辑内容覆盖方案「{name}」？",
  "profile.deleteConfirm": "确定删除方案「{name}」？删除后不可恢复。",
  "profile.nameRequired": "请输入方案名称",
  "profile.dirtyConfirm":
    "当前有未保存的修改，切换方案将放弃这些修改。确定切换？",

  // Save bar
  "save.saving": "保存中…",
  "save.apply": "保存并生效",
  "save.applyDirty": "保存并生效 ●",
  "save.saved": "已保存，大屏已生效",
  "save.failed": "保存失败",

  // API / network errors
  "error.noToken": "链接缺少连接令牌，请从大屏上的二维码重新扫码进入。",
  "error.connect": "无法连接大屏",
  "error.request": "请求失败（{status}）",
  "error.upload": "上传失败（{status}）",
  "error.uploadFailed": "上传失败",
  "error.uploadInterrupted": "网络错误，上传中断",
  "error.imageProcess": "无法处理图片",
  "error.imageCompress": "图片压缩失败",
  "error.unauthorized": "连接已失效",

  // QR overlay (kiosk screen)
  "qr.setupTitle": "首次部署 · 请扫码连接控制端",
  "qr.setupSub":
    "用手机（与大屏同一网络）扫码完成初始配置，配置完成后此页面自动消失。若屏幕同时接入多个网络，请扫描与手机同网段的地址。",
  "qr.connectTitle": "扫码连接手机控制端",
  "qr.autoClose": "{n} 秒后自动关闭 · 点击空白处关闭",
  "qr.openLocal": "在本机浏览器打开",
  "qr.openFailed": "打开失败",
} as const;

/** Shape every catalog must satisfy (keys from zh-CN, string values) */
export type Messages = Record<keyof typeof zhCN, string>;
