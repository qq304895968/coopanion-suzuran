var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __glob = (map) => (path) => {
  var fn = map[path];
  if (fn) return fn();
  throw new Error("Module not found in bundle: " + path);
};
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/zh.js
var zh_exports = {};
__export(zh_exports, {
  default: () => zh_default
});
var zh_default;
var init_zh = __esm({
  "D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/zh.js"() {
    zh_default = {
      // 桌宠页
      "pet.title": "Cortico \u684C\u5BA0",
      "bubble.close": "\u5173\u95ED",
      /** 引导等多步对话右上角的关闭按钮 */
      "bubble.skip": "\u8DF3\u8FC7",
      "bubble.ownPlaceholder": "\u8F93\u5165\u4F60\u7684\u56DE\u7B54\u2026",
      "bubble.ownLabel": "\u81EA\u884C\u586B\u5199\u56DE\u7B54",
      "bubble.send": "\u53D1\u9001",
      /** 输入 Key 时显示明文的按钮 */
      "bubble.peek": "\u663E\u793A",
      "bubble.typePlaceholder": "\u8F93\u5165\u60F3\u8BF4\u7684\u8BDD\u2026",
      "bubble.typeLabel": "\u6253\u5B57\u8BF4\u8BDD",
      /** 打字气泡里把草稿带到设置窗口「对话」页的按钮 */
      "bubble.expand": "\u5728\u5BF9\u8BDD\u9875\u7EE7\u7EED\u7F16\u8F91",
      "bubble.removeImage": "\u79FB\u9664\u56FE\u7247",
      "bubble.tooManyImages": "\u6253\u5B57\u6846\u6700\u591A\u653E {max} \u5F20\u56FE",
      "bubble.imageUnreadable": "\u65E0\u6CD5\u8BFB\u53D6\u8FD9\u5F20\u56FE\u7247",
      "bubble.imageTooLarge": "\u8FD9\u5F20\u56FE\u7247\u7F29\u5C0F\u540E\u4ECD\u8D85\u8FC7 {mb}MB",
      "bubble.imagesUnseen": "\u73B0\u5728\u7684\u6A21\u578B\u770B\u4E0D\u5230\u56FE\u7247\uFF0C{bot} \u53EA\u4F1A\u77E5\u9053\u4F60\u53D1\u4E86\u51E0\u5F20\u56FE\u3002",
      // 你说的话:语音识别中的样子;对话页发来的消息附的图片数
      "heard.more": "\u6B63\u5728\u503E\u542C\u2026",
      "heard.listening": "\u6B63\u5728\u503E\u542C\u2026",
      "heard.cancel": "\u53D6\u6D88",
      "said.images": "\u56FE\u7247 \xD7{count}",
      // 状态气泡:同一类事做了好几次时接在后面
      "status.more": " \u548C\u53E6\u5916 {others} \u4E2A",
      "status.thinking": "\u601D\u8003\u4E2D",
      // 菜单与悬停按钮的说明
      "roam.off": "\u4E0D\u4E71\u52A8",
      "roam.calm": "\u591A\u5F85\u7740",
      "roam.free": "\u5E38\u8D70\u52A8",
      "action.chat": "\u6253\u5B57\u5BF9\u8BDD",
      "action.chatDoubleClick": "\u6253\u5B57\u5BF9\u8BDD\uFF08\u4E5F\u53EF\u53CC\u51FB\u684C\u5BA0\uFF09",
      "action.voiceOff": "\u8BED\u97F3\u8F93\u5165\uFF1A\u5DF2\u5173\u95ED \xB7 \u70B9\u51FB\u5F00\u542F",
      "action.voiceNotReady": "\u8BED\u97F3\u8F93\u5165\uFF1A\u5DF2\u5F00\u542F\uFF0C\u4F46{detail} \xB7 \u70B9\u51FB\u5173\u95ED",
      "action.voiceNoService": "\u8BC6\u522B\u670D\u52A1\u6CA1\u6709\u5C31\u7EEA",
      "action.voiceOn": "\u8BED\u97F3\u8F93\u5165\uFF1A\u5DF2\u5F00\u542F\uFF08{mode}\uFF09\xB7 {hint}",
      "action.voiceAlways": "\u81EA\u52A8\u6536\u97F3",
      "action.voiceKey": "\u6309\u952E\u6536\u97F3",
      "action.roam": "\u8D70\u52A8\uFF1A{name} \xB7 \u70B9\u51FB\u5207\u6362\u4E3A\u300C{next}\u300D",
      "action.themeDark": "\u591C\u95F4\u6A21\u5F0F\uFF1A\u5DF2\u5F00\u542F \xB7 \u70B9\u51FB\u5173\u95ED",
      "action.themeLight": "\u591C\u95F4\u6A21\u5F0F\uFF1A\u5DF2\u5173\u95ED \xB7 \u70B9\u51FB\u5F00\u542F",
      "action.soundOn": "\u97F3\u6548\uFF1A\u5DF2\u5F00\u542F \xB7 \u70B9\u51FB\u5173\u95ED",
      "action.soundOff": "\u97F3\u6548\uFF1A\u5DF2\u5173\u95ED \xB7 \u70B9\u51FB\u5F00\u542F",
      "action.dress": "\u88C5\u626E",
      "action.hide": "\u9690\u85CF\u684C\u5BA0\uFF08\u53EF\u4ECE\u6258\u76D8\u56FE\u6807\u91CD\u65B0\u663E\u793A\uFF09",
      "menu.cancel": "\u53D6\u6D88",
      "menu.resume": "\u7EE7\u7EED",
      "menu.pause": "\u6682\u505C",
      "menu.settings": "\u6253\u5F00\u8BBE\u7F6E",
      "theme.toLight": "\u5207\u6362\u4E3A\u767D\u5929\u6A21\u5F0F",
      "theme.toDark": "\u5207\u6362\u4E3A\u591C\u95F4\u6A21\u5F0F",
      // 桌宠窗口单独运行时托盘图标的菜单
      "host.show": "\u663E\u793A\u684C\u5BA0",
      "host.hide": "\u9690\u85CF\u684C\u5BA0",
      "host.dress": "\u88C5\u626E\u2026",
      "host.close": "\u5173\u95ED\u684C\u5BA0\u7A97\u53E3",
      // 形象包加载失败的原因(会告诉 bot)
      "figure.notInstalled": "\u6CA1\u6709\u88C5\u8FD9\u4E2A\u5F62\u8C61",
      "figure.notReady": "\u5F62\u8C61 {seconds} \u79D2\u5185\u6CA1\u6709\u51C6\u5907\u597D",
      "figure.imageFailed": "\u56FE\u7247\u6CA1\u52A0\u8F7D\u51FA\u6765:{url}",
      "figure.notFunction": "{name} \u4E0D\u662F\u51FD\u6570",
      "figure.missingMethod": "\u5F62\u8C61\u6CA1\u6709 {name}",
      // 装扮页
      "dress.title": "\u684C\u5BA0\u88C5\u626E",
      "dress.preview": "\u9884\u89C8",
      "dress.figure": "\u5F62\u8C61",
      "dress.palette": "\u914D\u8272",
      "dress.head": "\u5934\u9876",
      "dress.side": "\u914D\u4EF6",
      "dress.glasses": "\u773C\u955C",
      "dress.neck": "\u9888\u9970",
      "dress.saved": "\u5DF2\u4FDD\u5B58",
      "dress.notSaved": "\u4FDD\u5B58\u5931\u8D25",
      "dress.offline": "\u4FDD\u5B58\u5931\u8D25\uFF1A\u65E0\u6CD5\u8FDE\u63A5\u684C\u5BA0\u670D\u52A1",
      /** 配件的两个颜色通道 */
      "dress.main": "\u4E3B\u8272",
      "dress.accent": "\u70B9\u7F00",
      "dress.colorOf": "{channel}\uFF1A{color}",
      "dress.dropHint": "\u677E\u5F00\u4EE5\u5BFC\u5165\u5F62\u8C61\u5305",
      "color.body": "\u8DDF\u968F\u8EAB\u4F53",
      "color.eye": "\u8DDF\u968F\u773C\u775B",
      "color.mint": "\u8584\u8377\u7EFF",
      "color.leaf": "\u53F6\u7EFF",
      "color.lemon": "\u67E0\u6AAC\u9EC4",
      "color.fox": "\u7EA2\u72D0\u72F8",
      "color.claude": "\u514B\u52B3\u5FB7",
      "color.rose": "\u6A31\u7C89",
      "color.purple": "\u865A\u5F0F\u8308",
      "color.navigator": "\u9886\u822A\u5458",
      "color.holo": "\u5168\u606F\u84DD",
      // 装扮页:导入形象包
      "import.button": "\u5BFC\u5165",
      "import.replaceTitle": "\u66FF\u6362\u5DF2\u6709\u7684\u5F62\u8C61\u5305\uFF1F",
      "import.replaceText": "\u66FF\u6362\u4F1A\u5220\u9664\u5B89\u88C5\u76EE\u5F55\u4E2D\u8FD9\u4E9B\u5F62\u8C61\u5305\u7684\u539F\u6709\u6587\u4EF6\u3002",
      "import.replace": "\u66FF\u6362",
      "import.title": "\u5BFC\u5165\u5F62\u8C61\u5305",
      "import.unloaded": "\u6709 {n} \u4E2A\u5F62\u8C61\u5305\u6CA1\u52A0\u8F7D",
      /** 文件夹名与原因之间 */
      "import.reason": "\uFF1A{reason}",
      "import.ok": "\u786E\u5B9A",
      "import.cancel": "\u53D6\u6D88",
      "import.noneTitle": "\u6CA1\u6709\u627E\u5230\u5F62\u8C61\u5305",
      "import.noneText": "\u6240\u9009\u4F4D\u7F6E\u5F80\u4E0B {depth} \u5C42\u5185\u6CA1\u6709 figure.json\u3002",
      "import.tooBigTitle": "\u6587\u4EF6\u8FC7\u5927",
      "import.tooBigText": "\u5355\u6B21\u6700\u591A\u5BFC\u5165 {max}\uFF0C\u672C\u6B21\u4E3A {size}\u3002",
      "import.reading": "\u6B63\u5728\u8BFB\u53D6\u2026",
      "import.failed": "\u5BFC\u5165\u5931\u8D25",
      "import.offline": "\u65E0\u6CD5\u8FDE\u63A5\u684C\u5BA0\u670D\u52A1\u3002",
      "import.found": "\u627E\u5230 {n} \u4E2A\u5F62\u8C61\u5305",
      "import.allBad": "\u8FD9\u4E9B\u5F62\u8C61\u5305\u65E0\u6CD5\u5BFC\u5165",
      "import.version": "\u7248\u672C {version}",
      "import.contents": "{axes} \u7EC4\u6253\u626E\u3001{words} \u4E2A\u8868\u60C5\u548C\u52A8\u4F5C\u3001{sounds} \u4E2A\u97F3\u6548",
      "import.credit": "{role}\uFF1A{name}",
      "import.creditSep": "\uFF1B",
      "import.reinstall": "\u5DF2\u5B89\u88C5 {version}\uFF0C\u5C06\u91CD\u65B0\u5B89\u88C5",
      "import.upgrade": "\u5DF2\u5B89\u88C5 {installed}\uFF0C\u5C06\u66F4\u65B0\u4E3A {version}",
      "import.skipped": "{n} \u9879\u5185\u5BB9\u5F53\u524D\u7248\u672C\u4E0D\u652F\u6301",
      "import.someBad": "\u4EE5\u4E0B\u5185\u5BB9\u65E0\u6CD5\u5BFC\u5165\uFF1A",
      "import.pickedLevel": "\u6240\u9009\u7684\u90A3\u4E00\u5C42",
      "import.done": "\u5DF2\u5BFC\u5165\uFF1A{names}",
      "import.nameSep": "\u3001",
      "import.replacing": "\u3002\u6B63\u5728\u4F7F\u7528\u7684\u5F62\u8C61\u5C06\u5728\u4E0B\u6B21\u8F7D\u5165\u65F6\u66F4\u65B0",
      "import.lead": "\u9009\u62E9 figure.json \u6240\u5728\u7684\u6587\u4EF6\u5939\uFF0C\u6216\u5305\u542B\u5B83\u7684 zip \u538B\u7F29\u6587\u4EF6\u3002",
      "import.pickZip": "\u9009\u62E9 zip \u6587\u4EF6",
      "import.pickDir": "\u9009\u62E9\u6587\u4EF6\u5939",
      "import.dropNote": "\u4E5F\u53EF\u4EE5\u76F4\u63A5\u62D6\u5165\u3002",
      "import.cannot": "\u65E0\u6CD5\u5BFC\u5165",
      "import.dropOne": "\u6BCF\u6B21\u53EA\u80FD\u62D6\u5165\u4E00\u4E2A zip\uFF0C\u6216\u62D6\u5165\u6587\u4EF6\u5939\u3002",
      "import.readFailed": "\u8BFB\u53D6\u5931\u8D25",
      // 装扮页:卸载形象包
      "remove.label": "\u5378\u8F7D\u300C{name}\u300D",
      "remove.title": "\u5378\u8F7D\u300C{name}\u300D\uFF1F",
      "remove.lead": "\u8FD9\u4E2A\u5F62\u8C61\u5305\u7684\u6587\u4EF6\u4F1A\u88AB\u5220\u9664\uFF0C\u518D\u6B21\u4F7F\u7528\u9700\u8981\u91CD\u65B0\u5BFC\u5165\u3002\u684C\u5BA0\u6B63\u5728\u4F7F\u7528\u5B83\u65F6\u4F1A\u6362\u56DE Coo\u3002",
      "remove.go": "\u5378\u8F7D",
      "remove.failed": "\u5378\u8F7D\u5931\u8D25",
      "remove.done": "\u5DF2\u5378\u8F7D\uFF1A{name}"
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/en.js
var en_exports = {};
__export(en_exports, {
  default: () => en_default
});
var en_default;
var init_en = __esm({
  "D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/en.js"() {
    en_default = {
      // the pet page
      "pet.title": "Cortico Pet",
      "bubble.close": "Close",
      /** The close button at the top of a conversation in steps, such as the introduction. */
      "bubble.skip": "Skip",
      "bubble.ownPlaceholder": "Type your answer\u2026",
      "bubble.ownLabel": "Write your own answer",
      "bubble.send": "Send",
      /** The button that shows a key as typed. */
      "bubble.peek": "Show",
      "bubble.typePlaceholder": "Type a message\u2026",
      "bubble.typeLabel": "Type to talk",
      /** The typing bubble's button that carries the draft to the Chat page in the settings window. */
      "bubble.expand": "Continue on the Chat page",
      /** Pictures pasted into the typing box: the remove button on a thumbnail, and the notes below the box. */
      "bubble.removeImage": "Remove image",
      "bubble.tooManyImages": "The box holds at most {max} images",
      "bubble.imageUnreadable": "This image could not be read",
      "bubble.imageTooLarge": "This image still exceeds {mb}MB after resizing",
      "bubble.imagesUnseen": "The current model cannot see images; {bot} only learns how many you sent.",
      // what the person said: a sentence being heard; how many images a chat-page message carries
      "heard.more": "Listening\u2026",
      "heard.listening": "Listening\u2026",
      "heard.cancel": "Cancel",
      "said.images": "Images \xD7{count}",
      // the status bubble: added when the same kind of thing was done several times
      "status.more": " and {others} more",
      "status.thinking": "Thinking",
      // the menu and the hover buttons
      "roam.off": "Stay put",
      "roam.calm": "Now and then",
      "roam.free": "Often",
      "action.chat": "Type a message",
      "action.chatDoubleClick": "Type a message (or double-click the pet)",
      "action.voiceOff": "Voice input: off \xB7 click to turn on",
      "action.voiceNotReady": "Voice input: on, but {detail} \xB7 click to turn off",
      "action.voiceNoService": "speech recognition is not ready",
      "action.voiceOn": "Voice input: on ({mode}) \xB7 {hint}",
      "action.voiceAlways": "always listening",
      "action.voiceKey": "talk key",
      "action.roam": 'Walking: {name} \xB7 click to switch to "{next}"',
      "action.themeDark": "Night mode: on \xB7 click to turn off",
      "action.themeLight": "Night mode: off \xB7 click to turn on",
      "action.soundOn": "Sounds: on \xB7 click to turn off",
      "action.soundOff": "Sounds: off \xB7 click to turn on",
      "action.dress": "Dress up",
      "action.hide": "Hide the pet (show Coo again from the tray icon)",
      "menu.cancel": "Cancel",
      "menu.resume": "Resume",
      "menu.pause": "Pause",
      "menu.settings": "Open settings",
      "theme.toLight": "Switch to day mode",
      "theme.toDark": "Switch to night mode",
      // the tray icon's menu while the pet window runs on its own
      "host.show": "Show pet",
      "host.hide": "Hide pet",
      "host.dress": "Dress up\u2026",
      "host.close": "Close the pet window",
      // why a figure pack did not load (the bot is told)
      "figure.notInstalled": "This figure is not installed",
      "figure.notReady": "The figure was not ready within {seconds} seconds",
      "figure.imageFailed": "An image did not load: {url}",
      "figure.notFunction": "{name} is not a function",
      "figure.missingMethod": "The figure has no {name}",
      // the dressing page
      "dress.title": "Dress up",
      "dress.preview": "Preview",
      "dress.figure": "Figure",
      "dress.palette": "Colours",
      "dress.head": "Head",
      "dress.side": "Accessory",
      "dress.glasses": "Glasses",
      "dress.neck": "Neck",
      "dress.saved": "Saved",
      "dress.notSaved": "Not saved",
      "dress.offline": "Not saved: cannot reach the pet service",
      /** The two colour channels of an accessory. */
      "dress.main": "Main",
      "dress.accent": "Accent",
      "dress.colorOf": "{channel}: {color}",
      "dress.dropHint": "Drop to import the figure pack",
      "color.body": "Match body",
      "color.eye": "Match eyes",
      "color.mint": "Mint",
      "color.leaf": "Leaf green",
      "color.lemon": "Lemon",
      "color.fox": "Red Fox",
      "color.claude": "Claude",
      "color.rose": "Cherry pink",
      "color.purple": "Hollow Purple",
      "color.navigator": "Navigator",
      "color.holo": "Holo blue",
      // the dressing page: importing figure packs
      "import.button": "Import",
      "import.replaceTitle": "Replace existing figure packs?",
      "import.replaceText": "Replacing them deletes their existing files in the installation folder.",
      "import.replace": "Replace",
      "import.title": "Import figure packs",
      "import.unloaded": "Figure packs that did not load: {n}",
      /** Between a folder's name and the reason. */
      "import.reason": ": {reason}",
      "import.ok": "OK",
      "import.cancel": "Cancel",
      "import.noneTitle": "No figure pack found",
      "import.noneText": "No figure.json within {depth} levels below the place you picked.",
      "import.tooBigTitle": "Too large",
      "import.tooBigText": "One import takes at most {max}; this one is {size}.",
      "import.reading": "Reading\u2026",
      "import.failed": "Import failed",
      "import.offline": "Cannot reach the pet service.",
      "import.found": "Figure packs found: {n}",
      "import.allBad": "These figure packs cannot be imported",
      "import.version": "Version {version}",
      "import.contents": "Outfit groups: {axes} \xB7 expressions and motions: {words} \xB7 sounds: {sounds}",
      "import.credit": "{role}: {name}",
      "import.creditSep": "; ",
      "import.reinstall": "{version} is installed already and will be installed again",
      "import.upgrade": "{installed} is installed and will be replaced with {version}",
      "import.skipped": "{n} parts not supported by this version",
      "import.someBad": "These cannot be imported:",
      "import.pickedLevel": "The folder picked",
      "import.done": "Imported: {names}",
      "import.nameSep": ", ",
      "import.replacing": ". The figure in use updates the next time it loads",
      "import.lead": "Pick the folder with figure.json in it, or a zip that contains it.",
      "import.pickZip": "Choose a zip file",
      "import.pickDir": "Choose a folder",
      "import.dropNote": "You can also drag it in.",
      "import.cannot": "Cannot import",
      "import.dropOne": "Drag one zip at a time, or folders.",
      "import.readFailed": "Could not read the files",
      // the dressing page: uninstalling figure packs
      "remove.label": "Uninstall {name}",
      "remove.title": "Uninstall {name}?",
      "remove.lead": "The pack's files are deleted; import it again to use it. A pet wearing this pack changes back to Coo.",
      "remove.go": "Uninstall",
      "remove.failed": "Could not uninstall",
      "remove.done": "Uninstalled: {name}"
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/de.js
var de_exports = {};
__export(de_exports, {
  default: () => de_default
});
var de_default;
var init_de = __esm({
  "D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/de.js"() {
    de_default = {
      // the pet page
      "pet.title": "Cortico-Haustier",
      "bubble.close": "Schlie\xDFen",
      "bubble.skip": "\xDCberspringen",
      "bubble.ownPlaceholder": "Deine Antwort eingeben\u2026",
      "bubble.ownLabel": "Eigene Antwort schreiben",
      "bubble.send": "Senden",
      "bubble.peek": "Anzeigen",
      "bubble.typePlaceholder": "Nachricht eingeben\u2026",
      "bubble.typeLabel": "Tippen zum Reden",
      "bubble.expand": "Auf der Chat-Seite weiterschreiben",
      "bubble.removeImage": "Bild entfernen",
      "bubble.tooManyImages": "H\xF6chstens {max} Bilder im Eingabefeld",
      "bubble.imageUnreadable": "Dieses Bild konnte nicht gelesen werden",
      "bubble.imageTooLarge": "Dieses Bild \xFCberschreitet nach dem Skalieren immer noch {mb} MB",
      "bubble.imagesUnseen": "Das aktuelle Modell kann keine Bilder sehen; {bot} erf\xE4hrt nur, wie viele du geschickt hast.",
      // what the person said: a sentence being heard; how many images a chat-page message carries
      "heard.more": "H\xF6re zu\u2026",
      "heard.listening": "H\xF6re zu\u2026",
      "heard.cancel": "Abbrechen",
      "said.images": "Bilder \xD7{count}",
      // the status bubble
      "status.more": " und {others} weitere",
      "status.thinking": "Denkt nach",
      // the menu and the hover buttons
      "roam.off": "Bleibt stehen",
      "roam.calm": "Ab und zu",
      "roam.free": "Oft",
      "action.chat": "Tipp, um mit mir zu reden",
      "action.chatDoubleClick": "Tipp, um mit mir zu reden (oder klick doppelt auf mich)",
      "action.voiceOff": "Spracheingabe: aus \xB7 klicken zum Einschalten",
      "action.voiceNotReady": "Spracheingabe: an, aber {detail} \xB7 klicken zum Ausschalten",
      "action.voiceNoService": "die Spracherkennung ist nicht bereit",
      "action.voiceOn": "Spracheingabe: an ({mode}) \xB7 {hint}",
      "action.voiceAlways": "h\xF6rt immer zu",
      "action.voiceKey": "Sprechtaste",
      "action.roam": "Herumlaufen: {name} \xB7 klicken f\xFCr \u201E{next}\u201C",
      "action.themeDark": "Nachtmodus: an \xB7 klicken zum Ausschalten",
      "action.themeLight": "Nachtmodus: aus \xB7 klicken zum Einschalten",
      "action.soundOn": "T\xF6ne: an \xB7 klicken zum Ausschalten",
      "action.soundOff": "T\xF6ne: aus \xB7 klicken zum Einschalten",
      "action.dress": "Outfit",
      "action.hide": "Versteck mich erst mal (das Symbol im Infobereich holt mich zur\xFCck)",
      "menu.cancel": "Abbrechen",
      "menu.resume": "Fortsetzen",
      "menu.pause": "Pausieren",
      "menu.settings": "Einstellungen \xF6ffnen",
      "theme.toLight": "Zum Tagmodus wechseln",
      "theme.toDark": "Zum Nachtmodus wechseln",
      // the tray icon's menu while the pet window runs on its own
      "host.show": "Haustier anzeigen",
      "host.hide": "Haustier ausblenden",
      "host.dress": "Einkleiden\u2026",
      "host.close": "Haustier-Fenster schlie\xDFen",
      // why a figure pack did not load (the bot is told)
      "figure.notInstalled": "Diese Figur ist nicht installiert",
      "figure.notReady": "Die Figur war nach {seconds} Sekunden nicht bereit",
      "figure.imageFailed": "Ein Bild wurde nicht geladen: {url}",
      "figure.notFunction": "{name} ist keine Funktion",
      "figure.missingMethod": "Der Figur fehlt {name}",
      // the dressing page
      "dress.title": "Outfit",
      "dress.preview": "Vorschau",
      "dress.figure": "Figur",
      "dress.palette": "Farben",
      "dress.head": "Kopf",
      "dress.side": "Accessoire",
      "dress.glasses": "Brille",
      "dress.neck": "Hals",
      "dress.saved": "Gespeichert",
      "dress.notSaved": "Nicht gespeichert",
      "dress.offline": "Nicht gespeichert: Der Haustier-Dienst ist nicht erreichbar",
      "dress.main": "Hauptfarbe",
      "dress.accent": "Akzentfarbe",
      "dress.colorOf": "{channel}: {color}",
      "dress.dropHint": "Loslassen, um das Figurenpaket zu importieren",
      "color.body": "Wie der K\xF6rper",
      "color.eye": "Wie die Augen",
      "color.mint": "Minze",
      "color.leaf": "Blattgr\xFCn",
      "color.lemon": "Zitrone",
      "color.fox": "Rotfuchs",
      "color.claude": "Claude",
      "color.rose": "Kirschbl\xFCtenrosa",
      "color.purple": "Hohles Lila",
      "color.navigator": "Navigator",
      "color.holo": "Holo-Blau",
      // the dressing page: importing figure packs
      "import.button": "Importieren",
      "import.replaceTitle": "Vorhandene Figurenpakete ersetzen?",
      "import.replaceText": "Beim Ersetzen werden ihre bisherigen Dateien im Installationsordner gel\xF6scht.",
      "import.replace": "Ersetzen",
      "import.title": "Figurenpakete importieren",
      "import.unloaded": "Nicht geladene Figurenpakete: {n}",
      "import.reason": ": {reason}",
      "import.ok": "OK",
      "import.cancel": "Abbrechen",
      "import.noneTitle": "Kein Figurenpaket gefunden",
      "import.noneText": "Keine figure.json bis {depth} Ebenen unter dem gew\xE4hlten Ort.",
      "import.tooBigTitle": "Zu gro\xDF",
      "import.tooBigText": "Ein Import darf h\xF6chstens {max} gro\xDF sein; dieser hat {size}.",
      "import.reading": "Wird gelesen\u2026",
      "import.failed": "Import fehlgeschlagen",
      "import.offline": "Der Haustier-Dienst ist nicht erreichbar.",
      "import.found": "Gefundene Figurenpakete: {n}",
      "import.allBad": "Diese Figurenpakete k\xF6nnen nicht importiert werden",
      "import.version": "Version {version}",
      "import.contents": "Outfit-Gruppen: {axes} \xB7 Ausdr\xFCcke und Bewegungen: {words} \xB7 T\xF6ne: {sounds}",
      "import.credit": "{role}: {name}",
      "import.creditSep": "; ",
      "import.reinstall": "{version} ist schon installiert und wird neu installiert",
      "import.upgrade": "{installed} ist installiert und wird durch {version} ersetzt",
      "import.skipped": "{n} Teile werden von dieser Version nicht unterst\xFCtzt",
      "import.someBad": "Diese k\xF6nnen nicht importiert werden:",
      "import.pickedLevel": "Der gew\xE4hlte Ordner",
      "import.done": "Importiert: {names}",
      "import.nameSep": ", ",
      "import.replacing": ". Die verwendete Figur wird beim n\xE4chsten Laden aktualisiert",
      "import.lead": "W\xE4hle den Ordner mit figure.json oder ein ZIP, das ihn enth\xE4lt.",
      "import.pickZip": "ZIP-Datei w\xE4hlen",
      "import.pickDir": "Ordner w\xE4hlen",
      "import.dropNote": "Du kannst es auch hierher ziehen.",
      "import.cannot": "Import nicht m\xF6glich",
      "import.dropOne": "Zieh jeweils nur ein ZIP oder Ordner hierher.",
      "import.readFailed": "Die Dateien konnten nicht gelesen werden",
      // the dressing page: uninstalling figure packs
      "remove.label": "{name} deinstallieren",
      "remove.title": "{name} deinstallieren?",
      "remove.lead": "Die Dateien des Pakets werden gel\xF6scht; importiere es erneut, um es zu verwenden. Ist das Paket gerade in Gebrauch, wechselt das Haustier zur\xFCck zu Coo.",
      "remove.go": "Deinstallieren",
      "remove.failed": "Deinstallation fehlgeschlagen",
      "remove.done": "Deinstalliert: {name}"
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/es-419.js
var es_419_exports = {};
__export(es_419_exports, {
  default: () => es_419_default
});
var es_419_default;
var init_es_419 = __esm({
  "D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/es-419.js"() {
    es_419_default = {
      // the pet page
      "pet.title": "Mascota de Cortico",
      "bubble.close": "Cerrar",
      "bubble.skip": "Omitir",
      "bubble.ownPlaceholder": "Escribe tu respuesta\u2026",
      "bubble.ownLabel": "Escribe tu propia respuesta",
      "bubble.send": "Enviar",
      "bubble.peek": "Mostrar",
      "bubble.typePlaceholder": "Escribe un mensaje\u2026",
      "bubble.typeLabel": "Escribe para hablar",
      "bubble.expand": "Seguir en la p\xE1gina Chat",
      "bubble.removeImage": "Quitar imagen",
      "bubble.tooManyImages": "M\xE1ximo {max} im\xE1genes en el cuadro",
      "bubble.imageUnreadable": "No se pudo leer esta imagen",
      "bubble.imageTooLarge": "Esta imagen sigue superando {mb}MB tras redimensionar",
      "bubble.imagesUnseen": "El modelo actual no puede ver im\xE1genes; {bot} solo sabe cu\xE1ntas enviaste.",
      // what the person said: a sentence being heard; how many images a chat-page message carries
      "heard.more": "Escuchando\u2026",
      "heard.listening": "Escuchando\u2026",
      "heard.cancel": "Cancelar",
      "said.images": "Im\xE1genes \xD7{count}",
      // the status bubble: added when the same kind of thing was done several times
      "status.more": " y {others} m\xE1s",
      "status.thinking": "Pensando",
      // the menu and the hover buttons
      "roam.off": "Sin moverse",
      "roam.calm": "De vez en cuando",
      "roam.free": "A menudo",
      "action.chat": "Escr\xEDbeme para hablar",
      "action.chatDoubleClick": "Escr\xEDbeme para hablar (o haz doble clic en m\xED)",
      "action.voiceOff": "Entrada de voz: desactivada \xB7 clic para activar",
      "action.voiceNotReady": "Entrada de voz: activada, pero {detail} \xB7 clic para desactivar",
      "action.voiceNoService": "el reconocimiento de voz no est\xE1 listo",
      "action.voiceOn": "Entrada de voz: activada ({mode}) \xB7 {hint}",
      "action.voiceAlways": "siempre escuchando",
      "action.voiceKey": "tecla para hablar",
      "action.roam": "Paseos: {name} \xB7 clic para cambiar a \u201C{next}\u201D",
      "action.themeDark": "Modo nocturno: activado \xB7 clic para desactivar",
      "action.themeLight": "Modo nocturno: desactivado \xB7 clic para activar",
      "action.soundOn": "Sonidos: activados \xB7 clic para desactivar",
      "action.soundOff": "Sonidos: desactivados \xB7 clic para activar",
      "action.dress": "Vestuario",
      "action.hide": "Esc\xF3ndeme por ahora (el \xEDcono de la bandeja me trae de vuelta)",
      "menu.cancel": "Cancelar",
      "menu.resume": "Reanudar",
      "menu.pause": "Pausar",
      "menu.settings": "Abrir configuraci\xF3n",
      "theme.toLight": "Cambiar a modo d\xEDa",
      "theme.toDark": "Cambiar a modo noche",
      // the tray icon's menu while the pet window runs on its own
      "host.show": "Mostrar mascota",
      "host.hide": "Ocultar mascota",
      "host.dress": "Vestuario\u2026",
      "host.close": "Cerrar la ventana de la mascota",
      // why a figure pack did not load (the bot is told)
      "figure.notInstalled": "Este personaje no est\xE1 instalado",
      "figure.notReady": "El personaje no estuvo listo en {seconds} segundos",
      "figure.imageFailed": "No se carg\xF3 una imagen: {url}",
      "figure.notFunction": "{name} no es una funci\xF3n",
      "figure.missingMethod": "El personaje no tiene {name}",
      // the dressing page
      "dress.title": "Vestuario",
      "dress.preview": "Vista previa",
      "dress.figure": "Personaje",
      "dress.palette": "Colores",
      "dress.head": "Cabeza",
      "dress.side": "Accesorio",
      "dress.glasses": "Lentes",
      "dress.neck": "Cuello",
      "dress.saved": "Guardado",
      "dress.notSaved": "No se guard\xF3",
      "dress.offline": "No se guard\xF3: no hay conexi\xF3n con el servicio de la mascota",
      "dress.main": "Principal",
      "dress.accent": "Acento",
      "dress.colorOf": "{channel}: {color}",
      "dress.dropHint": "Suelta para importar el paquete de personaje",
      "color.body": "Igual que el cuerpo",
      "color.eye": "Igual que los ojos",
      "color.mint": "Menta",
      "color.leaf": "Verde hoja",
      "color.lemon": "Lim\xF3n",
      "color.fox": "Zorro rojo",
      "color.claude": "Claude",
      "color.rose": "Rosa cerezo",
      "color.purple": "P\xFArpura hueco",
      "color.navigator": "Navegante",
      "color.holo": "Azul hologr\xE1fico",
      // the dressing page: importing figure packs
      "import.button": "Importar",
      "import.replaceTitle": "\xBFReemplazar los paquetes de personaje existentes?",
      "import.replaceText": "Al reemplazarlos, se eliminan sus archivos actuales de la carpeta de instalaci\xF3n.",
      "import.replace": "Reemplazar",
      "import.title": "Importar paquetes de personaje",
      "import.unloaded": "Paquetes de personaje que no se cargaron: {n}",
      "import.reason": ": {reason}",
      "import.ok": "Aceptar",
      "import.cancel": "Cancelar",
      "import.noneTitle": "No se encontr\xF3 ning\xFAn paquete de personaje",
      "import.noneText": "No hay figure.json en los {depth} niveles por debajo del lugar que elegiste.",
      "import.tooBigTitle": "Demasiado grande",
      "import.tooBigText": "Cada importaci\xF3n admite como m\xE1ximo {max}; esta pesa {size}.",
      "import.reading": "Leyendo\u2026",
      "import.failed": "No se pudo importar",
      "import.offline": "No hay conexi\xF3n con el servicio de la mascota.",
      "import.found": "Paquetes de personaje encontrados: {n}",
      "import.allBad": "Estos paquetes de personaje no se pueden importar",
      "import.version": "Versi\xF3n {version}",
      "import.contents": "Grupos de atuendo: {axes} \xB7 expresiones y movimientos: {words} \xB7 sonidos: {sounds}",
      "import.credit": "{role}: {name}",
      "import.creditSep": "; ",
      "import.reinstall": "La versi\xF3n {version} ya est\xE1 instalada y se volver\xE1 a instalar",
      "import.upgrade": "La versi\xF3n {installed} est\xE1 instalada y se reemplazar\xE1 por la {version}",
      "import.skipped": "{n} partes no compatibles con esta versi\xF3n",
      "import.someBad": "Estos no se pueden importar:",
      "import.pickedLevel": "La carpeta elegida",
      "import.done": "Importados: {names}",
      "import.nameSep": ", ",
      "import.replacing": ". El personaje en uso se actualiza la pr\xF3xima vez que se cargue",
      "import.lead": "Elige la carpeta que contiene figure.json o un zip que la incluya.",
      "import.pickZip": "Elegir un archivo zip",
      "import.pickDir": "Elegir una carpeta",
      "import.dropNote": "Tambi\xE9n puedes arrastrarlo.",
      "import.cannot": "No se puede importar",
      "import.dropOne": "Arrastra un solo zip a la vez, o carpetas.",
      "import.readFailed": "No se pudieron leer los archivos",
      // the dressing page: uninstalling figure packs
      "remove.label": "Desinstalar {name}",
      "remove.title": "\xBFDesinstalar {name}?",
      "remove.lead": "Se eliminan los archivos del paquete; vuelve a importarlo para usarlo. Si la mascota lo lleva puesto, vuelve a ser Coo.",
      "remove.go": "Desinstalar",
      "remove.failed": "No se pudo desinstalar",
      "remove.done": "Desinstalado: {name}"
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/fr.js
var fr_exports = {};
__export(fr_exports, {
  default: () => fr_default
});
var fr_default;
var init_fr = __esm({
  "D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/fr.js"() {
    fr_default = {
      // the pet page
      "pet.title": "Compagnon Cortico",
      "bubble.close": "Fermer",
      "bubble.skip": "Passer",
      "bubble.ownPlaceholder": "Saisissez votre r\xE9ponse\u2026",
      "bubble.ownLabel": "\xC9crire votre propre r\xE9ponse",
      "bubble.send": "Envoyer",
      "bubble.peek": "Afficher",
      "bubble.typePlaceholder": "Saisissez un message\u2026",
      "bubble.typeLabel": "\xC9crire pour parler",
      "bubble.expand": "Continuer sur la page Discussion",
      "bubble.removeImage": "Retirer l'image",
      "bubble.tooManyImages": "{max} images au maximum dans la zone de saisie",
      "bubble.imageUnreadable": "Impossible de lire cette image",
      "bubble.imageTooLarge": "Cette image d\xE9passe encore {mb} Mo apr\xE8s redimensionnement",
      "bubble.imagesUnseen": "Le mod\xE8le actuel ne voit pas les images ; {bot} apprend seulement combien vous en avez envoy\xE9.",
      // what the person said: a sentence being heard; how many images a chat-page message carries
      "heard.more": "J'\xE9coute\u2026",
      "heard.listening": "J'\xE9coute\u2026",
      "heard.cancel": "Annuler",
      "said.images": "Images \xD7{count}",
      // the status bubble
      "status.more": " et {others} de plus",
      "status.thinking": "R\xE9fl\xE9chit",
      // the menu and the hover buttons
      "roam.off": "Reste sur place",
      "roam.calm": "De temps en temps",
      "roam.free": "Souvent",
      "action.chat": "\xC9crivez pour me parler",
      "action.chatDoubleClick": "\xC9crivez pour me parler (ou double-cliquez sur moi)",
      "action.voiceOff": "Saisie vocale : d\xE9sactiv\xE9e \xB7 cliquez pour activer",
      "action.voiceNotReady": "Saisie vocale : activ\xE9e, mais {detail} \xB7 cliquez pour d\xE9sactiver",
      "action.voiceNoService": "la reconnaissance vocale n'est pas pr\xEAte",
      "action.voiceOn": "Saisie vocale : activ\xE9e ({mode}) \xB7 {hint}",
      "action.voiceAlways": "\xE9coute continue",
      "action.voiceKey": "touche de parole",
      "action.roam": "D\xE9placements : {name} \xB7 cliquez pour passer \xE0 \xAB {next} \xBB",
      "action.themeDark": "Mode nuit : activ\xE9 \xB7 cliquez pour d\xE9sactiver",
      "action.themeLight": "Mode nuit : d\xE9sactiv\xE9 \xB7 cliquez pour activer",
      "action.soundOn": "Sons : activ\xE9s \xB7 cliquez pour d\xE9sactiver",
      "action.soundOff": "Sons : d\xE9sactiv\xE9s \xB7 cliquez pour activer",
      "action.dress": "Habiller",
      "action.hide": "Me cacher pour l'instant (l'ic\xF4ne de la zone de notification me fait revenir)",
      "menu.cancel": "Annuler",
      "menu.resume": "Reprendre",
      "menu.pause": "Pause",
      "menu.settings": "Ouvrir les param\xE8tres",
      "theme.toLight": "Passer en mode jour",
      "theme.toDark": "Passer en mode nuit",
      // the tray icon's menu while the pet window runs on its own
      "host.show": "Afficher le compagnon",
      "host.hide": "Masquer le compagnon",
      "host.dress": "Habiller\u2026",
      "host.close": "Fermer la fen\xEAtre du compagnon",
      // why a figure pack did not load (the bot is told)
      "figure.notInstalled": "Ce personnage n'est pas install\xE9",
      "figure.notReady": "Le personnage n'a pas pu se pr\xE9parer en {seconds} secondes",
      "figure.imageFailed": "Une image ne s'est pas charg\xE9e : {url}",
      "figure.notFunction": "{name} n'est pas une fonction",
      "figure.missingMethod": "Le personnage n'a pas de {name}",
      // the dressing page
      "dress.title": "Habillage",
      "dress.preview": "Aper\xE7u",
      "dress.figure": "Personnage",
      "dress.palette": "Couleurs",
      "dress.head": "T\xEAte",
      "dress.side": "Accessoire",
      "dress.glasses": "Lunettes",
      "dress.neck": "Cou",
      "dress.saved": "Enregistr\xE9",
      "dress.notSaved": "Non enregistr\xE9",
      "dress.offline": "Non enregistr\xE9 : le service du compagnon est injoignable",
      "dress.main": "Principale",
      "dress.accent": "Accent",
      "dress.colorOf": "{channel} : {color}",
      "dress.dropHint": "D\xE9posez pour importer le pack de personnage",
      "color.body": "Comme le corps",
      "color.eye": "Comme les yeux",
      "color.mint": "Menthe",
      "color.leaf": "Vert feuille",
      "color.lemon": "Citron",
      "color.fox": "Renard roux",
      "color.claude": "Claude",
      "color.rose": "Rose cerisier",
      "color.purple": "Violet creux",
      "color.navigator": "Navigateur",
      "color.holo": "Bleu holo",
      // the dressing page: importing figure packs
      "import.button": "Importer",
      "import.replaceTitle": "Remplacer les packs de personnage existants ?",
      "import.replaceText": "Le remplacement supprime leurs fichiers existants dans le dossier d\u2019installation.",
      "import.replace": "Remplacer",
      "import.title": "Importer des packs de personnage",
      "import.unloaded": "Packs de personnage non charg\xE9s : {n}",
      "import.reason": " : {reason}",
      "import.ok": "OK",
      "import.cancel": "Annuler",
      "import.noneTitle": "Aucun pack de personnage trouv\xE9",
      "import.noneText": "Aucun figure.json \xE0 moins de {depth} niveaux sous l'emplacement choisi.",
      "import.tooBigTitle": "Trop volumineux",
      "import.tooBigText": "Une importation accepte au plus {max} ; celle-ci fait {size}.",
      "import.reading": "Lecture\u2026",
      "import.failed": "\xC9chec de l'importation",
      "import.offline": "Le service du compagnon est injoignable.",
      "import.found": "Packs de personnage trouv\xE9s : {n}",
      "import.allBad": "Ces packs de personnage ne peuvent pas \xEAtre import\xE9s",
      "import.version": "Version {version}",
      "import.contents": "Groupes de tenues : {axes} \xB7 expressions et mouvements : {words} \xB7 sons : {sounds}",
      "import.credit": "{role} : {name}",
      "import.creditSep": " ; ",
      "import.reinstall": "{version} est d\xE9j\xE0 install\xE9 et sera r\xE9install\xE9",
      "import.upgrade": "{installed} est install\xE9 et sera remplac\xE9 par {version}",
      "import.skipped": "\xC9l\xE9ments non pris en charge par cette version : {n}",
      "import.someBad": "Ceux-ci ne peuvent pas \xEAtre import\xE9s :",
      "import.pickedLevel": "Le dossier choisi",
      "import.done": "Import\xE9 : {names}",
      "import.nameSep": ", ",
      "import.replacing": ". Le personnage utilis\xE9 sera mis \xE0 jour \xE0 son prochain chargement",
      "import.lead": "Choisissez le dossier qui contient figure.json, ou un zip qui le contient.",
      "import.pickZip": "Choisir un fichier zip",
      "import.pickDir": "Choisir un dossier",
      "import.dropNote": "Vous pouvez aussi le glisser ici.",
      "import.cannot": "Importation impossible",
      "import.dropOne": "Glissez un seul zip \xE0 la fois, ou des dossiers.",
      "import.readFailed": "Impossible de lire les fichiers",
      // the dressing page: uninstalling figure packs
      "remove.label": "D\xE9sinstaller {name}",
      "remove.title": "D\xE9sinstaller {name} ?",
      "remove.lead": "Les fichiers du pack sont supprim\xE9s ; importez-le \xE0 nouveau pour l'utiliser. Un compagnon qui porte ce pack redevient Coo.",
      "remove.go": "D\xE9sinstaller",
      "remove.failed": "\xC9chec de la d\xE9sinstallation",
      "remove.done": "D\xE9sinstall\xE9 : {name}"
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/it.js
var it_exports = {};
__export(it_exports, {
  default: () => it_default
});
var it_default;
var init_it = __esm({
  "D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/it.js"() {
    it_default = {
      // the pet page
      "pet.title": "Animaletto Cortico",
      "bubble.close": "Chiudi",
      "bubble.skip": "Salta",
      "bubble.ownPlaceholder": "Scrivi la tua risposta\u2026",
      "bubble.ownLabel": "Scrivi la tua risposta",
      "bubble.send": "Invia",
      "bubble.peek": "Mostra",
      "bubble.typePlaceholder": "Scrivi un messaggio\u2026",
      "bubble.typeLabel": "Scrivi per parlare",
      "bubble.expand": "Continua nella pagina Chat",
      "bubble.removeImage": "Rimuovi immagine",
      "bubble.tooManyImages": "Al massimo {max} immagini nella casella",
      "bubble.imageUnreadable": "Impossibile leggere questa immagine",
      "bubble.imageTooLarge": "Questa immagine supera ancora {mb} MB dopo il ridimensionamento",
      "bubble.imagesUnseen": "Il modello attuale non vede le immagini; {bot} sa solo quante ne hai inviate.",
      // what the person said: a sentence being heard; how many images a chat-page message carries
      "heard.more": "In ascolto\u2026",
      "heard.listening": "In ascolto\u2026",
      "heard.cancel": "Annulla",
      "said.images": "Immagini \xD7{count}",
      // the status bubble
      "status.more": " e altri {others}",
      "status.thinking": "Sta pensando",
      // the menu and the hover buttons
      "roam.off": "Resta sul posto",
      "roam.calm": "Ogni tanto",
      "roam.free": "Spesso",
      "action.chat": "Scrivi per parlarmi",
      "action.chatDoubleClick": "Scrivi per parlarmi (o fai doppio clic su di me)",
      "action.voiceOff": "Input vocale: spento \xB7 clicca per accenderlo",
      "action.voiceNotReady": "Input vocale: acceso, ma {detail} \xB7 clicca per spegnerlo",
      "action.voiceNoService": "il riconoscimento vocale non \xE8 pronto",
      "action.voiceOn": "Input vocale: acceso ({mode}) \xB7 {hint}",
      "action.voiceAlways": "ascolto continuo",
      "action.voiceKey": "tasto per parlare",
      "action.roam": "Movimento: {name} \xB7 clicca per passare a \xAB{next}\xBB",
      "action.themeDark": "Modalit\xE0 notte: attiva \xB7 clicca per disattivarla",
      "action.themeLight": "Modalit\xE0 notte: disattivata \xB7 clicca per attivarla",
      "action.soundOn": "Suoni: attivi \xB7 clicca per disattivarli",
      "action.soundOff": "Suoni: disattivati \xB7 clicca per attivarli",
      "action.dress": "Guardaroba",
      "action.hide": "Nascondimi per ora (l'icona nell'area di notifica mi riporta qui)",
      "menu.cancel": "Annulla",
      "menu.resume": "Riprendi",
      "menu.pause": "Pausa",
      "menu.settings": "Apri impostazioni",
      "theme.toLight": "Passa alla modalit\xE0 giorno",
      "theme.toDark": "Passa alla modalit\xE0 notte",
      // the tray icon's menu while the pet window runs on its own
      "host.show": "Mostra l'animaletto",
      "host.hide": "Nascondi l'animaletto",
      "host.dress": "Guardaroba\u2026",
      "host.close": "Chiudi la finestra dell'animaletto",
      // why a figure pack did not load (the bot is told)
      "figure.notInstalled": "Questo personaggio non \xE8 installato",
      "figure.notReady": "Il personaggio non era pronto entro {seconds} secondi",
      "figure.imageFailed": "Un'immagine non si \xE8 caricata: {url}",
      "figure.notFunction": "{name} non \xE8 una funzione",
      "figure.missingMethod": "Il personaggio non ha {name}",
      // the dressing page
      "dress.title": "Guardaroba",
      "dress.preview": "Anteprima",
      "dress.figure": "Personaggio",
      "dress.palette": "Colori",
      "dress.head": "Testa",
      "dress.side": "Accessorio",
      "dress.glasses": "Occhiali",
      "dress.neck": "Collo",
      "dress.saved": "Salvato",
      "dress.notSaved": "Non salvato",
      "dress.offline": "Non salvato: il servizio dell'animaletto non \xE8 raggiungibile",
      "dress.main": "Principale",
      "dress.accent": "Accento",
      "dress.colorOf": "{channel}: {color}",
      "dress.dropHint": "Rilascia per importare il pacchetto personaggio",
      "color.body": "Come il corpo",
      "color.eye": "Come gli occhi",
      "color.mint": "Menta",
      "color.leaf": "Verde foglia",
      "color.lemon": "Limone",
      "color.fox": "Volpe rossa",
      "color.claude": "Claude",
      "color.rose": "Rosa ciliegio",
      "color.purple": "Viola cavo",
      "color.navigator": "Navigatore",
      "color.holo": "Blu olografico",
      // the dressing page: importing figure packs
      "import.button": "Importa",
      "import.replaceTitle": "Sostituire i pacchetti personaggio esistenti?",
      "import.replaceText": "La sostituzione elimina i loro file attuali nella cartella di installazione.",
      "import.replace": "Sostituisci",
      "import.title": "Importa pacchetti personaggio",
      "import.unloaded": "Pacchetti personaggio non caricati: {n}",
      "import.reason": ": {reason}",
      "import.ok": "OK",
      "import.cancel": "Annulla",
      "import.noneTitle": "Nessun pacchetto personaggio trovato",
      "import.noneText": "Nessun figure.json entro {depth} livelli sotto il punto scelto.",
      "import.tooBigTitle": "Troppo grande",
      "import.tooBigText": "Un'importazione accetta al massimo {max}; questa \xE8 di {size}.",
      "import.reading": "Lettura\u2026",
      "import.failed": "Importazione non riuscita",
      "import.offline": "Il servizio dell'animaletto non \xE8 raggiungibile.",
      "import.found": "Pacchetti personaggio trovati: {n}",
      "import.allBad": "Questi pacchetti personaggio non possono essere importati",
      "import.version": "Versione {version}",
      "import.contents": "Gruppi di abiti: {axes} \xB7 espressioni e movimenti: {words} \xB7 suoni: {sounds}",
      "import.credit": "{role}: {name}",
      "import.creditSep": "; ",
      "import.reinstall": "La versione {version} \xE8 gi\xE0 installata e verr\xE0 reinstallata",
      "import.upgrade": "\xC8 installata la versione {installed}, che verr\xE0 sostituita dalla {version}",
      "import.skipped": "{n} parti non supportate da questa versione",
      "import.someBad": "Questi non possono essere importati:",
      "import.pickedLevel": "La cartella scelta",
      "import.done": "Importati: {names}",
      "import.nameSep": ", ",
      "import.replacing": ". Il personaggio in uso si aggiorna al prossimo caricamento",
      "import.lead": "Scegli la cartella che contiene figure.json o uno zip che la include.",
      "import.pickZip": "Scegli un file zip",
      "import.pickDir": "Scegli una cartella",
      "import.dropNote": "Puoi anche trascinarlo qui.",
      "import.cannot": "Impossibile importare",
      "import.dropOne": "Trascina uno zip alla volta, oppure delle cartelle.",
      "import.readFailed": "Impossibile leggere i file",
      // the dressing page: uninstalling figure packs
      "remove.label": "Disinstalla {name}",
      "remove.title": "Disinstallare {name}?",
      "remove.lead": "I file del pacchetto vengono eliminati; importalo di nuovo per usarlo. Se l'animaletto lo indossa, torna a essere Coo.",
      "remove.go": "Disinstalla",
      "remove.failed": "Disinstallazione non riuscita",
      "remove.done": "Disinstallato: {name}"
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/ja.js
var ja_exports = {};
__export(ja_exports, {
  default: () => ja_default
});
var ja_default;
var init_ja = __esm({
  "D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/ja.js"() {
    ja_default = {
      // the pet page
      "pet.title": "Cortico \u30DA\u30C3\u30C8",
      "bubble.close": "\u9589\u3058\u308B",
      "bubble.skip": "\u30B9\u30AD\u30C3\u30D7",
      "bubble.ownPlaceholder": "\u56DE\u7B54\u3092\u5165\u529B\u2026",
      "bubble.ownLabel": "\u81EA\u5206\u3067\u7B54\u3048\u3092\u66F8\u304F",
      "bubble.send": "\u9001\u4FE1",
      "bubble.peek": "\u8868\u793A",
      "bubble.typePlaceholder": "\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u5165\u529B\u2026",
      "bubble.typeLabel": "\u5165\u529B\u3057\u3066\u8A71\u3059",
      "bubble.expand": "\u30C1\u30E3\u30C3\u30C8\u30DA\u30FC\u30B8\u3067\u7D9A\u3051\u308B",
      "bubble.removeImage": "\u753B\u50CF\u3092\u524A\u9664",
      "bubble.tooManyImages": "\u5165\u529B\u6B04\u306B\u6DFB\u4ED8\u3067\u304D\u308B\u753B\u50CF\u306F\u6700\u5927 {max} \u679A\u3067\u3059",
      "bubble.imageUnreadable": "\u3053\u306E\u753B\u50CF\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093",
      "bubble.imageTooLarge": "\u3053\u306E\u753B\u50CF\u306F\u7E2E\u5C0F\u5F8C\u3082 {mb}MB \u3092\u8D85\u3048\u3066\u3044\u307E\u3059",
      "bubble.imagesUnseen": "\u73FE\u5728\u306E\u30E2\u30C7\u30EB\u306F\u753B\u50CF\u3092\u898B\u3089\u308C\u307E\u305B\u3093\u3002{bot} \u306B\u306F\u9001\u3063\u305F\u679A\u6570\u3060\u3051\u304C\u4F1D\u308F\u308A\u307E\u3059\u3002",
      // what the person said: a sentence being heard; how many images a chat-page message carries
      "heard.more": "\u805E\u304D\u53D6\u308A\u4E2D\u2026",
      "heard.listening": "\u805E\u304D\u53D6\u308A\u4E2D\u2026",
      "heard.cancel": "\u30AD\u30E3\u30F3\u30BB\u30EB",
      "said.images": "\u753B\u50CF \xD7{count}",
      // the status bubble
      "status.more": " \u307B\u304B {others} \u4EF6",
      "status.thinking": "\u8003\u3048\u4E2D",
      // the menu and the hover buttons
      "roam.off": "\u3058\u3063\u3068\u3059\u308B",
      "roam.calm": "\u3068\u304D\u3069\u304D\u6B69\u304F",
      "roam.free": "\u3088\u304F\u6B69\u304F",
      "action.chat": "\u5165\u529B\u3057\u3066\u8A71\u3057\u304B\u3051\u308B",
      "action.chatDoubleClick": "\u5165\u529B\u3057\u3066\u8A71\u3057\u304B\u3051\u308B\uFF08\u30C0\u30D6\u30EB\u30AF\u30EA\u30C3\u30AF\u3067\u3082\u53EF\uFF09",
      "action.voiceOff": "\u97F3\u58F0\u5165\u529B\uFF1A\u30AA\u30D5 \xB7 \u30AF\u30EA\u30C3\u30AF\u3067\u30AA\u30F3",
      "action.voiceNotReady": "\u97F3\u58F0\u5165\u529B\uFF1A\u30AA\u30F3\u3001\u305F\u3060\u3057{detail} \xB7 \u30AF\u30EA\u30C3\u30AF\u3067\u30AA\u30D5",
      "action.voiceNoService": "\u97F3\u58F0\u8A8D\u8B58\u306E\u6E96\u5099\u304C\u3067\u304D\u3066\u3044\u307E\u305B\u3093",
      "action.voiceOn": "\u97F3\u58F0\u5165\u529B\uFF1A\u30AA\u30F3\uFF08{mode}\uFF09\xB7 {hint}",
      "action.voiceAlways": "\u5E38\u306B\u805E\u304D\u53D6\u308A",
      "action.voiceKey": "\u767A\u8A71\u30AD\u30FC",
      "action.roam": "\u6B69\u304D\u56DE\u308A\uFF1A{name} \xB7 \u30AF\u30EA\u30C3\u30AF\u3067\u300C{next}\u300D\u306B\u5207\u308A\u66FF\u3048",
      "action.themeDark": "\u30CA\u30A4\u30C8\u30E2\u30FC\u30C9\uFF1A\u30AA\u30F3 \xB7 \u30AF\u30EA\u30C3\u30AF\u3067\u30AA\u30D5",
      "action.themeLight": "\u30CA\u30A4\u30C8\u30E2\u30FC\u30C9\uFF1A\u30AA\u30D5 \xB7 \u30AF\u30EA\u30C3\u30AF\u3067\u30AA\u30F3",
      "action.soundOn": "\u30B5\u30A6\u30F3\u30C9\uFF1A\u30AA\u30F3 \xB7 \u30AF\u30EA\u30C3\u30AF\u3067\u30AA\u30D5",
      "action.soundOff": "\u30B5\u30A6\u30F3\u30C9\uFF1A\u30AA\u30D5 \xB7 \u30AF\u30EA\u30C3\u30AF\u3067\u30AA\u30F3",
      "action.dress": "\u7740\u305B\u66FF\u3048",
      "action.hide": "\u3057\u3070\u3089\u304F\u96A0\u308C\u308B\uFF08\u30C8\u30EC\u30A4\u30A2\u30A4\u30B3\u30F3\u3067\u547C\u3073\u623B\u305B\u307E\u3059\uFF09",
      "menu.cancel": "\u30AD\u30E3\u30F3\u30BB\u30EB",
      "menu.resume": "\u518D\u958B",
      "menu.pause": "\u4E00\u6642\u505C\u6B62",
      "menu.settings": "\u8A2D\u5B9A\u3092\u958B\u304F",
      "theme.toLight": "\u30C7\u30A4\u30E2\u30FC\u30C9\u306B\u5207\u308A\u66FF\u3048",
      "theme.toDark": "\u30CA\u30A4\u30C8\u30E2\u30FC\u30C9\u306B\u5207\u308A\u66FF\u3048",
      // the tray icon's menu while the pet window runs on its own
      "host.show": "\u30DA\u30C3\u30C8\u3092\u8868\u793A",
      "host.hide": "\u30DA\u30C3\u30C8\u3092\u96A0\u3059",
      "host.dress": "\u7740\u305B\u66FF\u3048\u2026",
      "host.close": "\u30DA\u30C3\u30C8\u306E\u30A6\u30A3\u30F3\u30C9\u30A6\u3092\u9589\u3058\u308B",
      // why a figure pack did not load (the bot is told)
      "figure.notInstalled": "\u3053\u306E\u30A2\u30D0\u30BF\u30FC\u306F\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
      "figure.notReady": "\u30A2\u30D0\u30BF\u30FC\u304C {seconds} \u79D2\u4EE5\u5185\u306B\u6E96\u5099\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F",
      "figure.imageFailed": "\u753B\u50CF\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{url}",
      "figure.notFunction": "{name} \u306F\u95A2\u6570\u3067\u306F\u3042\u308A\u307E\u305B\u3093",
      "figure.missingMethod": "\u30A2\u30D0\u30BF\u30FC\u306B {name} \u304C\u3042\u308A\u307E\u305B\u3093",
      // the dressing page
      "dress.title": "\u7740\u305B\u66FF\u3048",
      "dress.preview": "\u30D7\u30EC\u30D3\u30E5\u30FC",
      "dress.figure": "\u30A2\u30D0\u30BF\u30FC",
      "dress.palette": "\u914D\u8272",
      "dress.head": "\u982D",
      "dress.side": "\u30A2\u30AF\u30BB\u30B5\u30EA\u30FC",
      "dress.glasses": "\u30E1\u30AC\u30CD",
      "dress.neck": "\u9996\u5143",
      "dress.saved": "\u4FDD\u5B58\u3057\u307E\u3057\u305F",
      "dress.notSaved": "\u4FDD\u5B58\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
      "dress.offline": "\u4FDD\u5B58\u3055\u308C\u3066\u3044\u307E\u305B\u3093\uFF1A\u30DA\u30C3\u30C8\u306E\u30B5\u30FC\u30D3\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093",
      "dress.main": "\u30E1\u30A4\u30F3",
      "dress.accent": "\u30A2\u30AF\u30BB\u30F3\u30C8",
      "dress.colorOf": "{channel}\uFF1A{color}",
      "dress.dropHint": "\u30C9\u30ED\u30C3\u30D7\u3057\u3066\u30A2\u30D0\u30BF\u30FC\u30D1\u30C3\u30AF\u3092\u30A4\u30F3\u30DD\u30FC\u30C8",
      "color.body": "\u4F53\u306B\u5408\u308F\u305B\u308B",
      "color.eye": "\u76EE\u306B\u5408\u308F\u305B\u308B",
      "color.mint": "\u30DF\u30F3\u30C8",
      "color.leaf": "\u30EA\u30FC\u30D5\u30B0\u30EA\u30FC\u30F3",
      "color.lemon": "\u30EC\u30E2\u30F3",
      "color.fox": "\u30A2\u30AB\u30AE\u30C4\u30CD",
      "color.claude": "Claude",
      "color.rose": "\u30C1\u30A7\u30EA\u30FC\u30D4\u30F3\u30AF",
      "color.purple": "\u865A\u5F0F\u300C\u8308\u300D",
      "color.navigator": "\u30CA\u30D3\u30B2\u30FC\u30BF\u30FC",
      "color.holo": "\u30DB\u30ED\u30D6\u30EB\u30FC",
      // the dressing page: importing figure packs
      "import.button": "\u30A4\u30F3\u30DD\u30FC\u30C8",
      "import.replaceTitle": "\u65E2\u5B58\u306E\u30A2\u30D0\u30BF\u30FC\u30D1\u30C3\u30AF\u3092\u7F6E\u304D\u63DB\u3048\u307E\u3059\u304B\uFF1F",
      "import.replaceText": "\u7F6E\u304D\u63DB\u3048\u308B\u3068\u3001\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u5148\u30D5\u30A9\u30EB\u30C0\u30FC\u306B\u3042\u308B\u3053\u308C\u3089\u306E\u30D1\u30C3\u30AF\u306E\u65E2\u5B58\u30D5\u30A1\u30A4\u30EB\u304C\u524A\u9664\u3055\u308C\u307E\u3059\u3002",
      "import.replace": "\u7F6E\u304D\u63DB\u3048\u308B",
      "import.title": "\u30A2\u30D0\u30BF\u30FC\u30D1\u30C3\u30AF\u3092\u30A4\u30F3\u30DD\u30FC\u30C8",
      "import.unloaded": "\u8AAD\u307F\u8FBC\u3081\u306A\u304B\u3063\u305F\u30A2\u30D0\u30BF\u30FC\u30D1\u30C3\u30AF\uFF1A{n} \u4EF6",
      "import.reason": "\uFF1A{reason}",
      "import.ok": "OK",
      "import.cancel": "\u30AD\u30E3\u30F3\u30BB\u30EB",
      "import.noneTitle": "\u30A2\u30D0\u30BF\u30FC\u30D1\u30C3\u30AF\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093",
      "import.noneText": "\u9078\u3093\u3060\u5834\u6240\u304B\u3089 {depth} \u968E\u5C64\u4E0B\u307E\u3067\u306B figure.json \u304C\u3042\u308A\u307E\u305B\u3093\u3002",
      "import.tooBigTitle": "\u5927\u304D\u3059\u304E\u307E\u3059",
      "import.tooBigText": "\u4E00\u5EA6\u306B\u30A4\u30F3\u30DD\u30FC\u30C8\u3067\u304D\u308B\u306E\u306F {max} \u307E\u3067\u3067\u3059\u3002\u4ECA\u56DE\u306F {size} \u3042\u308A\u307E\u3059\u3002",
      "import.reading": "\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u2026",
      "import.failed": "\u30A4\u30F3\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      "import.offline": "\u30DA\u30C3\u30C8\u306E\u30B5\u30FC\u30D3\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3002",
      "import.found": "\u898B\u3064\u304B\u3063\u305F\u30A2\u30D0\u30BF\u30FC\u30D1\u30C3\u30AF\uFF1A{n} \u4EF6",
      "import.allBad": "\u3053\u308C\u3089\u306E\u30A2\u30D0\u30BF\u30FC\u30D1\u30C3\u30AF\u306F\u30A4\u30F3\u30DD\u30FC\u30C8\u3067\u304D\u307E\u305B\u3093",
      "import.version": "\u30D0\u30FC\u30B8\u30E7\u30F3 {version}",
      "import.contents": "\u8863\u88C5\u30B0\u30EB\u30FC\u30D7\uFF1A{axes} \xB7 \u8868\u60C5\u3068\u52D5\u4F5C\uFF1A{words} \xB7 \u30B5\u30A6\u30F3\u30C9\uFF1A{sounds}",
      "import.credit": "{role}\uFF1A{name}",
      "import.creditSep": "\u3001",
      "import.reinstall": "{version} \u306F\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u6E08\u307F\u3067\u3059\u3002\u3082\u3046\u4E00\u5EA6\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3057\u307E\u3059",
      "import.upgrade": "{installed} \u304C\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3055\u308C\u3066\u3044\u307E\u3059\u3002{version} \u306B\u7F6E\u304D\u63DB\u3048\u307E\u3059",
      "import.skipped": "{n} \u4EF6\u306E\u5185\u5BB9\u306F\u3053\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u3067\u306F\u4F7F\u7528\u3067\u304D\u307E\u305B\u3093",
      "import.someBad": "\u6B21\u306E\u3082\u306E\u306F\u30A4\u30F3\u30DD\u30FC\u30C8\u3067\u304D\u307E\u305B\u3093\uFF1A",
      "import.pickedLevel": "\u9078\u3093\u3060\u30D5\u30A9\u30EB\u30C0\u30FC",
      "import.done": "\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F\uFF1A{names}",
      "import.nameSep": "\u3001",
      "import.replacing": "\u3002\u4F7F\u7528\u4E2D\u306E\u30A2\u30D0\u30BF\u30FC\u306F\u6B21\u306B\u8AAD\u307F\u8FBC\u307E\u308C\u308B\u3068\u304D\u306B\u66F4\u65B0\u3055\u308C\u307E\u3059",
      "import.lead": "figure.json \u304C\u5165\u3063\u305F\u30D5\u30A9\u30EB\u30C0\u30FC\u3001\u307E\u305F\u306F\u305D\u308C\u3092\u542B\u3080 zip \u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002",
      "import.pickZip": "zip \u30D5\u30A1\u30A4\u30EB\u3092\u9078\u3076",
      "import.pickDir": "\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u9078\u3076",
      "import.dropNote": "\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u8FFD\u52A0\u3059\u308B\u3053\u3068\u3082\u3067\u304D\u307E\u3059\u3002",
      "import.cannot": "\u30A4\u30F3\u30DD\u30FC\u30C8\u3067\u304D\u307E\u305B\u3093",
      "import.dropOne": "zip \u306F\u4E00\u5EA6\u306B 1 \u3064\u305A\u3064\u3001\u307E\u305F\u306F\u30D5\u30A9\u30EB\u30C0\u30FC\u3092\u30C9\u30E9\u30C3\u30B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      "import.readFailed": "\u30D5\u30A1\u30A4\u30EB\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F",
      // the dressing page: uninstalling figure packs
      "remove.label": "{name} \u3092\u30A2\u30F3\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB",
      "remove.title": "{name} \u3092\u30A2\u30F3\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3057\u307E\u3059\u304B\uFF1F",
      "remove.lead": "\u3053\u306E\u30D1\u30C3\u30AF\u306E\u30D5\u30A1\u30A4\u30EB\u304C\u524A\u9664\u3055\u308C\u307E\u3059\u3002\u518D\u3073\u4F7F\u3046\u306B\u306F\u3082\u3046\u4E00\u5EA6\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30DA\u30C3\u30C8\u304C\u4F7F\u7528\u4E2D\u306E\u5834\u5408\u306F Coo \u306B\u623B\u308A\u307E\u3059\u3002",
      "remove.go": "\u30A2\u30F3\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB",
      "remove.failed": "\u30A2\u30F3\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
      "remove.done": "\u30A2\u30F3\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3057\u307E\u3057\u305F\uFF1A{name}"
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/ko.js
var ko_exports = {};
__export(ko_exports, {
  default: () => ko_default
});
var ko_default;
var init_ko = __esm({
  "D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/ko.js"() {
    ko_default = {
      // the pet page
      "pet.title": "Cortico \uD3AB",
      "bubble.close": "\uB2EB\uAE30",
      "bubble.skip": "\uAC74\uB108\uB6F0\uAE30",
      "bubble.ownPlaceholder": "\uB2F5\uC744 \uC785\uB825\uD558\uC138\uC694\u2026",
      "bubble.ownLabel": "\uC9C1\uC811 \uB2F5 \uC4F0\uAE30",
      "bubble.send": "\uBCF4\uB0B4\uAE30",
      "bubble.peek": "\uD45C\uC2DC",
      "bubble.typePlaceholder": "\uBA54\uC2DC\uC9C0\uB97C \uC785\uB825\uD558\uC138\uC694\u2026",
      "bubble.typeLabel": "\uC785\uB825\uD574\uC11C \uB9D0\uD558\uAE30",
      "bubble.expand": "\uB300\uD654 \uD398\uC774\uC9C0\uC5D0\uC11C \uACC4\uC18D \uC4F0\uAE30",
      "bubble.removeImage": "\uC774\uBBF8\uC9C0 \uC81C\uAC70",
      "bubble.tooManyImages": "\uC785\uB825\uCC3D\uC5D0\uB294 \uC774\uBBF8\uC9C0\uB97C \uCD5C\uB300 {max}\uC7A5\uAE4C\uC9C0 \uB123\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4",
      "bubble.imageUnreadable": "\uC774 \uC774\uBBF8\uC9C0\uB97C \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
      "bubble.imageTooLarge": "\uC774 \uC774\uBBF8\uC9C0\uB294 \uD06C\uAE30\uB97C \uC904\uC778 \uB4A4\uC5D0\uB3C4 {mb}MB\uB97C \uB118\uC2B5\uB2C8\uB2E4",
      "bubble.imagesUnseen": "\uD604\uC7AC \uBAA8\uB378\uC740 \uC774\uBBF8\uC9C0\uB97C \uBCFC \uC218 \uC5C6\uC5B4 {bot}\uC5D0\uAC8C\uB294 \uBCF4\uB0B8 \uC774\uBBF8\uC9C0 \uC218\uB9CC \uC804\uB2EC\uB429\uB2C8\uB2E4.",
      // what the person said: a sentence being heard; how many images a chat-page message carries
      "heard.more": "\uB4E3\uB294 \uC911\u2026",
      "heard.listening": "\uB4E3\uB294 \uC911\u2026",
      "heard.cancel": "\uCDE8\uC18C",
      "said.images": "\uC774\uBBF8\uC9C0 \xD7{count}",
      // the status bubble: added when the same kind of thing was done several times
      "status.more": " \uC678 {others}\uAC1C",
      "status.thinking": "\uC0DD\uAC01 \uC911",
      // the menu and the hover buttons
      "roam.off": "\uC81C\uC790\uB9AC",
      "roam.calm": "\uAC00\uB054",
      "roam.free": "\uC790\uC8FC",
      "action.chat": "\uC785\uB825\uD574\uC11C \uC800\uC640 \uB300\uD654\uD558\uAE30",
      "action.chatDoubleClick": "\uC785\uB825\uD574\uC11C \uC800\uC640 \uB300\uD654\uD558\uAE30(\uC800\uB97C \uB354\uBE14\uD074\uB9AD\uD574\uB3C4 \uB429\uB2C8\uB2E4)",
      "action.voiceOff": "\uC74C\uC131 \uC785\uB825: \uAEBC\uC9D0 \xB7 \uD074\uB9AD\uD558\uC5EC \uCF1C\uAE30",
      "action.voiceNotReady": "\uC74C\uC131 \uC785\uB825: \uCF1C\uC9D0(\uB2E8, {detail}) \xB7 \uD074\uB9AD\uD558\uC5EC \uB044\uAE30",
      "action.voiceNoService": "\uC74C\uC131 \uC778\uC2DD\uC774 \uC900\uBE44\uB418\uC9C0 \uC54A\uC74C",
      "action.voiceOn": "\uC74C\uC131 \uC785\uB825: \uCF1C\uC9D0({mode}) \xB7 {hint}",
      "action.voiceAlways": "\uD56D\uC0C1 \uB4E3\uAE30",
      "action.voiceKey": "\uB9D0\uD558\uAE30 \uD0A4",
      "action.roam": '\uAC77\uAE30: {name} \xB7 \uD074\uB9AD\uD558\uBA74 "{next}" \uBAA8\uB4DC\uB85C',
      "action.themeDark": "\uC57C\uAC04 \uBAA8\uB4DC: \uCF1C\uC9D0 \xB7 \uD074\uB9AD\uD558\uC5EC \uB044\uAE30",
      "action.themeLight": "\uC57C\uAC04 \uBAA8\uB4DC: \uAEBC\uC9D0 \xB7 \uD074\uB9AD\uD558\uC5EC \uCF1C\uAE30",
      "action.soundOn": "\uD6A8\uACFC\uC74C: \uCF1C\uC9D0 \xB7 \uD074\uB9AD\uD558\uC5EC \uB044\uAE30",
      "action.soundOff": "\uD6A8\uACFC\uC74C: \uAEBC\uC9D0 \xB7 \uD074\uB9AD\uD558\uC5EC \uCF1C\uAE30",
      "action.dress": "\uAFB8\uBBF8\uAE30",
      "action.hide": "\uC800\uB97C \uC7A0\uC2DC \uC228\uAE30\uAE30(\uD2B8\uB808\uC774 \uC544\uC774\uCF58\uC73C\uB85C \uB2E4\uC2DC \uBD88\uB7EC\uB0BC \uC218 \uC788\uC2B5\uB2C8\uB2E4)",
      "menu.cancel": "\uCDE8\uC18C",
      "menu.resume": "\uC7AC\uAC1C",
      "menu.pause": "\uC77C\uC2DC \uC911\uC9C0",
      "menu.settings": "\uC124\uC815 \uC5F4\uAE30",
      "theme.toLight": "\uC8FC\uAC04 \uBAA8\uB4DC\uB85C \uC804\uD658",
      "theme.toDark": "\uC57C\uAC04 \uBAA8\uB4DC\uB85C \uC804\uD658",
      // the tray icon's menu while the pet window runs on its own
      "host.show": "\uD3AB \uD45C\uC2DC",
      "host.hide": "\uD3AB \uC228\uAE30\uAE30",
      "host.dress": "\uAFB8\uBBF8\uAE30\u2026",
      "host.close": "\uD3AB \uCC3D \uB2EB\uAE30",
      // why a figure pack did not load (the bot is told)
      "figure.notInstalled": "\uC774 \uC678\uD615\uC740 \uC124\uCE58\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
      "figure.notReady": "\uC678\uD615\uC774 {seconds}\uCD08 \uC548\uC5D0 \uC900\uBE44\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
      "figure.imageFailed": "\uC774\uBBF8\uC9C0\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: {url}",
      "figure.notFunction": "{name}\uC740(\uB294) \uD568\uC218\uAC00 \uC544\uB2D9\uB2C8\uB2E4",
      "figure.missingMethod": "\uC678\uD615\uC5D0 {name}\uC774(\uAC00) \uC5C6\uC2B5\uB2C8\uB2E4",
      // the dressing page
      "dress.title": "\uAFB8\uBBF8\uAE30",
      "dress.preview": "\uBBF8\uB9AC \uBCF4\uAE30",
      "dress.figure": "\uC678\uD615",
      "dress.palette": "\uC0C9\uC0C1",
      "dress.head": "\uBA38\uB9AC \uC704",
      "dress.side": "\uC561\uC138\uC11C\uB9AC",
      "dress.glasses": "\uC548\uACBD",
      "dress.neck": "\uBAA9 \uC7A5\uC2DD",
      "dress.saved": "\uC800\uC7A5\uB428",
      "dress.notSaved": "\uC800\uC7A5 \uC548 \uB428",
      "dress.offline": "\uC800\uC7A5 \uC548 \uB428: \uD3AB \uC11C\uBE44\uC2A4\uC5D0 \uC5F0\uACB0\uD560 \uC218 \uC5C6\uC74C",
      "dress.main": "\uBA54\uC778",
      "dress.accent": "\uD3EC\uC778\uD2B8",
      "dress.colorOf": "{channel}: {color}",
      "dress.dropHint": "\uB193\uC73C\uBA74 \uC678\uD615 \uD329\uC744 \uAC00\uC838\uC635\uB2C8\uB2E4",
      "color.body": "\uBAB8 \uC0C9 \uB530\uB77C\uAC00\uAE30",
      "color.eye": "\uB208 \uC0C9 \uB530\uB77C\uAC00\uAE30",
      "color.mint": "\uBBFC\uD2B8",
      "color.leaf": "\uC78E\uC0C8 \uCD08\uB85D",
      "color.lemon": "\uB808\uBAAC",
      "color.fox": "\uBD89\uC740 \uC5EC\uC6B0",
      "color.claude": "Claude",
      "color.rose": "\uBC9A\uAF43 \uBD84\uD64D",
      "color.purple": "\uD5C8\uC2DD \u300C\uC790\u300D",
      "color.navigator": "\uB0B4\uBE44\uAC8C\uC774\uD130",
      "color.holo": "\uD640\uB85C \uBE14\uB8E8",
      // the dressing page: importing figure packs
      "import.button": "\uAC00\uC838\uC624\uAE30",
      "import.replaceTitle": "\uAE30\uC874 \uC678\uD615 \uD329\uC744 \uAD50\uCCB4\uD560\uAE4C\uC694?",
      "import.replaceText": "\uAD50\uCCB4\uD558\uBA74 \uC124\uCE58 \uD3F4\uB354\uC5D0 \uC788\uB294 \uD574\uB2F9 \uD329\uC758 \uAE30\uC874 \uD30C\uC77C\uC774 \uC0AD\uC81C\uB429\uB2C8\uB2E4.",
      "import.replace": "\uAD50\uCCB4",
      "import.title": "\uC678\uD615 \uD329 \uAC00\uC838\uC624\uAE30",
      "import.unloaded": "\uBD88\uB7EC\uC624\uC9C0 \uBABB\uD55C \uC678\uD615 \uD329: {n}\uAC1C",
      "import.reason": ": {reason}",
      "import.ok": "\uD655\uC778",
      "import.cancel": "\uCDE8\uC18C",
      "import.noneTitle": "\uC678\uD615 \uD329\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4",
      "import.noneText": "\uC120\uD0DD\uD55C \uC704\uCE58\uC5D0\uC11C {depth}\uB2E8\uACC4 \uC544\uB798\uAE4C\uC9C0 figure.json\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
      "import.tooBigTitle": "\uB108\uBB34 \uD07D\uB2C8\uB2E4",
      "import.tooBigText": "\uD55C \uBC88\uC5D0 \uCD5C\uB300 {max}\uAE4C\uC9C0 \uAC00\uC838\uC62C \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC774\uBC88 \uD56D\uBAA9\uC740 {size}\uC785\uB2C8\uB2E4.",
      "import.reading": "\uC77D\uB294 \uC911\u2026",
      "import.failed": "\uAC00\uC838\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4",
      "import.offline": "\uD3AB \uC11C\uBE44\uC2A4\uC5D0 \uC5F0\uACB0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
      "import.found": "\uCC3E\uC740 \uC678\uD615 \uD329: {n}\uAC1C",
      "import.allBad": "\uC774 \uC678\uD615 \uD329\uC740 \uAC00\uC838\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
      "import.version": "\uBC84\uC804 {version}",
      "import.contents": "\uC758\uC0C1 \uADF8\uB8F9: {axes} \xB7 \uD45C\uC815\uACFC \uB3D9\uC791: {words} \xB7 \uD6A8\uACFC\uC74C: {sounds}",
      "import.credit": "{role}: {name}",
      "import.creditSep": "; ",
      "import.reinstall": "{version} \uBC84\uC804\uC774 \uC774\uBBF8 \uC124\uCE58\uB418\uC5B4 \uC788\uC5B4 \uB2E4\uC2DC \uC124\uCE58\uD569\uB2C8\uB2E4",
      "import.upgrade": "{installed} \uBC84\uC804\uC774 \uC124\uCE58\uB418\uC5B4 \uC788\uC73C\uBA70 {version} \uBC84\uC804\uC73C\uB85C \uBC14\uB01D\uB2C8\uB2E4",
      "import.skipped": "\uC774 \uBC84\uC804\uC5D0\uC11C \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uBD80\uBD84 {n}\uAC1C",
      "import.someBad": "\uB2E4\uC74C \uD56D\uBAA9\uC740 \uAC00\uC838\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4:",
      "import.pickedLevel": "\uC120\uD0DD\uD55C \uD3F4\uB354",
      "import.done": "\uAC00\uC838\uC654\uC2B5\uB2C8\uB2E4: {names}",
      "import.nameSep": ", ",
      "import.replacing": ". \uC0AC\uC6A9 \uC911\uC778 \uC678\uD615\uC740 \uB2E4\uC74C\uC5D0 \uBD88\uB7EC\uC62C \uB54C \uC5C5\uB370\uC774\uD2B8\uB429\uB2C8\uB2E4",
      "import.lead": "figure.json\uC774 \uB4E4\uC5B4 \uC788\uB294 \uD3F4\uB354\uB098 \uADF8 \uD3F4\uB354\uB97C \uB2F4\uC740 zip \uD30C\uC77C\uC744 \uC120\uD0DD\uD558\uC138\uC694.",
      "import.pickZip": "zip \uD30C\uC77C \uC120\uD0DD",
      "import.pickDir": "\uD3F4\uB354 \uC120\uD0DD",
      "import.dropNote": "\uB04C\uC5B4\uB2E4 \uB193\uC544\uB3C4 \uB429\uB2C8\uB2E4.",
      "import.cannot": "\uAC00\uC838\uC62C \uC218 \uC5C6\uC74C",
      "import.dropOne": "zip \uD30C\uC77C\uC740 \uD55C \uBC88\uC5D0 \uD558\uB098\uB9CC, \uB610\uB294 \uD3F4\uB354\uB97C \uB04C\uC5B4\uB2E4 \uB193\uC73C\uC138\uC694.",
      "import.readFailed": "\uD30C\uC77C\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4",
      // the dressing page: uninstalling figure packs
      "remove.label": "{name} \uC81C\uAC70",
      "remove.title": "{name}\uC744(\uB97C) \uC81C\uAC70\uD560\uAE4C\uC694?",
      "remove.lead": "\uC774 \uD329\uC758 \uD30C\uC77C\uC774 \uC0AD\uC81C\uB418\uBA70, \uB2E4\uC2DC \uC4F0\uB824\uBA74 \uB2E4\uC2DC \uAC00\uC838\uC640\uC57C \uD569\uB2C8\uB2E4. \uD3AB\uC774 \uC0AC\uC6A9 \uC911\uC774\uBA74 Coo\uB85C \uB3CC\uC544\uAC11\uB2C8\uB2E4.",
      "remove.go": "\uC81C\uAC70",
      "remove.failed": "\uC81C\uAC70\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4",
      "remove.done": "\uC81C\uAC70\uD588\uC2B5\uB2C8\uB2E4: {name}"
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/pt-BR.js
var pt_BR_exports = {};
__export(pt_BR_exports, {
  default: () => pt_BR_default
});
var pt_BR_default;
var init_pt_BR = __esm({
  "D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/pt-BR.js"() {
    pt_BR_default = {
      // the pet page
      "pet.title": "Pet do Cortico",
      "bubble.close": "Fechar",
      "bubble.skip": "Pular",
      "bubble.ownPlaceholder": "Digite sua resposta\u2026",
      "bubble.ownLabel": "Escreva sua pr\xF3pria resposta",
      "bubble.send": "Enviar",
      "bubble.peek": "Mostrar",
      "bubble.typePlaceholder": "Digite uma mensagem\u2026",
      "bubble.typeLabel": "Digite para falar",
      "bubble.expand": "Continuar na p\xE1gina Chat",
      "bubble.removeImage": "Remover imagem",
      "bubble.tooManyImages": "No m\xE1ximo {max} imagens na caixa",
      "bubble.imageUnreadable": "N\xE3o foi poss\xEDvel ler esta imagem",
      "bubble.imageTooLarge": "Esta imagem ainda excede {mb}MB ap\xF3s o redimensionamento",
      "bubble.imagesUnseen": "O modelo atual n\xE3o consegue ver imagens; {bot} s\xF3 fica sabendo quantas voc\xEA enviou.",
      // what the person said: a sentence being heard; how many images a chat-page message carries
      "heard.more": "Ouvindo\u2026",
      "heard.listening": "Ouvindo\u2026",
      "heard.cancel": "Cancelar",
      "said.images": "Imagens \xD7{count}",
      // the status bubble: added when the same kind of thing was done several times
      "status.more": " e mais {others}",
      "status.thinking": "Pensando",
      // the menu and the hover buttons
      "roam.off": "Sem se mexer",
      "roam.calm": "De vez em quando",
      "roam.free": "Com frequ\xEAncia",
      "action.chat": "Digite para falar comigo",
      "action.chatDoubleClick": "Digite para falar comigo (ou clique duas vezes em mim)",
      "action.voiceOff": "Entrada de voz: desligada \xB7 clique para ligar",
      "action.voiceNotReady": "Entrada de voz: ligada, mas {detail} \xB7 clique para desligar",
      "action.voiceNoService": "o reconhecimento de voz n\xE3o est\xE1 pronto",
      "action.voiceOn": "Entrada de voz: ligada ({mode}) \xB7 {hint}",
      "action.voiceAlways": "sempre ouvindo",
      "action.voiceKey": "tecla para falar",
      "action.roam": "Passeios: {name} \xB7 clique para mudar para \u201C{next}\u201D",
      "action.themeDark": "Modo noturno: ligado \xB7 clique para desligar",
      "action.themeLight": "Modo noturno: desligado \xB7 clique para ligar",
      "action.soundOn": "Sons: ligados \xB7 clique para desligar",
      "action.soundOff": "Sons: desligados \xB7 clique para ligar",
      "action.dress": "Guarda-roupa",
      "action.hide": "Me esconda por enquanto (o \xEDcone da bandeja me traz de volta)",
      "menu.cancel": "Cancelar",
      "menu.resume": "Retomar",
      "menu.pause": "Pausar",
      "menu.settings": "Abrir configura\xE7\xF5es",
      "theme.toLight": "Mudar para o modo dia",
      "theme.toDark": "Mudar para o modo noite",
      // the tray icon's menu while the pet window runs on its own
      "host.show": "Mostrar o pet",
      "host.hide": "Ocultar o pet",
      "host.dress": "Guarda-roupa\u2026",
      "host.close": "Fechar a janela do pet",
      // why a figure pack did not load (the bot is told)
      "figure.notInstalled": "Este personagem n\xE3o est\xE1 instalado",
      "figure.notReady": "O personagem n\xE3o ficou pronto em {seconds} segundos",
      "figure.imageFailed": "Uma imagem n\xE3o carregou: {url}",
      "figure.notFunction": "{name} n\xE3o \xE9 uma fun\xE7\xE3o",
      "figure.missingMethod": "O personagem n\xE3o tem {name}",
      // the dressing page
      "dress.title": "Guarda-roupa",
      "dress.preview": "Pr\xE9via",
      "dress.figure": "Personagem",
      "dress.palette": "Cores",
      "dress.head": "Cabe\xE7a",
      "dress.side": "Acess\xF3rio",
      "dress.glasses": "\xD3culos",
      "dress.neck": "Pesco\xE7o",
      "dress.saved": "Salvo",
      "dress.notSaved": "N\xE3o foi salvo",
      "dress.offline": "N\xE3o foi salvo: sem conex\xE3o com o servi\xE7o do pet",
      "dress.main": "Principal",
      "dress.accent": "Destaque",
      "dress.colorOf": "{channel}: {color}",
      "dress.dropHint": "Solte para importar o pacote de personagem",
      "color.body": "Igual ao corpo",
      "color.eye": "Igual aos olhos",
      "color.mint": "Menta",
      "color.leaf": "Verde-folha",
      "color.lemon": "Lim\xE3o",
      "color.fox": "Raposa-vermelha",
      "color.claude": "Claude",
      "color.rose": "Rosa-cerejeira",
      "color.purple": "Roxo Vazio",
      "color.navigator": "Navegante",
      "color.holo": "Azul hologr\xE1fico",
      // the dressing page: importing figure packs
      "import.button": "Importar",
      "import.replaceTitle": "Substituir os pacotes de personagem existentes?",
      "import.replaceText": "A substitui\xE7\xE3o exclui os arquivos atuais desses pacotes na pasta de instala\xE7\xE3o.",
      "import.replace": "Substituir",
      "import.title": "Importar pacotes de personagem",
      "import.unloaded": "Pacotes de personagem que n\xE3o carregaram: {n}",
      "import.reason": ": {reason}",
      "import.ok": "OK",
      "import.cancel": "Cancelar",
      "import.noneTitle": "Nenhum pacote de personagem encontrado",
      "import.noneText": "Nenhum figure.json at\xE9 {depth} n\xEDveis abaixo do lugar escolhido.",
      "import.tooBigTitle": "Grande demais",
      "import.tooBigText": "Cada importa\xE7\xE3o aceita no m\xE1ximo {max}; esta tem {size}.",
      "import.reading": "Lendo\u2026",
      "import.failed": "Falha na importa\xE7\xE3o",
      "import.offline": "Sem conex\xE3o com o servi\xE7o do pet.",
      "import.found": "Pacotes de personagem encontrados: {n}",
      "import.allBad": "Estes pacotes de personagem n\xE3o podem ser importados",
      "import.version": "Vers\xE3o {version}",
      "import.contents": "Grupos de roupa: {axes} \xB7 express\xF5es e movimentos: {words} \xB7 sons: {sounds}",
      "import.credit": "{role}: {name}",
      "import.creditSep": "; ",
      "import.reinstall": "A vers\xE3o {version} j\xE1 est\xE1 instalada e ser\xE1 instalada de novo",
      "import.upgrade": "A vers\xE3o {installed} est\xE1 instalada e ser\xE1 substitu\xEDda pela {version}",
      "import.skipped": "{n} partes n\xE3o suportadas por esta vers\xE3o",
      "import.someBad": "Estes n\xE3o podem ser importados:",
      "import.pickedLevel": "A pasta escolhida",
      "import.done": "Importados: {names}",
      "import.nameSep": ", ",
      "import.replacing": ". O personagem em uso \xE9 atualizado na pr\xF3xima vez que carregar",
      "import.lead": "Escolha a pasta com figure.json ou um zip que a contenha.",
      "import.pickZip": "Escolher um arquivo zip",
      "import.pickDir": "Escolher uma pasta",
      "import.dropNote": "Voc\xEA tamb\xE9m pode arrastar e soltar.",
      "import.cannot": "N\xE3o \xE9 poss\xEDvel importar",
      "import.dropOne": "Arraste um zip por vez, ou pastas.",
      "import.readFailed": "N\xE3o foi poss\xEDvel ler os arquivos",
      // the dressing page: uninstalling figure packs
      "remove.label": "Desinstalar {name}",
      "remove.title": "Desinstalar {name}?",
      "remove.lead": "Os arquivos do pacote s\xE3o exclu\xEDdos; importe-o de novo para us\xE1-lo. Se o pacote estiver em uso, o pet volta a ser Coo.",
      "remove.go": "Desinstalar",
      "remove.failed": "Falha na desinstala\xE7\xE3o",
      "remove.done": "Desinstalado: {name}"
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/ru.js
var ru_exports = {};
__export(ru_exports, {
  default: () => ru_default
});
var ru_default;
var init_ru = __esm({
  "D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/ru.js"() {
    ru_default = {
      // the pet page
      "pet.title": "\u041F\u0438\u0442\u043E\u043C\u0435\u0446 Cortico",
      "bubble.close": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
      "bubble.skip": "\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C",
      "bubble.ownPlaceholder": "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u0432\u043E\u0439 \u043E\u0442\u0432\u0435\u0442\u2026",
      "bubble.ownLabel": "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u0432\u043E\u0439 \u043E\u0442\u0432\u0435\u0442",
      "bubble.send": "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C",
      "bubble.peek": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C",
      "bubble.typePlaceholder": "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u2026",
      "bubble.typeLabel": "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435",
      "bubble.expand": "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \xAB\u0427\u0430\u0442\xBB",
      "bubble.removeImage": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435",
      "bubble.tooManyImages": "\u0412 \u043F\u043E\u043B\u0435 \u0432\u0432\u043E\u0434\u0430 \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 {max} \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439",
      "bubble.imageUnreadable": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u044D\u0442\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435",
      "bubble.imageTooLarge": "\u042D\u0442\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043F\u043E\u0441\u043B\u0435 \u0443\u043C\u0435\u043D\u044C\u0448\u0435\u043D\u0438\u044F \u0432\u0441\u0451 \u0435\u0449\u0451 \u0431\u043E\u043B\u044C\u0448\u0435 {mb} \u041C\u0411",
      "bubble.imagesUnseen": "\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u0438\u0434\u0438\u0442 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F; {bot} \u0443\u0437\u043D\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E, \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0432\u044B \u0438\u0445 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u043B\u0438.",
      // what the person said: a sentence being heard; how many images a chat-page message carries
      "heard.more": "\u0421\u043B\u0443\u0448\u0430\u044E\u2026",
      "heard.listening": "\u0421\u043B\u0443\u0448\u0430\u044E\u2026",
      "heard.cancel": "\u041E\u0442\u043C\u0435\u043D\u0430",
      "said.images": "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \xD7{count}",
      // the status bubble: added when the same kind of thing was done several times
      "status.more": " \u0438 \u0435\u0449\u0451 {others}",
      "status.thinking": "\u0414\u0443\u043C\u0430\u044E",
      // the menu and the hover buttons
      "roam.off": "\u041D\u0430 \u043C\u0435\u0441\u0442\u0435",
      "roam.calm": "\u0418\u043D\u043E\u0433\u0434\u0430",
      "roam.free": "\u0427\u0430\u0441\u0442\u043E",
      "action.chat": "\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043C\u043D\u0435",
      "action.chatDoubleClick": "\u041D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u043C\u043D\u0435 (\u0438\u043B\u0438 \u0434\u0432\u0430\u0436\u0434\u044B \u0449\u0451\u043B\u043A\u043D\u0438\u0442\u0435 \u043F\u043E \u043C\u043D\u0435)",
      "action.voiceOff": "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434: \u0432\u044B\u043A\u043B. \xB7 \u043D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
      "action.voiceNotReady": "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434: \u0432\u043A\u043B., \u043D\u043E {detail} \xB7 \u043D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
      "action.voiceNoService": "\u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432\u043E",
      "action.voiceOn": "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434: \u0432\u043A\u043B. ({mode}) \xB7 {hint}",
      "action.voiceAlways": "\u0441\u043B\u0443\u0448\u0430\u044E \u0432\u0441\u0451 \u0432\u0440\u0435\u043C\u044F",
      "action.voiceKey": "\u043F\u043E \u043A\u043B\u0430\u0432\u0438\u0448\u0435",
      "action.roam": "\u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C: {name} \xB7 \u043D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u0431\u0440\u0430\u0442\u044C \xAB{next}\xBB",
      "action.themeDark": "\u041D\u043E\u0447\u043D\u043E\u0439 \u0440\u0435\u0436\u0438\u043C: \u0432\u043A\u043B. \xB7 \u043D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
      "action.themeLight": "\u041D\u043E\u0447\u043D\u043E\u0439 \u0440\u0435\u0436\u0438\u043C: \u0432\u044B\u043A\u043B. \xB7 \u043D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
      "action.soundOn": "\u0417\u0432\u0443\u043A\u0438: \u0432\u043A\u043B. \xB7 \u043D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
      "action.soundOff": "\u0417\u0432\u0443\u043A\u0438: \u0432\u044B\u043A\u043B. \xB7 \u043D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C",
      "action.dress": "\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431",
      "action.hide": "\u0421\u043F\u0440\u044F\u0442\u0430\u0442\u044C \u043C\u0435\u043D\u044F \u043D\u0430 \u0432\u0440\u0435\u043C\u044F (\u0437\u043D\u0430\u0447\u043E\u043A \u0432 \u0442\u0440\u0435\u0435 \u0432\u0435\u0440\u043D\u0451\u0442 \u043C\u0435\u043D\u044F)",
      "menu.cancel": "\u041E\u0442\u043C\u0435\u043D\u0430",
      "menu.resume": "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
      "menu.pause": "\u041F\u0430\u0443\u0437\u0430",
      "menu.settings": "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
      "theme.toLight": "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0440\u0435\u0436\u0438\u043C",
      "theme.toDark": "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043D\u043E\u0447\u043D\u043E\u0439 \u0440\u0435\u0436\u0438\u043C",
      // the tray icon's menu while the pet window runs on its own
      "host.show": "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043F\u0438\u0442\u043E\u043C\u0446\u0430",
      "host.hide": "\u0421\u043A\u0440\u044B\u0442\u044C \u043F\u0438\u0442\u043E\u043C\u0446\u0430",
      "host.dress": "\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431\u2026",
      "host.close": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043E\u043A\u043D\u043E \u043F\u0438\u0442\u043E\u043C\u0446\u0430",
      // why a figure pack did not load (the bot is told)
      "figure.notInstalled": "\u042D\u0442\u043E\u0442 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436 \u043D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D",
      "figure.notReady": "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430 \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0430\u0441\u044C \u0437\u0430 {seconds} \u0441",
      "figure.imageFailed": "\u041D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u043E\u0441\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435: {url}",
      "figure.notFunction": "{name} \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0444\u0443\u043D\u043A\u0446\u0438\u0435\u0439",
      "figure.missingMethod": "\u0423 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430 \u043D\u0435\u0442 {name}",
      // the dressing page
      "dress.title": "\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431",
      "dress.preview": "\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440",
      "dress.figure": "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u0436",
      "dress.palette": "\u0426\u0432\u0435\u0442\u0430",
      "dress.head": "\u0413\u043E\u043B\u043E\u0432\u0430",
      "dress.side": "\u0410\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440",
      "dress.glasses": "\u041E\u0447\u043A\u0438",
      "dress.neck": "\u0428\u0435\u044F",
      "dress.saved": "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E",
      "dress.notSaved": "\u041D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E",
      "dress.offline": "\u041D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: \u043D\u0435\u0442 \u0441\u0432\u044F\u0437\u0438 \u0441\u043E \u0441\u043B\u0443\u0436\u0431\u043E\u0439 \u043F\u0438\u0442\u043E\u043C\u0446\u0430",
      "dress.main": "\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0439",
      "dress.accent": "\u0410\u043A\u0446\u0435\u043D\u0442",
      "dress.colorOf": "{channel}: {color}",
      "dress.dropHint": "\u041E\u0442\u043F\u0443\u0441\u0442\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0430\u043A\u0435\u0442 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430",
      "color.body": "\u041A\u0430\u043A \u0442\u0435\u043B\u043E",
      "color.eye": "\u041A\u0430\u043A \u0433\u043B\u0430\u0437\u0430",
      "color.mint": "\u041C\u044F\u0442\u043D\u044B\u0439",
      "color.leaf": "\u0417\u0435\u043B\u0451\u043D\u044B\u0439 \u043B\u0438\u0441\u0442",
      "color.lemon": "\u041B\u0438\u043C\u043E\u043D\u043D\u044B\u0439",
      "color.fox": "\u0420\u044B\u0436\u0430\u044F \u043B\u0438\u0441\u0430",
      "color.claude": "Claude",
      "color.rose": "\u0420\u043E\u0437\u043E\u0432\u0430\u044F \u0441\u0430\u043A\u0443\u0440\u0430",
      "color.purple": "\u041F\u043E\u043B\u044B\u0439 \u043F\u0443\u0440\u043F\u0443\u0440",
      "color.navigator": "\u0428\u0442\u0443\u0440\u043C\u0430\u043D",
      "color.holo": "\u0413\u043E\u043B\u043E\u0433\u0440\u0430\u0444\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0441\u0438\u043D\u0438\u0439",
      // the dressing page: importing figure packs
      "import.button": "\u0418\u043C\u043F\u043E\u0440\u0442",
      "import.replaceTitle": "\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u043F\u0430\u043A\u0435\u0442\u044B \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0435\u0439?",
      "import.replaceText": "\u041F\u0440\u0438 \u0437\u0430\u043C\u0435\u043D\u0435 \u0438\u0445 \u043F\u0440\u0435\u0436\u043D\u0438\u0435 \u0444\u0430\u0439\u043B\u044B \u0432 \u043F\u0430\u043F\u043A\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438 \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u044B.",
      "import.replace": "\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C",
      "import.title": "\u0418\u043C\u043F\u043E\u0440\u0442 \u043F\u0430\u043A\u0435\u0442\u043E\u0432 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0435\u0439",
      "import.unloaded": "\u041D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u043E\u0441\u044C \u043F\u0430\u043A\u0435\u0442\u043E\u0432 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0435\u0439: {n}",
      "import.reason": ": {reason}",
      "import.ok": "\u041E\u041A",
      "import.cancel": "\u041E\u0442\u043C\u0435\u043D\u0430",
      "import.noneTitle": "\u041F\u0430\u043A\u0435\u0442 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D",
      "import.noneText": "figure.json \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u043D\u0430 \u0433\u043B\u0443\u0431\u0438\u043D\u0435 \u0434\u043E {depth} \u043E\u0442 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u043C\u0435\u0441\u0442\u0430.",
      "import.tooBigTitle": "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439 \u043E\u0431\u044A\u0451\u043C",
      "import.tooBigText": "\u0417\u0430 \u043E\u0434\u0438\u043D \u0438\u043C\u043F\u043E\u0440\u0442 \u043C\u043E\u0436\u043D\u043E \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 {max}; \u0437\u0434\u0435\u0441\u044C {size}.",
      "import.reading": "\u0427\u0442\u0435\u043D\u0438\u0435\u2026",
      "import.failed": "\u0418\u043C\u043F\u043E\u0440\u0442 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F",
      "import.offline": "\u041D\u0435\u0442 \u0441\u0432\u044F\u0437\u0438 \u0441\u043E \u0441\u043B\u0443\u0436\u0431\u043E\u0439 \u043F\u0438\u0442\u043E\u043C\u0446\u0430.",
      "import.found": "\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u0430\u043A\u0435\u0442\u043E\u0432 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0435\u0439: {n}",
      "import.allBad": "\u042D\u0442\u0438 \u043F\u0430\u043A\u0435\u0442\u044B \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0435\u0439 \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
      "import.version": "\u0412\u0435\u0440\u0441\u0438\u044F {version}",
      "import.contents": "\u0413\u0440\u0443\u043F\u043F \u043D\u0430\u0440\u044F\u0434\u043E\u0432: {axes} \xB7 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u0438 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0439: {words} \xB7 \u0437\u0432\u0443\u043A\u043E\u0432: {sounds}",
      "import.credit": "{role}: {name}",
      "import.creditSep": "; ",
      "import.reinstall": "\u0412\u0435\u0440\u0441\u0438\u044F {version} \u0443\u0436\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430 \u0438 \u0431\u0443\u0434\u0435\u0442 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430 \u0437\u0430\u043D\u043E\u0432\u043E",
      "import.upgrade": "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0430 \u0432\u0435\u0440\u0441\u0438\u044F {installed}; \u043E\u043D\u0430 \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u043C\u0435\u043D\u0435\u043D\u0430 \u043D\u0430 {version}",
      "import.skipped": "\u041D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u044D\u0442\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0435\u0439: {n}",
      "import.someBad": "\u042D\u0442\u0438 \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C:",
      "import.pickedLevel": "\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u043F\u0430\u043F\u043A\u0430",
      "import.done": "\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E: {names}",
      "import.nameSep": ", ",
      "import.replacing": ". \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C\u044B\u0439 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0441\u044F \u043F\u0440\u0438 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0435",
      "import.lead": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u0441 figure.json \u0438\u043B\u0438 zip-\u0430\u0440\u0445\u0438\u0432 \u0441 \u043D\u0435\u0439.",
      "import.pickZip": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C zip-\u0444\u0430\u0439\u043B",
      "import.pickDir": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
      "import.dropNote": "\u0422\u0430\u043A\u0436\u0435 \u043C\u043E\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u044C.",
      "import.cannot": "\u0418\u043C\u043F\u043E\u0440\u0442 \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u0435\u043D",
      "import.dropOne": "\u041F\u0435\u0440\u0435\u0442\u0430\u0441\u043A\u0438\u0432\u0430\u0439\u0442\u0435 \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 zip \u0437\u0430 \u0440\u0430\u0437 \u0438\u043B\u0438 \u043F\u0430\u043F\u043A\u0438.",
      "import.readFailed": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B\u044B",
      // the dressing page: uninstalling figure packs
      "remove.label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \xAB{name}\xBB",
      "remove.title": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \xAB{name}\xBB?",
      "remove.lead": "\u0424\u0430\u0439\u043B\u044B \u043F\u0430\u043A\u0435\u0442\u0430 \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u044B; \u0447\u0442\u043E\u0431\u044B \u0441\u043D\u043E\u0432\u0430 \u0438\u043C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F, \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u0435\u0433\u043E \u0437\u0430\u043D\u043E\u0432\u043E. \u0415\u0441\u043B\u0438 \u043F\u0430\u043A\u0435\u0442 \u0441\u0435\u0439\u0447\u0430\u0441 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F, \u043F\u0438\u0442\u043E\u043C\u0435\u0446 \u0441\u043D\u043E\u0432\u0430 \u0441\u0442\u0430\u043D\u0435\u0442 Coo.",
      "remove.go": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
      "remove.failed": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C",
      "remove.done": "\u0423\u0434\u0430\u043B\u0435\u043D\u043E: {name}"
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/zh-Hant.js
var zh_Hant_exports = {};
__export(zh_Hant_exports, {
  default: () => zh_Hant_default
});
var zh_Hant_default;
var init_zh_Hant = __esm({
  "D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n/zh-Hant.js"() {
    zh_Hant_default = {
      // the pet page
      "pet.title": "Cortico \u684C\u5BF5",
      "bubble.close": "\u95DC\u9589",
      "bubble.skip": "\u7565\u904E",
      "bubble.ownPlaceholder": "\u8F38\u5165\u4F60\u7684\u56DE\u7B54\u2026",
      "bubble.ownLabel": "\u81EA\u884C\u586B\u5BEB\u56DE\u7B54",
      "bubble.send": "\u50B3\u9001",
      "bubble.peek": "\u986F\u793A",
      "bubble.typePlaceholder": "\u8F38\u5165\u60F3\u8AAA\u7684\u8A71\u2026",
      "bubble.typeLabel": "\u6253\u5B57\u8AAA\u8A71",
      "bubble.expand": "\u5728\u5C0D\u8A71\u9801\u7E7C\u7E8C\u7DE8\u8F2F",
      "bubble.removeImage": "\u79FB\u9664\u5716\u7247",
      "bubble.tooManyImages": "\u8F38\u5165\u6846\u6700\u591A\u653E {max} \u5F35\u5716",
      "bubble.imageUnreadable": "\u7121\u6CD5\u8B80\u53D6\u9019\u5F35\u5716\u7247",
      "bubble.imageTooLarge": "\u9019\u5F35\u5716\u7247\u7E2E\u5C0F\u5F8C\u4ECD\u8D85\u904E {mb}MB",
      "bubble.imagesUnseen": "\u76EE\u524D\u7684\u6A21\u578B\u770B\u4E0D\u5230\u5716\u7247\uFF0C{bot} \u53EA\u6703\u77E5\u9053\u4F60\u50B3\u4E86\u5E7E\u5F35\u5716\u3002",
      // what the person said: a sentence being heard; how many images a chat-page message carries
      "heard.more": "\u6B63\u5728\u50BE\u807D\u2026",
      "heard.listening": "\u6B63\u5728\u50BE\u807D\u2026",
      "heard.cancel": "\u53D6\u6D88",
      "said.images": "\u5716\u7247 \xD7{count}",
      // the status bubble
      "status.more": " \u548C\u53E6\u5916 {others} \u500B",
      "status.thinking": "\u601D\u8003\u4E2D",
      // the menu and the hover buttons
      "roam.off": "\u4E0D\u4E82\u52D5",
      "roam.calm": "\u591A\u5F85\u8457",
      "roam.free": "\u5E38\u8D70\u52D5",
      "action.chat": "\u6253\u5B57\u548C\u6211\u8AAA\u8A71",
      "action.chatDoubleClick": "\u6253\u5B57\u548C\u6211\u8AAA\u8A71\uFF08\u4E5F\u53EF\u4EE5\u9EDE\u5169\u4E0B\u6211\uFF09",
      "action.voiceOff": "\u8A9E\u97F3\u8F38\u5165\uFF1A\u5DF2\u95DC\u9589 \xB7 \u9EDE\u4E00\u4E0B\u958B\u555F",
      "action.voiceNotReady": "\u8A9E\u97F3\u8F38\u5165\uFF1A\u5DF2\u958B\u555F\uFF0C\u4F46{detail} \xB7 \u9EDE\u4E00\u4E0B\u95DC\u9589",
      "action.voiceNoService": "\u8FA8\u8B58\u670D\u52D9\u5C1A\u672A\u5C31\u7DD2",
      "action.voiceOn": "\u8A9E\u97F3\u8F38\u5165\uFF1A\u5DF2\u958B\u555F\uFF08{mode}\uFF09\xB7 {hint}",
      "action.voiceAlways": "\u81EA\u52D5\u6536\u97F3",
      "action.voiceKey": "\u6309\u9375\u6536\u97F3",
      "action.roam": "\u8D70\u52D5\uFF1A{name} \xB7 \u9EDE\u4E00\u4E0B\u63DB\u6210\u300C{next}\u300D",
      "action.themeDark": "\u591C\u9593\u6A21\u5F0F\uFF1A\u5DF2\u958B\u555F \xB7 \u9EDE\u4E00\u4E0B\u95DC\u9589",
      "action.themeLight": "\u591C\u9593\u6A21\u5F0F\uFF1A\u5DF2\u95DC\u9589 \xB7 \u9EDE\u4E00\u4E0B\u958B\u555F",
      "action.soundOn": "\u97F3\u6548\uFF1A\u5DF2\u958B\u555F \xB7 \u9EDE\u4E00\u4E0B\u95DC\u9589",
      "action.soundOff": "\u97F3\u6548\uFF1A\u5DF2\u95DC\u9589 \xB7 \u9EDE\u4E00\u4E0B\u958B\u555F",
      "action.dress": "\u88DD\u626E",
      "action.hide": "\u5148\u628A\u6211\u85CF\u8D77\u4F86\uFF08\u7CFB\u7D71\u5323\u88E1\u53EF\u4EE5\u53EB\u6211\u56DE\u4F86\uFF09",
      "menu.cancel": "\u53D6\u6D88",
      "menu.resume": "\u7E7C\u7E8C",
      "menu.pause": "\u66AB\u505C",
      "menu.settings": "\u958B\u555F\u8A2D\u5B9A",
      "theme.toLight": "\u5207\u5230\u767D\u5929\u6A21\u5F0F",
      "theme.toDark": "\u5207\u5230\u591C\u9593\u6A21\u5F0F",
      // the tray icon's menu while the pet window runs on its own
      "host.show": "\u986F\u793A\u684C\u5BF5",
      "host.hide": "\u96B1\u85CF\u684C\u5BF5",
      "host.dress": "\u88DD\u626E\u2026",
      "host.close": "\u95DC\u9589\u684C\u5BF5\u8996\u7A97",
      // why a figure pack did not load (the bot is told)
      "figure.notInstalled": "\u6C92\u6709\u5B89\u88DD\u9019\u500B\u5F62\u8C61",
      "figure.notReady": "\u5F62\u8C61 {seconds} \u79D2\u5167\u6C92\u6709\u6E96\u5099\u597D",
      "figure.imageFailed": "\u5716\u7247\u6C92\u6709\u8F09\u5165\uFF1A{url}",
      "figure.notFunction": "{name} \u4E0D\u662F\u51FD\u5F0F",
      "figure.missingMethod": "\u5F62\u8C61\u6C92\u6709 {name}",
      // the dressing page
      "dress.title": "\u684C\u5BF5\u88DD\u626E",
      "dress.preview": "\u9810\u89BD",
      "dress.figure": "\u5F62\u8C61",
      "dress.palette": "\u914D\u8272",
      "dress.head": "\u982D\u9802",
      "dress.side": "\u914D\u4EF6",
      "dress.glasses": "\u773C\u93E1",
      "dress.neck": "\u9838\u98FE",
      "dress.saved": "\u5DF2\u5132\u5B58",
      "dress.notSaved": "\u6C92\u6709\u5132\u5B58",
      "dress.offline": "\u6C92\u6709\u5132\u5B58\uFF1A\u9023\u4E0D\u4E0A\u684C\u5BF5\u670D\u52D9",
      "dress.main": "\u4E3B\u8272",
      "dress.accent": "\u9EDE\u7DB4",
      "dress.colorOf": "{channel}\uFF1A{color}",
      "dress.dropHint": "\u653E\u958B\u4EE5\u532F\u5165\u5F62\u8C61\u5305",
      "color.body": "\u8DDF\u96A8\u8EAB\u9AD4",
      "color.eye": "\u8DDF\u96A8\u773C\u775B",
      "color.mint": "\u8584\u8377\u7DA0",
      "color.leaf": "\u8449\u7DA0",
      "color.lemon": "\u6AB8\u6AAC\u9EC3",
      "color.fox": "\u7D05\u72D0\u72F8",
      "color.claude": "\u514B\u52DE\u5FB7",
      "color.rose": "\u6AFB\u7C89",
      "color.purple": "\u865B\u5F0F\u8308",
      "color.navigator": "\u9818\u822A\u54E1",
      "color.holo": "\u5168\u50CF\u85CD",
      // the dressing page: importing figure packs
      "import.button": "\u532F\u5165",
      "import.replaceTitle": "\u66FF\u63DB\u5DF2\u6709\u7684\u5F62\u8C61\u5305\uFF1F",
      "import.replaceText": "\u66FF\u63DB\u6703\u522A\u9664\u5B89\u88DD\u76EE\u9304\u4E2D\u9019\u4E9B\u5F62\u8C61\u5305\u7684\u539F\u6709\u6A94\u6848\u3002",
      "import.replace": "\u66FF\u63DB",
      "import.title": "\u532F\u5165\u5F62\u8C61\u5305",
      "import.unloaded": "\u6709 {n} \u500B\u5F62\u8C61\u5305\u6C92\u6709\u8F09\u5165",
      "import.reason": "\uFF1A{reason}",
      "import.ok": "\u597D",
      "import.cancel": "\u53D6\u6D88",
      "import.noneTitle": "\u6C92\u6709\u627E\u5230\u5F62\u8C61\u5305",
      "import.noneText": "\u6240\u9078\u4F4D\u7F6E\u5F80\u4E0B {depth} \u5C64\u5167\u6C92\u6709 figure.json\u3002",
      "import.tooBigTitle": "\u592A\u5927\u4E86",
      "import.tooBigText": "\u55AE\u6B21\u6700\u591A\u532F\u5165 {max}\uFF0C\u672C\u6B21\u70BA {size}\u3002",
      "import.reading": "\u6B63\u5728\u8B80\u53D6\u2026",
      "import.failed": "\u7121\u6CD5\u532F\u5165",
      "import.offline": "\u9023\u4E0D\u4E0A\u684C\u5BF5\u670D\u52D9\u3002",
      "import.found": "\u627E\u5230 {n} \u500B\u5F62\u8C61\u5305",
      "import.allBad": "\u9019\u4E9B\u5F62\u8C61\u5305\u7121\u6CD5\u532F\u5165",
      "import.version": "\u7248\u672C {version}",
      "import.contents": "{axes} \u7D44\u88DD\u626E\u3001{words} \u500B\u8868\u60C5\u548C\u52D5\u4F5C\u3001{sounds} \u500B\u97F3\u6548",
      "import.credit": "{role}\uFF1A{name}",
      "import.creditSep": "\uFF1B",
      "import.reinstall": "\u5DF2\u5B89\u88DD {version}\uFF0C\u5C07\u91CD\u65B0\u5B89\u88DD",
      "import.upgrade": "\u5DF2\u5B89\u88DD {installed}\uFF0C\u5C07\u66F4\u65B0\u70BA {version}",
      "import.skipped": "{n} \u9805\u5167\u5BB9\u76EE\u524D\u7248\u672C\u4E0D\u652F\u63F4",
      "import.someBad": "\u9019\u4E9B\u7121\u6CD5\u532F\u5165\uFF1A",
      "import.pickedLevel": "\u6240\u9078\u7684\u90A3\u4E00\u5C64",
      "import.done": "\u5DF2\u532F\u5165\uFF1A{names}",
      "import.nameSep": "\u3001",
      "import.replacing": "\u3002\u6B63\u5728\u4F7F\u7528\u7684\u5F62\u8C61\u5C07\u5728\u4E0B\u6B21\u8F09\u5165\u6642\u66F4\u65B0",
      "import.lead": "\u9078\u64C7 figure.json \u6240\u5728\u7684\u8CC7\u6599\u593E\uFF0C\u6216\u5305\u542B\u5B83\u7684 zip \u58D3\u7E2E\u6A94\u3002",
      "import.pickZip": "\u9078\u64C7 zip \u6A94",
      "import.pickDir": "\u9078\u64C7\u8CC7\u6599\u593E",
      "import.dropNote": "\u4E5F\u53EF\u4EE5\u76F4\u63A5\u62D6\u5165\u3002",
      "import.cannot": "\u7121\u6CD5\u532F\u5165",
      "import.dropOne": "\u6BCF\u6B21\u53EA\u80FD\u62D6\u5165\u4E00\u500B zip\uFF0C\u6216\u62D6\u5165\u8CC7\u6599\u593E\u3002",
      "import.readFailed": "\u7121\u6CD5\u8B80\u53D6",
      // the dressing page: uninstalling figure packs
      "remove.label": "\u89E3\u9664\u5B89\u88DD\u300C{name}\u300D",
      "remove.title": "\u89E3\u9664\u5B89\u88DD\u300C{name}\u300D\uFF1F",
      "remove.lead": "\u9019\u500B\u5F62\u8C61\u5305\u7684\u6A94\u6848\u6703\u88AB\u522A\u9664\uFF0C\u518D\u6B21\u4F7F\u7528\u9700\u8981\u91CD\u65B0\u532F\u5165\u3002\u684C\u5BF5\u6B63\u5728\u4F7F\u7528\u5B83\u6642\u6703\u63DB\u56DE Coo\u3002",
      "remove.go": "\u89E3\u9664\u5B89\u88DD",
      "remove.failed": "\u7121\u6CD5\u89E3\u9664\u5B89\u88DD",
      "remove.done": "\u5DF2\u89E3\u9664\u5B89\u88DD\uFF1A{name}"
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n.js
init_zh();
init_en();

// import("./i18n/**/*.js") in D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n.js
var globImport_i18n_js = __glob({
  "./i18n/de.js": () => Promise.resolve().then(() => (init_de(), de_exports)),
  "./i18n/en.js": () => Promise.resolve().then(() => (init_en(), en_exports)),
  "./i18n/es-419.js": () => Promise.resolve().then(() => (init_es_419(), es_419_exports)),
  "./i18n/fr.js": () => Promise.resolve().then(() => (init_fr(), fr_exports)),
  "./i18n/it.js": () => Promise.resolve().then(() => (init_it(), it_exports)),
  "./i18n/ja.js": () => Promise.resolve().then(() => (init_ja(), ja_exports)),
  "./i18n/ko.js": () => Promise.resolve().then(() => (init_ko(), ko_exports)),
  "./i18n/pt-BR.js": () => Promise.resolve().then(() => (init_pt_BR(), pt_BR_exports)),
  "./i18n/ru.js": () => Promise.resolve().then(() => (init_ru(), ru_exports)),
  "./i18n/zh-Hant.js": () => Promise.resolve().then(() => (init_zh_Hant(), zh_Hant_exports)),
  "./i18n/zh.js": () => Promise.resolve().then(() => (init_zh(), zh_exports))
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/i18n.js
var current = "zh";
var table = zh_default;
var fallback = zh_default;
var loads = 0;
var htmlLang = (code) => code === "zh" ? "zh-CN" : code;
var codeOf = (lang) => !lang || lang === "zh-CN" ? "zh" : lang;
async function useLanguage(code = codeOf(document.documentElement.lang)) {
  const load = ++loads;
  const back = code === "zh" || code === "zh-Hant" ? zh_default : en_default;
  let own = code === "zh" ? zh_default : code === "en" ? en_default : null;
  if (!own && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(code)) {
    try {
      own = (await globImport_i18n_js(`./i18n/${code}.js`)).default;
    } catch {
      own = null;
    }
  }
  if (load !== loads) return;
  current = code;
  fallback = back;
  table = own ?? back;
  document.documentElement.lang = htmlLang(code);
}
var language = () => current;
function t(key, vars) {
  const s = table[key] ?? fallback[key] ?? en_default[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => k in vars ? String(vars[k]) : m) : s;
}

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/ui.js
var f = (n) => Math.round(n * 10) / 10;
var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function urlRanges(text) {
  const out = [];
  for (const m of text.matchAll(/https?:\/\/[!-~]+/g)) {
    let url = m[0];
    while (/[.,;:!?'"]$/.test(url) || /[)\]}>]$/.test(url) && count(url, OPENERS[url.at(-1)]) < count(url, url.at(-1))) url = url.slice(0, -1);
    try {
      new URL(url);
    } catch {
      continue;
    }
    out.push([m.index, m.index + url.length]);
  }
  return out;
}
var OPENERS = { ")": "(", "]": "[", "}": "{", ">": "<" };
var count = (s, c) => s.split(c).length - 1;
function linked(text, n = text.length, doc = document) {
  const frag = doc.createDocumentFragment();
  let at2 = 0;
  for (const [start, end] of urlRanges(text)) {
    if (end > n) break;
    const a = Object.assign(doc.createElement("a"), { href: text.slice(start, end), target: "_blank", rel: "noopener noreferrer" });
    a.textContent = text.slice(start, end);
    frag.append(text.slice(at2, start), a);
    at2 = end;
  }
  frag.append(text.slice(at2, n));
  return frag;
}
var icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
var gear = icon(`<path d="${Array.from({ length: 32 }, (_, i) => {
  const a = (i - 0.5) * Math.PI / 16, r = i % 4 < 2 ? 9.6 : 7.2;
  return `${i ? "L" : "M"}${f(12 + r * Math.cos(a))} ${f(12 + r * Math.sin(a))}`;
}).join("")}Z"/><circle cx="12" cy="12" r="3"/>`);
var ICONS = {
  chat: icon('<path d="M6 4.5h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-6l-4.5 3.5v-3.5H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z"/>'),
  moon: icon('<path d="M20 14.6A8.2 8.2 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z"/>'),
  sun: icon('<circle cx="12" cy="12" r="4"/><path d="M12 2.8v1.6M12 19.6v1.6M2.8 12h1.6M19.6 12h1.6M5.5 5.5l1.1 1.1M17.4 17.4l1.1 1.1M5.5 18.5l1.1-1.1M17.4 6.6l1.1-1.1"/>'),
  play: icon('<path d="M8 5.5v13l10.5-6.5z"/>'),
  pause: icon('<path d="M9 5.5v13M15 5.5v13"/>'),
  settings: gear,
  power: icon('<path d="M12 3.5v8M7.2 6.3a8 8 0 1 0 9.6 0"/>'),
  mic: icon('<rect x="8.5" y="3" width="7" height="11.5" rx="3.5"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  // the same microphone struck through
  micOff: icon('<rect x="8.5" y="3" width="7" height="11.5" rx="3.5"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16"/>'),
  sound: icon('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  soundOff: icon('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  // a T-shirt: the dressing page
  shirt: icon('<path d="M8.5 3.5 4 6l-1.5 4.5L6 12v8.5h12V12l3.5-1.5L20 6l-4.5-2.5a3.5 3.5 0 0 1-7 0z"/>'),
  eye: icon('<path d="M3 12s3.2-6 9-6 9 6 9 6-3.2 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="3"/>'),
  // the chat page: the typing box's button that carries the draft there, and the mark on what was sent from it
  expand: icon('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'),
  // a page that opens in the browser
  external: icon('<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
  eyeOff: icon('<path d="M3 12s3.2-6 9-6c1.6 0 3 .4 4.2 1M21 12s-3.2 6-9 6c-1.6 0-3-.4-4.2-1"/><path d="M9.9 14.1a3 3 0 0 1 4.2-4.2M4 4l16 16"/>'),
  // how much the pet walks on its own, as a gauge: low, middle, high
  roam_off: icon('<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16 7 13.2"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/>'),
  roam_calm: icon('<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16V10"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/>'),
  roam_free: icon('<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l5-2.8"/><circle cx="12" cy="16" r="1.2" fill="currentColor"/><path d="M19.5 6.5l1.5-1.5M21 10h1.5"/>'),
  // the personas the introduction offers (pet.css gives each its move when picked): a magnifier, a goblet, a hammer,
  // a heart, a snowflake, the whale with its spout
  persona_coo: icon('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>'),
  persona_grail: icon('<path d="M6.5 4h11v3.5a5.5 5.5 0 0 1-11 0z"/><path d="M12 13v6M8 20h8"/>'),
  persona_forge: icon('<path d="M12.5 5.5l3-3 5 5-3 3z"/><path d="M14 9l-9.5 9.5"/>'),
  persona_heart: icon('<path d="M12 19.5s-7-4.3-7-9.6a3.9 3.9 0 0 1 7-2.4 3.9 3.9 0 0 1 7 2.4c0 5.3-7 9.6-7 9.6z"/>'),
  persona_winter: icon('<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5L12 6l2.5-1.5M9.5 19.5L12 18l2.5 1.5"/>'),
  persona_whale: icon('<path d="M3 13c0-3 2.6-5 6.5-5 3.3 0 5.4 1.6 7 3.3.8.8 1.6 1.2 2.5 1.2"/><path d="M3 13c0 3.1 3 5 7.5 5 4.4 0 7.5-2.2 8.5-5.5"/><path d="M19 12.5c.2-1.8 1-3.2 2.5-4-1.6-.2-2.8.3-3.6 1.4-.4-1.4-1.4-2.2-3-2.4"/><path class="spout" d="M8 5.5V3.5M6.3 4.3 8 5.5l1.7-1.2"/><circle cx="7" cy="12" r=".6" fill="currentColor"/>'),
  // activity above the pet; separate parts let each small icon move in its own way
  status_think: icon('<circle cx="4" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="20" cy="12" r="1.5"/>'),
  status_read: icon('<path d="M6 3h9l4 4v14H6zM14 3v5h5"/><path class="scan" d="M9 11h7"/>'),
  status_browse: icon('<path d="M3 19V5h7l2 3h9v11"/><path class="flap" d="M3 19 5 10h17l-3 9z"/>'),
  status_search: icon('<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>'),
  status_write: icon('<path d="m5 15 11-11 4 4L9 19l-5 1zM13 7l4 4M5 15l4 4"/>'),
  status_delete: icon('<path d="m6 8 1 13h10l1-13M10 11v6M14 11v6"/><path class="lid" d="M4 6h16M9 6V3h6v3"/>'),
  status_save: icon('<path d="M4 15v6h16v-6"/><path class="arrow" d="M12 3v12m-4-4 4 4 4-4"/>'),
  status_look: icon('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle class="pupil" cx="12" cy="12" r="2.5"/>'),
  status_click: icon('<path d="m5 3 3 17 4-6 7-2z"/><path class="ripple" d="M3 7H1M8 2V1M2 2l1 1"/>'),
  status_scroll: icon('<rect x="5" y="2" width="14" height="20" rx="7"/><path class="wheel" d="M12 6v5m-2-3 2-2 2 2"/>'),
  status_type: icon('<path d="M3 20h18"/><g class="keycap"><rect x="5" y="4" width="14" height="12" rx="3"/><path d="M9 8h6m-3 0v5"/></g>'),
  status_wait: icon('<path d="M5 3h14M5 21h14M7 3v4l10 10v4M17 3v4L7 17v4M9 6h6M9 19h6"/>'),
  status_alarm: icon('<circle cx="12" cy="13" r="7"/><path d="M12 9v4l3 2M3 5l3-3M18 2l3 3M7 20l-2 2M17 20l2 2"/>'),
  status_work: gear,
  trash: icon('<path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l1 13.5h9l1-13.5M10 10.5v6M14 10.5v6"/>')
};
function applyTheme(theme, button) {
  document.documentElement.dataset.theme = theme;
  if (button) themeButton(theme, button);
}
function themeButton(theme, button) {
  const toLight = theme === "dark";
  button.innerHTML = toLight ? ICONS.sun : ICONS.moon;
  button.title = t(toLight ? "theme.toLight" : "theme.toDark");
  button.setAttribute("aria-label", button.title);
}

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/sound.js
var SOUND_KINDS = {
  move: ["step", "skid", "jump", "land", "whoosh", "chirps", "shake", "nod", "spin", "shiver", "dance", "look"],
  touch: ["grab", "squeak", "purr", "poke"],
  face: ["happy", "wink", "love", "surprised", "angry", "sad", "shy", "yawn"],
  snore: ["snore"],
  talk: ["babble", "blub"],
  ui: ["tick", "pop", "sparkle", "select", "listenStart", "listenEnd"]
};
var BODY_SOUND_KINDS = ["move", "touch", "face", "snore"];
var PAN_STEP = 0.01;
var KIND_OF = Object.fromEntries(Object.entries(SOUND_KINDS).flatMap(([kind, names]) => names.map((n) => [n, kind])));
function createSfx({ storageKey = "cortico-pet.sound.v1", volume = 0.55 } = {}) {
  let ctx = null, master = null, unlocked = false, on = true, noiseBuf = null, gainValue = volume;
  let panner = null, pan = 0;
  let muted = /* @__PURE__ */ new Set(), snoreSeconds = 0;
  let shown = true;
  try {
    on = localStorage.getItem(storageKey) !== "off";
  } catch (e) {
  }
  const R = (a, b) => a + Math.random() * (b - a);
  function ready() {
    if (!on || !unlocked || !shown || document.hidden) return null;
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      master = ctx.createGain();
      master.gain.value = gainValue;
      const comp = ctx.createDynamicsCompressor();
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        panner.pan.value = pan;
        master.connect(panner);
        panner.connect(comp);
      } else master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    for (const o of own.values()) decode(o);
    return ctx;
  }
  function tone({ type = "sine", f0 = 440, f1 = f0, dur = 0.1, vol = 0.2, at: at2 = 0, attack = 5e-3, vib = 0, vibRate = 0, filter = 0 }) {
    const c = ready();
    if (!c) return;
    const t0 = c.currentTime + at2, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    if (vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = vibRate;
      lg.gain.value = vib;
      l.connect(lg);
      lg.connect(o.frequency);
      l.start(t0);
      l.stop(t0 + dur + 0.05);
    }
    g.gain.setValueAtTime(1e-4, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(1e-4, t0 + dur);
    let node = o;
    if (filter) {
      const bq = c.createBiquadFilter();
      bq.type = "lowpass";
      bq.frequency.value = filter;
      o.connect(bq);
      node = bq;
    }
    node.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }
  function noise({ type = "bandpass", f0 = 1e3, f1 = f0, q = 1, dur = 0.2, vol = 0.15, at: at2 = 0, attack = 0.01 }) {
    const c = ready();
    if (!c) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = c.currentTime + at2, s = c.createBufferSource(), bq = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf;
    bq.type = type;
    bq.Q.value = q;
    bq.frequency.setValueAtTime(f0, t0);
    bq.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(1e-4, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(1e-4, t0 + dur);
    s.connect(bq);
    bq.connect(g);
    g.connect(master);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.03);
  }
  let own = /* @__PURE__ */ new Map();
  let voice = { talk: [], pitch: 1 };
  function decode(o) {
    if (o.buffer || o.decoding || !ctx) return;
    o.decoding = o.bytes.then((b) => ctx.decodeAudioData(b.slice(0))).then((buf) => {
      o.buffer = buf;
    }, (err) => console.error(`\u97F3\u6548 ${o.name} \u6CA1\u80FD\u89E3\u7801:`, err));
  }
  function playOwn(o, rate = 1) {
    const c = ready();
    if (!c) return;
    if (!o.buffer) {
      decode(o);
      return;
    }
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = o.buffer;
    src.playbackRate.value = rate;
    g.gain.value = o.volume;
    src.connect(g);
    g.connect(master);
    src.start();
  }
  const tones = {
    step(run, i) {
      const k = run ? 1.25 : 1;
      tone({ f0: (i ? 520 : 440) * k, f1: (i ? 380 : 330) * k, dur: 0.06, vol: run ? 0.07 : 0.05 });
      if (run) noise({ f0: 2500, q: 0.8, dur: 0.05, vol: 0.03 });
    },
    skid() {
      noise({ type: "highpass", f0: 1800, f1: 900, dur: 0.22, vol: 0.08 });
    },
    jump() {
      tone({ type: "triangle", f0: 200, f1: 720, dur: 0.24, vol: 0.22, vib: 40, vibRate: 22 });
    },
    land(hard) {
      tone({ f0: hard ? 160 : 190, f1: 48, dur: hard ? 0.28 : 0.16, vol: hard ? 0.4 : 0.25 });
      noise({ type: "lowpass", f0: hard ? 700 : 500, f1: 120, dur: 0.12, vol: hard ? 0.25 : 0.12 });
      if (hard) tone({ type: "square", f0: 420, f1: 300, dur: 0.08, vol: 0.06, at: 0.02, filter: 1600 });
    },
    grab() {
      tone({ type: "triangle", f0: 680, f1: 1500, dur: 0.14, vol: 0.18, vib: 60, vibRate: 30 });
    },
    squeak() {
      tone({ type: "triangle", f0: R(900, 1200), f1: R(1300, 1700), dur: 0.09, vol: 0.08, vib: 40, vibRate: 35 });
    },
    whoosh() {
      noise({ f0: 300, f1: 2400, q: 1.4, dur: 0.38, vol: 0.22, attack: 0.08 });
    },
    chirps() {
      for (let i = 0; i < 3; i++) tone({ f0: 2300 + i * 120, f1: 3200, dur: 0.06, vol: 0.06, at: i * 0.11 });
    },
    shake() {
      for (let i = 0; i < 5; i++) tone({ type: "square", f0: 180, f1: 160, dur: 0.05, vol: 0.05, at: i * 0.06, filter: 900 });
    },
    hmm() {
      tone({ type: "triangle", f0: 330, f1: 360, dur: 0.12, vol: 0.08 });
      tone({ type: "triangle", f0: 392, f1: 470, dur: 0.16, vol: 0.08, at: 0.14 });
    },
    yawn() {
      tone({ type: "triangle", f0: 520, f1: 240, dur: 1, vol: 0.1, vib: 12, vibRate: 5, filter: 1500, attack: 0.15 });
    },
    snore() {
      noise({ type: "lowpass", f0: 250, f1: 700, dur: 0.7, vol: 0.09, attack: 0.35 });
    },
    purr() {
      tone({ type: "sawtooth", f0: 62, f1: 58, dur: 0.9, vol: 0.08, vib: 6, vibRate: 24, filter: 320, attack: 0.1 });
    },
    poke() {
      tone({ f0: 320, f1: 200, dur: 0.09, vol: 0.16 });
    },
    shiver() {
      for (let i = 0; i < 8; i++) tone({ type: "square", f0: 900, f1: 820, dur: 0.03, vol: 0.035, at: i * 0.07, filter: 2400 });
    },
    // looking about hums like the thinking 'hmm', but counts as a motion sound
    look() {
      tones.hmm();
    },
    dance() {
      [523, 659, 784, 659, 880].forEach((fr, i) => tone({ type: "triangle", f0: fr, dur: 0.13, vol: 0.09, at: i * 0.15 }));
    },
    nod() {
      tone({ type: "triangle", f0: 520, f1: 440, dur: 0.07, vol: 0.08 });
      tone({ type: "triangle", f0: 520, f1: 440, dur: 0.07, vol: 0.08, at: 0.2 });
    },
    spin() {
      tone({ type: "triangle", f0: 300, f1: 1200, dur: 0.3, vol: 0.12, vib: 30, vibRate: 18 });
    },
    happy() {
      tone({ type: "triangle", f0: 660, f1: 700, dur: 0.1, vol: 0.14 });
      tone({ type: "triangle", f0: 990, f1: 1050, dur: 0.14, vol: 0.14, at: 0.09 });
    },
    wink() {
      tone({ f0: 1760, dur: 0.5, vol: 0.1 });
      tone({ f0: 2637, dur: 0.45, vol: 0.06, at: 0.04 });
    },
    love() {
      tone({ f0: 480, f1: 820, dur: 0.1, vol: 0.14 });
      tone({ f0: 600, f1: 1e3, dur: 0.12, vol: 0.14, at: 0.13 });
    },
    surprised() {
      tone({ f0: 380, f1: 1500, dur: 0.2, vol: 0.16, vib: 15, vibRate: 12 });
    },
    angry() {
      tone({ type: "sawtooth", f0: 120, f1: 95, dur: 0.5, vol: 0.12, vib: 12, vibRate: 14, filter: 700 });
    },
    sad() {
      tone({ type: "triangle", f0: 440, f1: 392, dur: 0.3, vol: 0.13, vib: 8, vibRate: 6 });
      tone({ type: "triangle", f0: 392, f1: 262, dur: 0.55, vol: 0.13, at: 0.3, vib: 10, vibRate: 5 });
    },
    shy() {
      tone({ f0: 1300, f1: 1600, dur: 0.07, vol: 0.07 });
      tone({ f0: 1450, f1: 1750, dur: 0.07, vol: 0.06, at: 0.1 });
    },
    tick() {
      tone({ f0: 1200, f1: 1e3, dur: 0.03, vol: 0.05 });
    },
    pop() {
      tone({ f0: 240, f1: 720, dur: 0.07, vol: 0.14 });
    },
    sparkle() {
      [1568, 2093, 2637].forEach((fr, i) => tone({ f0: fr, dur: 0.25, vol: 0.06, at: i * 0.06 }));
    },
    select() {
      tone({ type: "triangle", f0: 520, f1: 1040, dur: 0.1, vol: 0.12 });
    },
    babble(ch) {
      const n = ch.codePointAt(0);
      if (voice.talk.length) {
        playOwn(voice.talk[n % voice.talk.length], voice.pitch * R(0.95, 1.05));
        return;
      }
      const fr = (330 + n % 9 * 28) * voice.pitch;
      tone({ type: "square", f0: fr, f1: fr * R(0.85, 1.1), dur: 0.05, vol: 0.05, filter: 1800 });
    },
    blub() {
      tone({ f0: R(500, 700), f1: R(900, 1200), dur: 0.05, vol: 0.05 });
    },
    listenStart() {
      tone({ f0: 880, dur: 0.12, vol: 0.1 });
      tone({ f0: 1320, dur: 0.16, vol: 0.1, at: 0.1 });
    },
    listenEnd() {
      tone({ f0: 1320, dur: 0.1, vol: 0.09 });
      tone({ f0: 990, dur: 0.16, vol: 0.09, at: 0.09 });
    }
  };
  const api = {
    unlock() {
      unlocked = true;
      ready();
    },
    isOn: () => on,
    set(v) {
      on = v;
      try {
        localStorage.setItem(storageKey, v ? "on" : "off");
      } catch (e) {
      }
    },
    volume(v) {
      gainValue = v;
      if (master) master.gain.value = v;
    },
    /** Where every sound seems to come from, -1 (left) to 1 (right); changes under PAN_STEP are skipped. */
    setPan(v) {
      const p = Math.max(-1, Math.min(1, v));
      if (Math.abs(p - pan) < PAN_STEP) return;
      pan = p;
      panner?.pan.setTargetAtTime(p, ctx.currentTime, 0.03);
    },
    /** The window was shown or hidden (by hand or while something is full screen); hidden, nothing plays. */
    setShown(v) {
      shown = v;
    },
    /** The audio context and the gain a sound of `kind` plays into, or null while it would not be heard. */
    output(kind) {
      if (muted.has(kind)) return null;
      const c = ready();
      return c ? { ctx: c, master } : null;
    },
    /** `kinds`: kind → on (SOUND_KINDS); `snoreSeconds`: snoring stops this long into a sleep, 0 = never. */
    configure({ kinds, snoreSeconds: s } = {}) {
      if (kinds) muted = new Set(Object.keys(SOUND_KINDS).filter((k) => kinds[k] === false));
      if (typeof s === "number" && s >= 0) snoreSeconds = s;
    },
    /**
     * The body's sounds (`sounds` of the pack on screen, from `base`): each is fetched now and decoded once
     * there is an audio context. `null` drops them. `v` is the pack's `voice` ({ pitch }); its `talk` sounds babble.
     */
    usePack(base, sounds, v) {
      own = new Map(Object.entries(sounds ?? {}).map(([name, d]) => {
        const bytes = fetch(new URL(d.file, new URL(base, location.href))).then((r) => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`)));
        bytes.catch((err) => console.error(`\u97F3\u6548 ${name}(${d.file})\u6CA1\u80FD\u8F7D\u5165:`, err));
        return [name, { name, kind: d.kind, volume: d.volume ?? 1, bytes }];
      }));
      if (ctx) for (const o of own.values()) decode(o);
      const pitch = typeof v?.pitch === "number" && v.pitch >= 0.5 && v.pitch <= 2 ? v.pitch : 1;
      voice = { talk: [...own.values()].filter((o) => o.kind === "talk"), pitch };
    },
    /**
     * A sound the body asks for: the pack's own by that name (filed under the kind its manifest gives), else the
     * synthesized tone, filed under `kind` when that is a body's kind (a face that borrows the 'pop' tone is a
     * face sound) and under the tone's own kind otherwise. Snoring (args[0]: seconds asleep) stops after `snoreSeconds`.
     */
    play(name, kind, ...args) {
      const o = own.get(name);
      const k = o ? o.kind : BODY_SOUND_KINDS.includes(kind) ? kind : KIND_OF[name];
      if (muted.has(k)) return;
      if (k === "snore" && snoreSeconds > 0 && args[0] > snoreSeconds) return;
      if (o) playOwn(o);
      else if (Object.hasOwn(tones, name)) tones[name](...args);
    }
  };
  for (const name of Object.keys(tones)) api[name] = (...args) => {
    if (!muted.has(KIND_OF[name])) tones[name](...args);
  };
  return api;
}

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/speech.js
var BANK = "zh";
var VOICE_GAP = {
  ",": 0.14,
  "\uFF0C": 0.14,
  "\u3001": 0.14,
  ";": 0.2,
  "\uFF1B": 0.2,
  ":": 0.2,
  "\uFF1A": 0.2,
  ".": 0.45,
  "\u3002": 0.45,
  "!": 0.5,
  "\uFF01": 0.5,
  "?": 0.5,
  "\uFF1F": 0.5,
  "\u2026": 0.3,
  "~": 0.1,
  "\uFF5E": 0.1
};
var TEXT_PAUSE = {
  ",": 5,
  "\uFF0C": 5,
  "\u3001": 5,
  ";": 6,
  "\uFF1B": 6,
  ":": 6,
  "\uFF1A": 6,
  ".": 9,
  "\u3002": 9,
  "!": 9,
  "\uFF01": 9,
  "?": 9,
  "\uFF1F": 9,
  "\u2026": 4,
  "~": 3,
  "\uFF5E": 3
};
var LETTER_STEP = 0.4;
var ALPHABET = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\s'’-]/u;
function textSteps(ch) {
  return TEXT_PAUSE[ch] ?? (ALPHABET.test(ch) ? LETTER_STEP : 1);
}
var MAX_LAG = 1;
var TONES = { 1: [0.8, 0.8], 2: [-0.6, 1.6], 3: [-1, -1.8, -0.6], 4: [1.6, -1.2], 5: [-0.8, -0.8] };
var TONE_AMOUNT = 0.35;
var STRESS_ST = 1;
var GAIN = 0.45;
var VoiceClock = class {
  constructor() {
    this.reset(0);
  }
  reset(now) {
    this.last = -Infinity;
    this.end = now;
    this.free = now;
    this.gap = 0;
  }
  /** A pause mark revealed: the next unit starts no sooner than this mark's silence after the voice ends. */
  mark(ch) {
    this.gap += VOICE_GAP[ch] ?? 0;
    this.free = this.end + this.gap;
  }
  /** The start of a unit `len` seconds long, or null to drop it; `final` = among its phrase's last two. */
  place(now, { weak, final }, unitsPerSecond, len) {
    const t2 = Math.max(now, this.last + 1 / unitsPerSecond, this.free);
    const lag = t2 - now;
    if (!final && (lag > 2 * MAX_LAG || lag > MAX_LAG && weak)) return null;
    this.last = t2;
    this.end = Math.max(this.end, t2 + len);
    this.gap = 0;
    return t2;
  }
};
function createSpeech(sfx2, {
  base = new URL("speech/", import.meta.url).href,
  onUnit = () => {
  },
  unitsOf = (text) => fetch("/api/speech", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }).then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))).then((d) => d.units)
} = {}) {
  let on = false, hz = 400, ups = 13;
  let bank = null, fetching = null, decoding = null;
  let text = "", byAt = null, waiting = [], rnd = 1;
  const clock = new VoiceClock();
  const playing = /* @__PURE__ */ new Set(), timers = /* @__PURE__ */ new Set();
  function fetchBank() {
    const get = (name, how) => fetch(new URL(name, new URL(base, location.href))).then((r) => r.ok ? r[how]() : Promise.reject(new Error(`HTTP ${r.status}`)));
    fetching ??= Promise.all([get(`${BANK}.json`, "json"), get(`${BANK}.ogg`, "arrayBuffer")]).then(([manifest, bytes]) => {
      bank = { hz: manifest.hz, units: new Map(Object.entries(manifest.units)), bytes, buffer: null };
    }, (err) => {
      console.error("\u8BF4\u8BDD\u58F0\u6CA1\u80FD\u8F7D\u5165:", err);
    });
    return fetching;
  }
  function ready() {
    if (!on) return null;
    if (!bank) {
      void fetchBank();
      return null;
    }
    const out = sfx2.output("talk");
    if (!out) return null;
    if (!bank.buffer) {
      decoding ??= out.ctx.decodeAudioData(bank.bytes.slice(0)).then((b) => {
        bank.buffer = b;
      }, (err) => console.error("\u8BF4\u8BDD\u58F0\u6CA1\u80FD\u89E3\u7801:", err));
      return null;
    }
    return out;
  }
  const random = () => {
    rnd = rnd * 16807 % 2147483647;
    return rnd / 2147483647;
  };
  function play(out, u, t2) {
    const [off, len] = bank.units.get(u.key);
    const { ctx, master } = out;
    const rate = hz / bank.hz;
    const q = /[?？]/.test(u.end), ex = /[!！]/.test(u.end), last2 = u.pos === u.of - 1;
    let st = (u.pos === 0 ? 0.8 : 0) - 0.06 * u.pos + (random() - 0.5) * 0.4 + (ex ? 1 : 0) + (u.stress ? STRESS_ST : 0);
    let bend = 0;
    if (q && u.pos === u.of - 2) st += 1.5;
    if (q && last2) {
      st += 2;
      bend = 3;
    }
    if (/…/.test(u.end) && last2) st -= 0.8;
    const tone = u.tone ? TONES[u.tone] : [0, 0];
    const curve = new Float32Array(8);
    for (let k = 0; k < 8; k++) {
      const p = k / 7, x = p * (tone.length - 1), a = Math.floor(x), b = Math.min(tone.length - 1, a + 1);
      const ts = (tone[a] + (tone[b] - tone[a]) * (x - a)) * TONE_AMOUNT;
      curve[k] = rate * 2 ** ((st + ts + bend * p) / 12);
    }
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = bank.buffer;
    src.playbackRate.setValueCurveAtTime(curve, t2, len / rate);
    g.gain.value = GAIN * (ex ? 1.26 : 1);
    src.connect(g);
    g.connect(master);
    src.start(t2, off, len);
    playing.add(src);
    src.onended = () => playing.delete(src);
    const timer = setTimeout(() => {
      timers.delete(timer);
      onUnit();
    }, Math.max(0, (t2 - ctx.currentTime) * 1e3));
    timers.add(timer);
  }
  let asked = false;
  function ask() {
    if (asked || !text) return;
    asked = true;
    const t2 = text;
    unitsOf(t2).then((units) => {
      if (text !== t2) return;
      byAt = /* @__PURE__ */ new Map();
      for (const u of units) {
        if (!byAt.has(u.at)) byAt.set(u.at, []);
        byAt.get(u.at).push(u);
      }
      const out = ready();
      if (out) for (const i of waiting) speak(out, i);
      waiting = [];
    }, (err) => {
      console.error("\u8BF4\u8BDD\u58F0\u6CA1\u80FD\u62C6\u6210\u97F3\u8282:", err);
      if (text === t2) {
        byAt = /* @__PURE__ */ new Map();
        waiting = [];
      }
    });
  }
  function speak(out, i) {
    const ch = text[i];
    if (VOICE_GAP[ch] !== void 0) clock.mark(ch);
    const now = out.ctx.currentTime + 0.02;
    if (clock.end < now - 2) clock.reset(now);
    for (const u of byAt.get(i) ?? []) {
      if (!bank.units.has(u.key)) continue;
      const len = bank.units.get(u.key)[1] / (hz / bank.hz);
      const t2 = clock.place(now, { weak: u.weak, final: u.pos >= u.of - 2 }, ups, len);
      if (t2 !== null) play(out, u, t2);
    }
  }
  return {
    /** `enabled`; `pitchHz`: the voice's pitch; `unitsPerSecond`: most units started a second. */
    configure({ enabled, pitchHz, unitsPerSecond } = {}) {
      if (typeof enabled === "boolean") {
        on = enabled;
        if (on) void fetchBank();
        else this.stop();
      }
      if (typeof pitchHz === "number" && pitchHz > 0) hz = pitchHz;
      if (typeof unitsPerSecond === "number" && unitsPerSecond > 0) ups = unitsPerSecond;
    },
    /** Whether the bubble types with speech's pauses and leaves the sound to it. */
    get active() {
      return Boolean(ready());
    },
    /** The bubble starts typing `t`: while speech is on, its units are asked for now, else at its first reveal. */
    begin(t2) {
      if (t2 === text) return;
      text = t2;
      byAt = null;
      waiting = [];
      asked = false;
      if (on) ask();
    },
    /** Character `i` of the text just appeared; false = speech cannot play now, babble instead. */
    reveal(i) {
      const out = ready();
      if (!out) return false;
      if (byAt) speak(out, i);
      else {
        waiting.push(i);
        ask();
      }
      return true;
    },
    /** Stops what is playing and what waits to play. */
    stop() {
      for (const s of playing) {
        try {
          s.stop();
        } catch {
        }
      }
      playing.clear();
      for (const t2 of timers) clearTimeout(t2);
      timers.clear();
      clock.reset(0);
      text = "";
      byAt = null;
      waiting = [];
      asked = false;
    }
  };
}

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/kit/body.js
var f2 = (n) => Math.round(n * 10) / 10;
var clamp2 = (v, a, b) => Math.max(a, Math.min(b, v));
var HIPS = [[104, 212], [150, 212]];
var LEG_W = 30;
var FOOT_Y = 256 - LEG_W / 2;
var STAND = HIPS.map((h) => [h[0], h[1], h[0], FOOT_Y]);
var DROP = "M0 -9C4 -3 6 0 6 3.5A6 6 0 0 1 -6 3.5C-6 0 -4 -3 0 -9Z";
function heartD(cx, cy, s) {
  const p = (x, y) => `${f2(cx + x * s)} ${f2(cy + y * s)}`;
  return `M${p(0, 14)}C${p(-7, 8)} ${p(-19, 1)} ${p(-19, -6)}C${p(-19, -15)} ${p(-8, -18)} ${p(0, -9)}C${p(8, -18)} ${p(19, -15)} ${p(19, -6)}C${p(19, 1)} ${p(7, 8)} ${p(0, 14)}Z`;
}
var ring = (o) => ({ shape: "ring", rx: 16, ry: 16, ...o });
var yawn = (t2) => {
  const p = t2 % 4.2 / 1.6;
  return p < 1 ? Math.sin(Math.PI * p) ** 2 : 0;
};
var FACES = {
  neutral: { label: "\u5E73\u9759", kao: "(0 0", f: () => ({ gap: [50, 50], eyes: [ring(), ring()] }) },
  happy: { label: "\u5F00\u5FC3", kao: "(^ ^", f: () => ({ gap: [58, 58], eyes: [{ shape: "up" }, { shape: "up" }], blush: 0.45 }) },
  wink: { label: "\u7728\u773C", kao: "(0 ^", f: () => ({ gap: [56, 52], eyes: [ring(), { shape: "up" }] }) },
  love: { label: "\u559C\u6B22", kao: "(\u2661 \u2661", f: (t2) => {
    const s = 0.8 + 0.08 * Math.sin(t2 * 9);
    return { gap: [56, 56], eyes: [{ shape: "heart", s, sw: 8 }, { shape: "heart", s, sw: 8 }], blush: 0.7, emit: "heart" };
  } },
  shy: { label: "\u5BB3\u7F9E", kao: "(o o *", f: () => ({ gap: [40, 40], eyes: [ring({ rx: 13, ry: 12, dx: -3, dy: 5 }), ring({ rx: 13, ry: 12, dx: -3, dy: 5 })], blush: 1, lookLock: true }) },
  surprised: { label: "\u60CA\u8BB6", kao: "(O O", f: () => ({ gap: [62, 62], eyes: [ring({ rx: 20, ry: 21 }), ring({ rx: 20, ry: 21 })], bang: true }) },
  angry: { label: "\u751F\u6C14", kao: "(\xF2 \xF3", f: () => ({ gap: [36, 36], eyes: [ring({ ry: 11, dy: 4 }), ring({ ry: 11, dy: 4 })], brows: "angry", anger: true, shake: true }) },
  sad: { label: "\u96BE\u8FC7", kao: "(\xF3 \xF2", f: () => ({ gap: [34, 40], eyes: [ring({ ry: 14, dy: 4 }), ring({ ry: 14, dy: 4 })], brows: "sad", emit: "tear" }) },
  // a yawn narrows the eyes without squeezing them to a slit
  sleepy: { label: "\u72AF\u56F0", kao: "(- -", f: (t2) => {
    const y = yawn(t2);
    return { gap: [50 + 14 * y, 50 + 14 * y], eyes: [{ shape: "lid", ry: 10 - 5 * y }, { shape: "lid", ry: 10 - 5 * y }] };
  } },
  sleep: { label: "\u7761\u7740", kao: "(u u", f: (t2) => {
    const b = 40 + 6 * Math.sin(t2 * 1.7);
    return { gap: [b, b], eyes: [{ shape: "down" }, { shape: "down" }], emit: "z" };
  } },
  dizzy: { label: "\u6655\u4E4E", kao: "(@ @", f: (t2) => ({ gap: [54 + 5 * Math.sin(t2 * 5), 48], eyes: [{ shape: "spiral", rot: t2 * 7 }, { shape: "spiral", rot: t2 * 7 + 1.4 }], orbit: true }) },
  dragged: { label: "\u88AB\u62CE\u8D77", kao: "(> <", f: (t2) => {
    const g = 55 + 3 * Math.sin(t2 * 22);
    return { gap: [g, g], eyes: [{ shape: "gt" }, { shape: "lt" }], sweat: true };
  } },
  // seated eyes rest open; once drowse passes .7 they are the closed sleep sprite (the shape swap hides under a blink)
  content: { label: "\u60EC\u610F", f: (t2, p) => {
    const d = p ? p.drowse : 0;
    const e = d > 0.7 ? { shape: "down" } : { shape: "lid", ry: 13.5 - 10 * d };
    return { gap: [46, 46], eyes: [e, { ...e }] };
  } },
  waking: { label: "\u9192\u6765", f: (t2, p) => {
    const mt = p ? p.modeT : 1;
    const k = clamp2(mt / 0.5, 0, 1), y = mt > 0.5 ? Math.sin(clamp2((mt - 0.5) / 0.9, 0, 1) * Math.PI) : 0;
    const r = Math.max(0, 10 * k * (1 - 0.7 * y));
    return { gap: [50 + 12 * y, 50 + 12 * y], eyes: [{ shape: "lid", ry: r }, { shape: "lid", ry: r }] };
  } },
  squeeze: { label: "\u56DE\u795E", f: () => ({ gap: [44, 44], eyes: [{ shape: "lid", ry: 0 }, { shape: "lid", ry: 0 }] }) },
  listening: { label: "\u503E\u542C", f: () => ({ gap: [44, 44], eyes: [ring({ rx: 17, ry: 18, dy: -1 }), ring({ rx: 17, ry: 18, dy: -1 })], listen: true }) },
  thinking: { label: "\u601D\u8003", f: (t2) => ({ gap: [46, 46], eyes: [ring({ rx: 14, ry: 15, dx: 3, dy: -4 }), ring({ rx: 14, ry: 15, dx: 3, dy: -4 })], think: true }) },
  run: { label: "\u51B2\u523A", f: (t2) => {
    const g = 55 + 4 * Math.sin(t2 * 16);
    return { gap: [g, g], eyes: [ring(), ring()], sweat: true };
  } },
  smug: { label: "\u5F97\u610F", kao: "(\xAC \xAC", f: () => ({ gap: [52, 46], eyes: [{ shape: "lid", ry: 8, dx: 4 }, { shape: "lid", ry: 8, dx: 4 }], blush: 0.25 }) },
  // `lookAt` holds the gaze (and with it a figure's head) on a point, here away from whoever is there
  pout: { label: "\u561F\u5634", kao: "(o o 3", f: () => ({ gap: [28, 28], eyes: [ring({ rx: 14, ry: 13 }), ring({ rx: 14, ry: 13 })], blush: 0.6, lookAt: [-5, -1] }) },
  worried: { label: "\u62C5\u5FC3", kao: "(\xF3 \xF2 ;", f: () => ({ gap: [40, 44], eyes: [ring({ ry: 17, dy: 2 }), ring({ ry: 17, dy: 2 })], brows: "sad", sweat: true }) },
  determined: { label: "\u8BA4\u771F", kao: "(\xF2 \xF3", f: () => ({ gap: [42, 42], eyes: [ring({ ry: 13, dy: 1 }), ring({ ry: 13, dy: 1 })], brows: "angry" }) },
  flustered: { label: "\u614C\u5F20", kao: "(> <;", f: (t2) => ({ gap: [50 + 3 * Math.sin(t2 * 22), 48], eyes: [{ shape: "gt" }, { shape: "lt" }], blush: 1, sweat: true }) },
  // `wide`: eyes wider than open (a figure with drawn eyes may use its surprised ones)
  scared: { label: "\u5BB3\u6015", kao: "(O O;", f: () => ({ gap: [38, 38], eyes: [ring({ rx: 18, ry: 19 }), ring({ rx: 18, ry: 19 })], brows: "sad", wide: true, shake: true, sweat: true }) },
  excited: { label: "\u671F\u5F85", kao: "(\u2606 \u2606", f: () => ({ gap: [60, 60], eyes: [ring({ rx: 18, ry: 19, dy: -1 }), ring({ rx: 18, ry: 19, dy: -1 })], sparkle: true, blush: 0.4 }) },
  cry: { label: "\u5927\u54ED", kao: "(T T", f: (t2) => {
    const g = 36 + 6 * Math.abs(Math.sin(t2 * 9));
    return { gap: [g, g], eyes: [{ shape: "lid", ry: 0 }, { shape: "lid", ry: 0 }], brows: "sad", emit: "tears", streams: true };
  } },
  // a motion's own face (not one to ask for): eyes shut through a bow
  bowing: { label: "\u97A0\u8EAC", f: () => ({ gap: [48, 48], eyes: [{ shape: "lid", ry: 0 }, { shape: "lid", ry: 0 }] }) },
  confused: { label: "\u7591\u60D1", kao: "(0 o ?", f: () => ({ gap: [44, 40], eyes: [ring(), ring({ rx: 14, ry: 11 })], question: true }) }
};

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/coo/coo.js
var EYES = [[113, 117], [163, 117]];
var BODY_W = 36;
var pol = (a, r) => [128 + r * Math.cos(a * Math.PI / 180), 128 - r * Math.sin(a * Math.PI / 180)];
var pt = (p) => `${f2(p[0])} ${f2(p[1])}`;
function cPath(gt, gb) {
  return `M${pt(pol(gt, 84))}A84 84 0 1 0 ${pt(pol(-gb, 84))}`;
}
function ellipse(cx, cy, rx, ry) {
  if (ry < 1.6) return `M${f2(cx - rx)} ${f2(cy)}L${f2(cx + rx)} ${f2(cy)}`;
  return `M${f2(cx - rx)} ${f2(cy)}A${f2(rx)} ${f2(ry)} 0 1 0 ${f2(cx + rx)} ${f2(cy)}A${f2(rx)} ${f2(ry)} 0 1 0 ${f2(cx - rx)} ${f2(cy)}Z`;
}
function eyePath(e, cx, cy) {
  cx += e.dx || 0;
  cy += e.dy || 0;
  switch (e.shape) {
    case "ring":
      return ellipse(cx, cy, e.rx, e.ry);
    case "lid":
      return e.ry < 1.6 ? `M${f2(cx - 16)} ${f2(cy)}L${f2(cx + 16)} ${f2(cy)}` : `M${f2(cx - 16)} ${f2(cy)}A16 ${f2(e.ry)} 0 0 0 ${f2(cx + 16)} ${f2(cy)}Z`;
    case "up":
      return `M${f2(cx - 15)} ${f2(cy + 6)}Q${f2(cx)} ${f2(cy - 17)} ${f2(cx + 15)} ${f2(cy + 6)}`;
    case "down":
      return `M${f2(cx - 15)} ${f2(cy - 3)}Q${f2(cx)} ${f2(cy + 15)} ${f2(cx + 15)} ${f2(cy - 3)}`;
    case "gt":
      return `M${f2(cx - 10)} ${f2(cy - 13)}L${f2(cx + 11)} ${f2(cy)}L${f2(cx - 10)} ${f2(cy + 13)}`;
    case "lt":
      return `M${f2(cx + 10)} ${f2(cy - 13)}L${f2(cx - 11)} ${f2(cy)}L${f2(cx + 10)} ${f2(cy + 13)}`;
    case "heart":
      return heartD(cx, cy, e.s);
    case "spiral": {
      let d = "";
      const max = Math.PI * 4.4;
      for (let i = 0; i <= 44; i++) {
        const a = max * i / 44, r = 2 + 15 * i / 44;
        d += (i ? "L" : "M") + f2(cx + r * Math.cos(a + e.rot)) + " " + f2(cy + r * Math.sin(a + e.rot));
      }
      return d;
    }
  }
  return "";
}
var PALETTES = [
  { id: "mint", l: ["#1B1626", "#00A870"], d: ["#FFFFFF", "#2FD59B"] },
  { id: "mono", l: ["#1B1626", "#1B1626"], d: ["#FFFFFF", "#FFFFFF"] },
  { id: "navigator", l: ["#14213A", "#1F6FE0"], d: ["#FFFFFF", "#5EA3FF"] },
  { id: "claude", l: ["#2A1C16", "#C9623F"], d: ["#FFFFFF", "#E58B69"] },
  { id: "fox", l: ["#26140F", "#DD3526"], d: ["#FFFFFF", "#FF6655"] },
  { id: "purple", l: ["#1D1430", "#8B3DF0"], d: ["#FFFFFF", "#B98AFF"] },
  { id: "lemon", l: ["#252010", "#D9B300"], d: ["#FFFFFF", "#FFE14F"] },
  // after principles of Cultist Simulator, offered with the personas of the same names (core/guide.ts): the dark
  // theme's eyes take the principle's colour on the game's wiki, the light theme's a deeper shade of the same hue
  { id: "lantern", l: ["#252010", "#C9A000"], d: ["#FFFFFF", "#FFE300"] },
  { id: "grail", l: ["#2A120F", "#E0452F"], d: ["#FFFFFF", "#FE6150"] },
  { id: "forge", l: ["#2A1A10", "#E06A12"], d: ["#FFFFFF", "#FF8E3E"] },
  { id: "heart", l: ["#2A1420", "#D9506A"], d: ["#FFFFFF", "#FE7E8B"] },
  { id: "winter", l: ["#12202A", "#3A9DC4"], d: ["#FFFFFF", "#BEEEFF"] }
];
var HEADS = ["none", "cat", "bear", "bunny", "antenna", "halo", "tophat", "party", "sailor"];
var SIDES = ["none", "headphones", "feather", "earring", "clip", "bow"];
var GLASSES = ["none", "round", "square", "monocle"];
var NECKS = ["none", "bowtie", "bell", "scarf"];
var HEAD_TOP = { none: 12, cat: -14, bear: -4, bunny: -34, antenna: -34, halo: -8, tophat: -28, party: -34, sailor: -20 };
var ACC_COLORS = [
  { id: "mint", l: "#00A870", d: "#2FD59B" },
  { id: "leaf", l: "#3C9A2C", d: "#80D46B" },
  { id: "lemon", l: "#D9B300", d: "#FFE14F" },
  { id: "fox", l: "#DD3526", d: "#FF6655" },
  { id: "claude", l: "#C9623F", d: "#E58B69" },
  { id: "rose", l: "#DB3F76", d: "#FF85AE" },
  { id: "purple", l: "#8B3DF0", d: "#B98AFF" },
  { id: "navigator", l: "#1F6FE0", d: "#5EA3FF" },
  { id: "holo", l: "#1AA3D9", d: "#6FD3FF" }
];
var SLOTS = ["head", "side", "glasses", "neck"];
var SLOT_LISTS = { head: HEADS, side: SIDES, glasses: GLASSES, neck: NECKS };
var CHANNEL_DEFAULT = { head: { main: "body", acc: "eye" }, side: { main: "eye", acc: "eye" }, glasses: { main: "body", acc: "eye" }, neck: { main: "eye", acc: "eye" } };
var NO_BODY = { head: false, side: true, glasses: false, neck: true };
var mount = (a, r = 96) => `translate(${pt(pol(a, r))}) rotate(${f2(90 - a)})`;
var stroke = (cls, w) => `class="${cls}" fill="none" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
var blob = (slot, ch, w) => `class="f-${slot}-${ch} c-${slot}-${ch}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
function headBack(id, sw) {
  switch (id) {
    case "cat":
      return [126, 82].map((a) => `<path ${blob("head", "main", 10)} transform="${mount(a)}" d="M-17 8L0 -28L17 8Z"/>`).join("");
    case "bear":
      return [128, 80].map((a) => `<circle class="f-head-main" transform="${mount(a)}" cx="0" cy="-8" r="18"/>`).join("");
    case "bunny":
      return [[116, -10, 0.7], [92, 6, 1]].map(([a, off, k]) => `<g transform="${mount(a)} rotate(${f2(off + sw * k)})"><ellipse class="f-head-main" cx="0" cy="-28" rx="14" ry="30"/></g>`).join("");
    case "antenna":
      return `<g transform="${mount(98)} rotate(${f2(sw)})"><path ${stroke("c-head-main", 14)} d="M0 0Q5 -20 0 -38"/><circle class="f-head-acc" cx="0" cy="-50" r="12"/></g>`;
  }
  return "";
}
function headFront(id, sw, t2) {
  switch (id) {
    case "sailor":
      return `<g transform="${mount(106)} rotate(${f2(sw * 0.2)})"><path class="f-head-main" d="M-34 3L-38 -30Q0 -40 38 -30L34 3Q0 -3 -34 3Z"/><path class="f-head-acc" d="M-37.1 -23Q0 -31 37.1 -23L36.1 -15Q0 -23 -36.1 -15ZM-35.6 -11Q0 -19 35.6 -11L34.8 -4Q0 -12 -34.8 -4Z"/></g>`;
    case "halo":
      return `<g transform="${mount(98)}"><ellipse ${stroke("c-head-acc", 12)} cx="0" cy="${f2(-28 + 3 * Math.sin(t2 * 2.2))}" rx="36" ry="9"/></g>`;
    case "tophat":
      return `<g transform="${mount(104)} rotate(${f2(sw * 0.2)})"><rect class="f-head-main" x="-40" y="-7" width="80" height="12" rx="6"/><rect class="f-head-main" x="-22" y="-48" width="44" height="46" rx="7"/><rect class="f-head-acc" x="-22" y="-20" width="44" height="10"/></g>`;
    case "party":
      return `<g transform="${mount(110)} rotate(${f2(sw * 0.3)})"><path ${blob("head", "main", 8)} d="M-24 2L0 -46L24 2Z"/><circle class="f-head-acc" cx="0" cy="-55" r="11"/></g>`;
  }
  return "";
}
function sideBack(id, sw) {
  if (id !== "feather") return "";
  const blade = (L, w) => `M0 0C${-w} ${f2(-L * 0.3)} ${f2(-w * 0.8)} ${f2(-L * 0.8)} ${f2(-L * 0.14)} ${-L}C${f2(w * 0.6)} ${f2(-L * 0.75)} ${w} ${f2(-L * 0.3)} 0 0Z`;
  return `<g transform="${mount(166, 92)} rotate(${f2(sw * 0.6)})"><path class="f-side-acc" transform="rotate(58)" d="${blade(66, 18)}"/><path class="f-side-main" transform="rotate(26)" d="${blade(56, 16)}"/><path class="f-side-main" d="${blade(42, 14)}"/></g>`;
}
function sideFront(id, sw) {
  switch (id) {
    case "headphones":
      return `<path ${stroke("c-side-main", 16)} d="M${pt(pol(150, 113))}A113 113 0 0 1 ${pt(pol(76, 113))}"/><rect class="f-side-acc" transform="${mount(166, 98)}" x="-24" y="-17" width="48" height="34" rx="17"/>`;
    case "earring":
      return `<g transform="translate(${pt(pol(172, 99))}) rotate(${f2(sw * 0.8)})"><circle class="f-side-main" cx="0" cy="13" r="10"/></g>`;
    case "clip":
      return `<rect class="f-side-main" transform="${mount(140, 86)}" x="-17" y="-6.5" width="34" height="13" rx="6.5"/>`;
    case "bow":
      return `<g class="f-side-main" transform="${mount(132, 100)} rotate(${f2(sw * 0.3)})"><path d="M-4 0L-24 -14Q-28 0 -24 14ZM4 0L24 -14Q28 0 24 14Z"/><circle r="7"/></g>`;
  }
  return "";
}
function glassesD(id, gx, gy) {
  const L = [113 + gx, 117 + gy], R = [163 + gx, 117 + gy], M = stroke("c-glasses-main", 10);
  switch (id) {
    case "round":
      return `<circle ${M} cx="${f2(L[0])}" cy="${f2(L[1])}" r="31"/><circle ${M} cx="${f2(R[0])}" cy="${f2(R[1])}" r="31"/><path ${M} d="M${f2(L[0] - 31)} ${f2(L[1] - 6)}L62 106"/>`;
    case "square":
      return `<rect ${M} x="${f2(L[0] - 26)}" y="${f2(L[1] - 22)}" width="52" height="44" rx="15"/><rect ${M} x="${f2(R[0] - 26)}" y="${f2(R[1] - 22)}" width="52" height="44" rx="15"/><path ${M} d="M${f2(L[0] - 26)} ${f2(L[1] - 6)}L62 106"/>`;
    case "monocle":
      return `<circle ${M} cx="${f2(R[0])}" cy="${f2(R[1])}" r="31"/>`;
  }
  return "";
}
function neckD(id, sw) {
  switch (id) {
    case "bowtie":
      return `<g ${blob("neck", "main", 6)} transform="translate(176 206) rotate(-32)"><path d="M-4 0L-22 -13V13ZM4 0L22 -13V13Z"/><circle r="7"/></g>`;
    case "bell": {
      const a = pol(-150, 84), b = pol(-60, 84);
      return `<path ${stroke("c-neck-main", 12)} d="M${pt(a)}A84 84 0 0 0 ${pt(b)}"/><g transform="translate(${pt(b)}) rotate(${f2(sw * 0.6)})"><circle class="f-neck-acc" cx="0" cy="14" r="13"/></g>`;
    }
    case "scarf": {
      const a = pol(-150, 84), b = pol(-72, 84), S2 = stroke("c-neck-main", 18);
      return `<path ${S2} d="M${pt(a)}A84 84 0 0 0 ${pt(b)}"/><g transform="rotate(${f2(sw * 0.8)} ${pt(a)})"><path ${S2} d="M${pt(a)}q-12 22 -6 40"/></g>`;
    }
  }
  return "";
}
function figure(fc, o) {
  const t2 = o.t, lx = o.look[0], ly = o.look[1], acc = o.acc, sw = o.swing || 0;
  let s = `<g class="ink" fill="none" stroke-width="${LEG_W}" stroke-linecap="round">`;
  for (const l of o.legs) s += `<path d="M${f2(l[0])} ${f2(l[1])}L${f2(l[2])} ${f2(l[3])}"/>`;
  s += `</g><g transform="translate(0 ${f2(o.low)})">`;
  s += sideBack(acc.side, sw);
  s += headBack(acc.head, sw);
  s += `<path class="ink" fill="none" stroke-width="${BODY_W}" stroke-linecap="round" d="${cPath(fc.gap[0], fc.gap[1])}"/>`;
  s += neckD(acc.neck, sw);
  if (fc.blush > 0.02) {
    s += `<g class="blush" opacity="${f2(fc.blush * 0.8)}"><ellipse cx="${f2(99 + lx)}" cy="146" rx="11" ry="5.5"/><ellipse cx="${f2(167 + lx)}" cy="146" rx="11" ry="5.5"/></g>`;
  }
  const close = o.eyeClose || 0;
  fc.eyes.forEach((e, i) => {
    const ee = { ...e };
    if ((ee.shape === "ring" || ee.shape === "lid") && o.blink) ee.ry *= 1 - o.blink;
    const cx = EYES[i][0] + lx, cy = EYES[i][1] + ly;
    const tr = close > 0.01 ? ` transform="translate(0 ${f2(cy)}) scale(1 ${f2(Math.max(0.08, 1 - close) * 100) / 100}) translate(0 ${f2(-cy)})"` : "";
    s += `<path class="eye" fill="none" stroke-width="${e.sw || 12}" stroke-linecap="round" stroke-linejoin="round"${tr} d="${eyePath(ee, cx, cy)}"/>`;
  });
  s += glassesD(acc.glasses, lx * 0.4, ly * 0.3);
  if (fc.brows) {
    const bx = lx * 0.5, by = ly * 0.4;
    const d = fc.brows === "angry" ? `M${f2(98 + bx)} ${f2(88 + by)}L${f2(124 + bx)} ${f2(97 + by)}M${f2(152 + bx)} ${f2(97 + by)}L${f2(178 + bx)} ${f2(88 + by)}` : `M${f2(98 + bx)} ${f2(96 + by)}L${f2(123 + bx)} ${f2(88 + by)}M${f2(153 + bx)} ${f2(88 + by)}L${f2(178 + bx)} ${f2(96 + by)}`;
    s += `<path class="ink" fill="none" stroke-width="9" stroke-linecap="round" d="${d}"/>`;
  }
  s += sideFront(acc.side, sw);
  s += headFront(acc.head, sw, t2);
  if (fc.orbit) {
    const top = HEAD_TOP[acc.head] ?? 12;
    for (let i = 0; i < 3; i++) {
      const a = t2 * 3.2 + i * 2.094, sn = Math.sin(a);
      s += `<circle class="eye" fill="none" stroke-width="4" cx="${f2(128 + 62 * Math.cos(a))}" cy="${f2(top + 12 * sn)}" r="${sn < 0 ? 5 : 7}" opacity="${sn < 0 ? 0.55 : 1}"/>`;
    }
  }
  if (fc.listen) {
    for (let i = 0; i < 3; i++) {
      const p = (t2 * 0.9 + i / 3) % 1, r = 46 - 30 * p, a0 = -0.55, a1 = 0.55;
      s += `<path class="eye" fill="none" stroke-width="7" stroke-linecap="round" opacity="${f2(Math.sin(Math.PI * p))}" d="M${f2(196 + r * Math.cos(a0))} ${f2(104 + r * Math.sin(a0))}A${f2(r)} ${f2(r)} 0 0 1 ${f2(196 + r * Math.cos(a1))} ${f2(104 + r * Math.sin(a1))}"/>`;
    }
  }
  if (fc.think) {
    for (let i = 0; i < 3; i++) {
      const k = (t2 * 0.8 + i / 3) % 1;
      s += `<circle class="eye" fill="none" stroke-width="5" cx="${f2(214 + 10 * i)}" cy="${f2(46 - 22 * i - 6 * k)}" r="${4 + 3 * i}" opacity="${f2(0.4 + 0.6 * Math.sin(Math.PI * k))}"/>`;
    }
  }
  if (fc.sweat) s += `<path class="tearf" transform="translate(56 ${f2(64 + 3 * Math.sin(t2 * 7))}) scale(1.3)" d="${DROP}"/>`;
  if (fc.anger) {
    const k = 1 + 0.12 * Math.sin(t2 * 10);
    s += `<g class="angry" transform="translate(210 44) scale(${f2(k * 10) / 10})" fill="none" stroke-width="7" stroke-linecap="round"><path d="M-13 -4Q-4 -4 -4 -13M4 -13Q4 -4 13 -4M13 4Q4 4 4 13M-4 13Q-4 4 -13 4"/></g>`;
  }
  if (fc.bang) s += `<g transform="translate(222 30)"><path class="ink" fill="none" stroke-width="11" stroke-linecap="round" d="M0 -18V4"/><circle class="inkf" cx="0" cy="18" r="5.5"/></g>`;
  if (fc.question) s += `<g transform="translate(222 30)"><path class="ink" fill="none" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" d="M-10 -12Q-10 -24 0 -24Q11 -24 11 -13Q11 -5 0 -1V5"/><circle class="inkf" cx="0" cy="18" r="5.5"/></g>`;
  if (fc.sparkle) {
    EYES.forEach(([ex, ey], i) => {
      const k = 0.8 + 0.3 * Math.sin(t2 * 7 + i * 2);
      s += `<path class="eye" fill="none" stroke-width="4" stroke-linecap="round" transform="translate(${f2(ex + lx)} ${f2(ey + ly - 1)}) scale(${f2(k)})" d="M0 -8V8M-8 0H8"/>`;
    });
  }
  if (fc.streams) {
    EYES.forEach(([ex, ey], i) => {
      const w = 2 * Math.sin(t2 * 6 + i);
      s += `<path class="tearf" opacity=".75" d="M${f2(ex + lx - 5)} ${f2(ey + 6)}Q${f2(ex + lx - 7 + w)} ${f2(ey + 30)} ${f2(ex + lx - 3)} ${f2(ey + 52)}L${f2(ex + lx + 5)} ${f2(ey + 52)}Q${f2(ex + lx + 3 + w)} ${f2(ey + 30)} ${f2(ex + lx + 5)} ${f2(ey + 6)}Z"/>`;
    });
  }
  if (o.zmark) s += '<path class="eye" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" d="M204 22H220L204 42H220M226 4H236L226 16H236"/>';
  return s + "</g>";
}
function mini(face, acc, t2 = 0, extra = {}) {
  return figure(FACES[face].f(t2), { look: [0, 0], legs: STAND, low: 0, t: t2, blink: 0, acc, ...extra });
}
var FIGURE_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
function defaultSkin() {
  return { figure: "coo", scheme: "deepseek", palette: "mint", head: "none", side: "none", glasses: "none", neck: "none", colors: JSON.parse(JSON.stringify(CHANNEL_DEFAULT)) };
}
var validColor = (slot, v) => v === "eye" || v === "body" && !NO_BODY[slot] || ACC_COLORS.some((c) => c.id === v);
function normalizeSkin(raw) {
  const skin2 = defaultSkin();
  if (!raw || typeof raw !== "object") return skin2;
  if (typeof raw.figure === "string" && FIGURE_ID.test(raw.figure)) skin2.figure = raw.figure;
  if (typeof raw.scheme === "string" && /^[a-z0-9-]*$/.test(raw.scheme)) skin2.scheme = raw.scheme;
  if (PALETTES.some((p) => p.id === raw.palette)) skin2.palette = raw.palette;
  for (const slot of SLOTS) if (SLOT_LISTS[slot].includes(raw[slot])) skin2[slot] = raw[slot];
  for (const slot of SLOTS) for (const ch of ["main", "acc"]) {
    const v = raw.colors?.[slot]?.[ch];
    if (validColor(slot, v)) skin2.colors[slot][ch] = v;
  }
  return skin2;
}
function channelValue(skin2, slot, ch, dark) {
  const v = skin2.colors[slot][ch];
  if (v === "body") return "var(--skin-ink)";
  if (v === "eye") return "var(--skin-eye)";
  const c = ACC_COLORS.find((x) => x.id === v);
  return dark ? c.d : c.l;
}
function skinVars(skin2, dark) {
  const p = PALETTES.find((x) => x.id === skin2.palette) || PALETTES[0];
  let s = `--skin-ink:${p[dark ? "d" : "l"][0]};--skin-eye:${p[dark ? "d" : "l"][1]};`;
  for (const slot of SLOTS) for (const ch of ["main", "acc"]) s += `--c-${slot}-${ch}:${channelValue(skin2, slot, ch, dark)};`;
  return s;
}
function skinCss(skin2, selector = "html:root") {
  return `${selector}{${skinVars(skin2, false)}}@media (prefers-color-scheme: dark){${selector}:not([data-theme="light"]){${skinVars(skin2, true)}}}${selector}[data-theme="dark"]{${skinVars(skin2, true)}}`;
}
var COO_CSS = `
:root{--skin-ink:#1B1626;--skin-eye:#00A870;--blush:#FF8FA8;--tear:#5AAEF0;--anger:#E5484D}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--skin-ink:#FFFFFF;--skin-eye:#2FD59B;--blush:#FF7F9E;--tear:#6BBDF7;--anger:#FF6369}}
:root[data-theme="dark"]{--skin-ink:#FFFFFF;--skin-eye:#2FD59B;--blush:#FF7F9E;--tear:#6BBDF7;--anger:#FF6369}
.ink{stroke:var(--skin-ink)} .inkf{fill:var(--skin-ink)} .eye{stroke:var(--skin-eye)}
.blush{fill:var(--blush)} .tearf{fill:var(--tear)} .angry{stroke:var(--anger)}
.c-head-main{stroke:var(--c-head-main, var(--skin-ink))} .c-head-acc{stroke:var(--c-head-acc, var(--skin-eye))}
.c-glasses-main{stroke:var(--c-glasses-main, var(--skin-ink))} .c-glasses-acc{stroke:var(--c-glasses-acc, var(--skin-eye))}
.c-side-main{stroke:var(--c-side-main, var(--skin-eye))} .c-side-acc{stroke:var(--c-side-acc, var(--skin-eye))}
.c-neck-main{stroke:var(--c-neck-main, var(--skin-eye))} .c-neck-acc{stroke:var(--c-neck-acc, var(--skin-eye))}
.f-head-main{fill:var(--c-head-main, var(--skin-ink))} .f-head-acc{fill:var(--c-head-acc, var(--skin-eye))}
.f-side-main{fill:var(--c-side-main, var(--skin-eye))} .f-side-acc{fill:var(--c-side-acc, var(--skin-eye))}
.f-neck-main{fill:var(--c-neck-main, var(--skin-eye))} .f-neck-acc{fill:var(--c-neck-acc, var(--skin-eye))}
`;

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/body-host.js
var READY_MS = 2e4;
var BOX_MAX = 1.5 * Math.SQRT2;
var TOUCH_MS = 1e3;
var TOUCHES = /* @__PURE__ */ new Set(["poke", "pet", "grab", "drop", "throw", "crash"]);
var HALO_PAD = 0.4;
var HALO_REACH = 24;
var num = (v, fallback2 = 0) => typeof v === "number" && Number.isFinite(v) ? v : fallback2;
var clampTo = (v, a, b) => Math.max(a, Math.min(b, v));
function readLayout(l, size) {
  if (!l || typeof l !== "object") return null;
  const { W, H, S } = size, side = 256 * S * BOX_MAX;
  const b = l.box ?? {};
  const w = clampTo(num(b.w), 0, side), h = clampTo(num(b.h), 0, side);
  const x0 = clampTo(num(b.x), -w, W), y0 = clampTo(num(b.y), -h, H);
  const box = { x: Math.max(0, x0), y: Math.max(0, y0), w: Math.min(W, x0 + w) - Math.max(0, x0), h: Math.min(H, y0 + h) - Math.max(0, y0) };
  const pt2 = (p) => ({ x: clampTo(num(p?.x), 0, W), y: clampTo(num(p?.y), 0, H) });
  return {
    x: clampTo(num(l.x, W / 2), 0, W),
    ...typeof l.y === "number" && Number.isFinite(l.y) ? { y: clampTo(l.y, 0, H) } : {},
    facing: l.facing === -1 ? -1 : 1,
    mode: typeof l.mode === "string" ? l.mode.slice(0, 32) : "idle",
    busy: !!l.busy,
    moving: !!l.moving,
    pressing: !!l.pressing,
    cursor: l.cursor === "grab" || l.cursor === "grabbing" ? l.cursor : "",
    box,
    hit: (Array.isArray(l.hit) ? l.hit : []).map((c) => ({ x: num(c?.x), y: num(c?.y), r: Math.max(0, num(c?.r)) })),
    bubble: pt2(l.bubble),
    side: { ...pt2(l.side), reach: clampTo(num(l.side?.reach), 0, side / 2) }
  };
}
function onBody(layout2, p) {
  const b = layout2?.box;
  if (!b || p.x < b.x || p.y < b.y || p.x > b.x + b.w || p.y > b.y + b.h) return false;
  return layout2.hit.some((c) => Math.hypot(p.x - c.x, p.y - c.y) < c.r);
}
function haloRect(layout2, size, reach = 7, fx = 0) {
  const b = layout2?.box;
  if (!b || !(b.w > 0) || !(b.h > 0)) return null;
  const room = Math.max(HALO_REACH, reach * 3, clampTo(num(fx), 0, BOX_MAX) * 256 * size.S);
  const px = Math.max(room, b.w * HALO_PAD), py = Math.max(room, b.h * HALO_PAD);
  const x = Math.max(0, Math.floor(b.x - px)), y = Math.max(0, Math.floor(b.y - py));
  const w = Math.min(Math.ceil(size.W), Math.ceil(b.x + b.w + px)) - x, h = Math.min(Math.ceil(size.H), Math.ceil(b.y + b.h + py)) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}
function touchGate() {
  let inputAt = -Infinity, thrown = false;
  return {
    input(now) {
      inputAt = now;
    },
    take(kind, now) {
      if (!TOUCHES.has(kind)) return false;
      if (kind === "crash" ? !thrown : now - inputAt > TOUCH_MS) return false;
      thrown = kind === "throw";
      return true;
    }
  };
}
function knownScheme(pack, scheme) {
  if (pack.presets.some((p) => p.id === scheme)) return scheme;
  const parts = String(scheme ?? "").split("-");
  return pack.axes.map((a, i) => a.options.some((o) => o.id === parts[i]) ? parts[i] : a.options[0].id).join("-");
}
function loadBody({ layer, pack, start, theme, bounds: bounds2, onEvent, onSound, onError }) {
  return new Promise((resolve, reject) => {
    const frame2 = document.createElement("iframe");
    frame2.setAttribute("sandbox", "allow-scripts");
    frame2.setAttribute("aria-hidden", "true");
    frame2.tabIndex = -1;
    frame2.className = "figure-frame";
    frame2.src = "/figure-frame";
    const clip = document.createElement("div");
    clip.className = "figure-clip";
    clip.appendChild(frame2);
    let haloAt = "";
    let ready = false, gone = false, seq = 0, size = bounds2;
    let layout2 = null, z = null, words2 = null;
    const touches = touchGate();
    const waits = /* @__PURE__ */ new Map();
    const post = (m) => {
      if (!gone) frame2.contentWindow?.postMessage(m, "*");
    };
    const timer = setTimeout(() => fail(new Error(t("figure.notReady", { seconds: READY_MS / 1e3 }))), READY_MS);
    function close() {
      if (gone) return;
      gone = true;
      clearTimeout(timer);
      removeEventListener("message", onMessage);
      clip.remove();
      for (const done of waits.values()) done();
      waits.clear();
    }
    function fail(err) {
      if (gone) return;
      close();
      if (ready) onError?.(err);
      else reject(err);
    }
    const body2 = {
      pack: pack.id,
      get layout() {
        return layout2;
      },
      get z() {
        return z;
      },
      /** The words of the pack's vocabulary its body said it knows, or null when it did not say. */
      get words() {
        return words2;
      },
      /** Whether stage point `p` is on the body. */
      hit: (p) => onBody(layout2, p),
      tick(dt) {
        if (ready) post({ t: "tick", dt });
      },
      do: (word) => post({ t: "do", word }),
      walk: (x, run, id) => post({ t: "walk", x, run, id }),
      /** One of the pack's own targets, `{ to, run, params }` as the World checked it. */
      move: (args, id) => post({ t: "move", args, id }),
      /** Whether the pack asked for the windows (`setWindows`). */
      needsWindows: Array.isArray(pack.needs) && pack.needs.includes("windows"),
      /** The windows (`{ ledges, windows }` in stage pixels, or null), passed on only when the pack asked for them. */
      setWindows(desk) {
        if (body2.needsWindows) post({ t: "windows", ledges: desk?.ledges ?? null, windows: desk?.windows ?? null });
      },
      stopWalk: (id) => post({ t: "stop-walk", id }),
      /** `type`: down, move, up, cancel, leave; `p` in stage pixels with `t` (ms). */
      pointer(type, p) {
        if (type !== "leave") touches.input(performance.now());
        post({ t: "pointer", type, p });
      },
      drop(p) {
        touches.input(performance.now());
        post({ t: "drop", p });
      },
      shift: (dx, dy) => post({ t: "shift", dx, dy }),
      place: (x, facing, y) => post({ t: "place", x, facing, ...typeof y === "number" ? { y } : {} }),
      /** The page's states (see the kit's `set`), and `bounds` when the stage changed size. */
      set(state) {
        if (state.bounds) size = state.bounds;
        post({ t: "set", state });
      },
      cue: (kind) => post({ t: "cue", kind }),
      talk: () => post({ t: "talk" }),
      setScheme(id, o = {}) {
        if (gone) return Promise.resolve();
        const s = ++seq;
        post({ t: "scheme", id: knownScheme(pack, id), fade: o.fade ?? 0, seq: s });
        return new Promise((done) => waits.set(s, done));
      },
      /**
       * The light halo behind the body (pet-app's backdrop), as a CSS filter on the frame's window cut down to
       * the body's surroundings (haloRect), so it blurs only those; a `k` or `reach` of 0 removes it. Called once a frame: it follows the body.
       */
      setHalo(k, reach) {
        const r = k && reach > 0 ? haloRect(layout2, size, reach, pack.effects?.reach) : null;
        const c = r ? `rgba(184,184,184,${k.toFixed(2)})` : "";
        const inner = Math.max(1, Math.round(reach * 3 / 7));
        const at2 = r ? `${r.x},${r.y},${r.w},${r.h},${c},${reach}` : "";
        if (at2 === haloAt) return;
        haloAt = at2;
        if (!r) {
          clip.removeAttribute("style");
          frame2.removeAttribute("style");
          return;
        }
        Object.assign(clip.style, { inset: "auto", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, overflow: "hidden", filter: `drop-shadow(0 0 ${inner}px ${c}) drop-shadow(0 0 ${reach}px ${c})` });
        Object.assign(frame2.style, { inset: "auto", left: `${-r.x}px`, top: `${-r.y}px`, width: `${size.W}px`, height: `${size.H}px` });
      },
      dispose: close
    };
    async function onMessage(e) {
      if (e.source !== frame2.contentWindow) return;
      const m = e.data || {};
      if (m.t === "loaded" && !ready) {
        try {
          const model = pack.model ? await (await fetch(new URL(pack.base + pack.model, location.href))).json() : null;
          post({
            t: "init",
            entry: new URL(pack.base + pack.entry, location.href).href,
            export: pack.export,
            base: new URL(pack.base, location.href).href,
            model,
            scheme: knownScheme(pack, start.scheme),
            start: { x: start.x, facing: start.facing, enter: start.enter, skin: start.skin },
            theme,
            bounds: size,
            language: language()
          });
        } catch (err) {
          fail(err);
        }
      } else if (m.t === "ready" && !ready) {
        ready = true;
        clearTimeout(timer);
        z = typeof m.z === "string" ? m.z : null;
        if (Array.isArray(m.words)) words2 = pack.vocab.map((w) => w.id).filter((id) => m.words.includes(id));
        resolve(body2);
      } else if (m.t === "frame" && ready) {
        layout2 = readLayout(m.layout, size);
        z = typeof m.z === "string" ? m.z : null;
        for (const s of Array.isArray(m.sounds) ? m.sounds : []) {
          if (typeof s?.name === "string") onSound?.(s.name.slice(0, 64), typeof s.kind === "string" ? s.kind : "", ...Array.isArray(s.args) ? s.args.filter((a) => typeof a === "number" || typeof a === "boolean") : []);
        }
        for (const ev of Array.isArray(m.events) ? m.events : []) {
          if (!ev || typeof ev.kind !== "string") continue;
          const d = ev.detail && typeof ev.detail === "object" ? ev.detail : {};
          if (ev.kind === "touch" && !touches.take(d.kind, performance.now())) continue;
          onEvent?.(ev.kind, d);
        }
      } else if (m.t === "scheme") {
        z = typeof m.z === "string" ? m.z : null;
        waits.get(m.seq)?.();
        waits.delete(m.seq);
      } else if (m.t === "error") {
        fail(new Error(m.message));
      }
    }
    addEventListener("message", onMessage);
    layer.appendChild(clip);
  });
}

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/stage.js
var line = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
var DOCK = [
  '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  '<path d="M3.5 7.5a2 2 0 0 1 2-2h3.8l2 2h7.2a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.5 5.2 3.5 8.5s-1.1 6.2-3.5 8.5c-2.4-2.3-3.5-5.2-3.5-8.5s1.1-6.2 3.5-8.5z"/>',
  '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  '<path d="M9 17.5V6.5l10-2v11"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
  '<rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>'
];
var GLOW = 280;
var LENS = 150;
var EASE = 0.18;
function lightWall(wall, area = wall) {
  wall.classList.add("wall");
  const layer = (cls) => {
    const e = document.createElement("div");
    e.className = cls;
    e.setAttribute("aria-hidden", "true");
    return e;
  };
  const glow = layer("wall-glow"), lens = layer("wall-lens"), grid = layer("wall-lens-grid");
  lens.append(grid);
  wall.prepend(glow, lens);
  let x = 0, y = 0, tx = 0, ty = 0, lit = false, frame2 = 0;
  const place2 = () => {
    glow.style.transform = `translate3d(${x - GLOW}px, ${y - GLOW}px, 0)`;
    lens.style.transform = `translate3d(${x - LENS}px, ${y - LENS}px, 0)`;
    grid.style.transform = `translate3d(${LENS - x}px, ${LENS - y}px, 0)`;
  };
  const step = () => {
    x += (tx - x) * EASE;
    y += (ty - y) * EASE;
    if (Math.abs(tx - x) + Math.abs(ty - y) < 0.3) {
      x = tx;
      y = ty;
      frame2 = 0;
    } else frame2 = requestAnimationFrame(step);
    place2();
  };
  area.addEventListener("pointermove", (e) => {
    const r = wall.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    if (!lit) {
      x = tx;
      y = ty;
      place2();
      lit = true;
      wall.classList.add("wall-lit");
    }
    if (!frame2) frame2 = requestAnimationFrame(step);
  });
  area.addEventListener("pointerleave", () => {
    lit = false;
    wall.classList.remove("wall-lit");
  });
}
function glowColor(pack, skin2) {
  if (!pack || pack.id === "coo") return "var(--skin-eye)";
  const scheme = skin2?.scheme || pack.presets?.[0]?.id || "";
  const hex = (c) => typeof c === "string" && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c) ? c : null;
  const preset = (pack.presets ?? []).find((p) => p.id === scheme);
  if (hex(preset?.accent)) return preset.accent;
  const parts = scheme.split("-");
  for (const [i, axis] of (pack.axes ?? []).entries()) {
    const option = (axis.options ?? []).find((o) => o.id === parts[i]);
    if (hex(option?.accent)) return option.accent;
  }
  return null;
}
function accentColors(pack, skin2) {
  if (!pack || pack.id === "coo") return null;
  const preset = (pack.presets ?? []).find((p) => p.id === (skin2?.scheme || pack.presets?.[0]?.id));
  const light = preset?.console?.light?.a, dark = preset?.console?.dark?.a;
  if (light && dark) return { light, dark };
  const one = glowColor(pack, skin2);
  return one ? { light: one, dark: one } : null;
}
function bubbleCss(pack, skin2) {
  if (!pack) return "";
  const preset = (pack.presets ?? []).find((p) => p.id === (skin2?.scheme || pack.presets?.[0]?.id));
  const b = preset?.bubble ?? pack.bubble;
  if (!b?.light || !b?.dark) return "";
  const vars = (c) => `--surface:${c.fill};--text:${c.text};--skin-ink:${c.line}`;
  const sel = "html:root .bubble:not(.heard)";
  return `${sel}{${vars(b.light)}}@media (prefers-color-scheme: dark){html:root:not([data-theme="light"]) .bubble:not(.heard){${vars(b.dark)}}}html:root[data-theme="dark"] .bubble:not(.heard){${vars(b.dark)}}`;
}
function setGlow(wall, color) {
  if (color) wall.style.setProperty("--glow", color);
  else wall.style.removeProperty("--glow");
}
function dressFloor(floor) {
  const row = document.createElement("div");
  row.className = "floor-icons";
  row.setAttribute("aria-hidden", "true");
  row.innerHTML = DOCK.map(line).join("");
  floor.append(row);
}
function modeButton(parent, getTheme, onSwitch, save = (theme) => fetch("/api/prefs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ theme }) }).catch(() => {
}), draw = applyTheme) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "stage-mode";
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    const theme = getTheme() === "dark" ? "light" : "dark";
    show(theme);
    onSwitch?.(theme);
    save(theme);
  });
  const show = (theme) => draw(theme, b);
  show(getTheme());
  parent.append(b);
  return { el: b, show };
}
function announcePainted() {
  if (window.parent === window) return;
  requestAnimationFrame(() => requestAnimationFrame(() => window.parent.postMessage({ type: "companion:painted" }, "*")));
}

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/appearance.js
function bindAppearance(doc, win) {
  const params = new URLSearchParams(win.location.search);
  const initial = params.get("appearance");
  const apply = (mode) => {
    if (mode === "light" || mode === "dark") doc.documentElement.dataset.uiTheme = mode;
  };
  apply(initial);
  let parentOrigin = null;
  try {
    const ref = new URL(doc.referrer);
    if (ref.protocol === win.location.protocol && ref.hostname === win.location.hostname) parentOrigin = ref.origin;
  } catch {
  }
  const applyAccent = (accent) => {
    if (/^#[0-9a-f]{6}$/i.test(String(accent ?? ""))) doc.documentElement.style.setProperty("--host-accent", accent);
  };
  const onMessage = (event) => {
    if (!parentOrigin || event.source !== win.parent || event.origin !== parentOrigin) return;
    if (event.data?.type !== "companion:appearance") return;
    apply(event.data.mode);
    applyAccent(event.data.accent);
  };
  win.addEventListener("message", onMessage);
  let sizes = null;
  if (parentOrigin && win.parent !== win && params.get("fit") === "1") {
    doc.documentElement.dataset.embedded = "";
    const report = () => win.parent.postMessage({ type: "companion:height", height: Math.ceil(doc.body.getBoundingClientRect().height) }, parentOrigin);
    sizes = new win.ResizeObserver(report);
    sizes.observe(doc.body);
  }
  return () => {
    win.removeEventListener("message", onMessage);
    sizes?.disconnect();
  };
}

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/web/pet-app.js
var $ = (s) => document.querySelector(s);
var host = window.petHost || null;
var windowKey = host ? new URLSearchParams(location.hash.slice(1)).get("key") : null;
document.body.classList.add(host ? "desk" : "tab");
var stage = $("#stage");
var bubble = $("#bubble");
var menu = $("#menu");
var tools = $("#tools");
var cooStyle = document.createElement("style");
var skinStyle = document.createElement("style");
var accentStyle = document.createElement("style");
var bubbleStyle = document.createElement("style");
cooStyle.textContent = COO_CSS;
document.head.append(cooStyle, skinStyle, accentStyle, bubbleStyle);
var prefs = {
  roam: "calm",
  sound: true,
  theme: document.documentElement.dataset.theme,
  scale: 1,
  bubbleSize: 1,
  fontSize: 1,
  bubbleSpeed: 1,
  glow: 7,
  user: "",
  mic: false,
  micDevice: "",
  bot: null,
  /** Voice input: switched on, recognizer ready, why not, how to talk, and the mode in force. */
  voice: { enabled: false, ready: false, detail: null, hint: "", mode: "hold" },
  /** The actions shown as buttons beside the pet on hover. */
  hoverButtons: ["chat", "voice"],
  rememberPosition: false,
  /** Double-clicking the pet opens the typing box. */
  doubleClickChat: false,
  statusBubble: true,
  /** What the person typed, said or sent from the chat page stays above Coo (see lines); off, speech shows only while it is heard. */
  saidBubbles: true,
  /** Draw at the moving frame rate while the body rests too. */
  /** Frames a second while the body moves; 0 follows the display. */
  frameRate: 60,
  lockFrameRate: false
};
var modeBtn = host ? null : modeButton(document.body, () => prefs.theme, (theme) => applyPrefs({ theme }));
if (!host) {
  lightWall(document.body, document.documentElement);
  dressFloor($(".floor"));
  bindAppearance(document, window);
}
var shownPack = null;
var lightFor = (s) => {
  if (!host) setGlow(document.body, glowColor(shownPack, s));
  const a = accentColors(shownPack, s);
  accentStyle.textContent = a ? `html:root{--skin-eye:${a.light}}@media (prefers-color-scheme: dark){html:root:not([data-theme="light"]){--skin-eye:${a.dark}}}html:root[data-theme="dark"]{--skin-eye:${a.dark}}` : "";
  bubbleStyle.textContent = bubbleCss(shownPack, s);
};
var sfx = createSfx();
var speech = createSpeech(sfx, { onUnit: () => body?.talk() });
if (host) sfx.unlock();
else ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, () => sfx.unlock(), { capture: true }));
var below = 0;
var floorGap = () => host ? 2 + below : 48;
var bounds = () => ({ W: innerWidth, H: innerHeight, floorY: innerHeight - floorGap(), S: 0.42 * prefs.scale });
var body = null;
var words = /* @__PURE__ */ new Map();
var T = 0;
var at = () => body?.layout ?? null;
var bodyState = { listening: false, thinking: false, thoughtShown: true, dialogOpen: false, status: null };
var holdRoam = (seconds) => body?.set({ hold: seconds });
host?.onFloor?.((px) => {
  below = px;
  body?.set({ bounds: bounds() });
});
host?.onWindows?.((desk) => body?.setWindows(desk));
addEventListener("resize", () => {
  body?.set({ bounds: bounds() });
  send({ t: "hello", screen: { w: innerWidth, h: innerHeight } });
});
var ws = null;
var backoff = 500;
var watching = false;
function send(msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}
function connect() {
  const params = new URLSearchParams({ role: "pet", host: host ? "window" : "tab" });
  if (windowKey) params.set("key", windowKey);
  ws = new WebSocket(`ws://${location.host}/socket?${params}`);
  ws.binaryType = "arraybuffer";
  ws.onopen = () => {
    backoff = 500;
    watching = false;
    send({ t: "hello", screen: { w: innerWidth, h: innerHeight }, host: host ? "window" : "tab" });
    reportVisibility();
  };
  ws.onmessage = (e) => {
    try {
      onOrder(JSON.parse(e.data));
    } catch (err) {
      console.error(err);
    }
  };
  ws.onclose = (e) => {
    ws = null;
    stopMic();
    dropDialogs();
    setStatus(null);
    if (e.code === 4e3 && !host) return;
    setTimeout(connect, backoff);
    backoff = Math.min(8e3, backoff * 2);
  };
}
var windowShown = true;
function reportVisibility() {
  if (host) send({ t: "visibility", hidden: !windowShown });
}
host?.onShown?.((shown) => {
  windowShown = shown;
  sfx.setShown(shown);
  reportVisibility();
});
var overlayOn = false;
function overlayRect() {
  const b = at()?.box;
  if (!b) return null;
  const reach = (shownPack?.effects?.reach ?? 0) * 256 * bounds().S;
  const side = Math.max(24, 0.4 * b.w, reach), top = Math.max(48, b.h, reach);
  const parts = [{ x: b.x - side, y: b.y - top, width: b.w + 2 * side, height: b.h + top + side }];
  for (const el of [bubble, ...lines.map((l) => l.el)]) if (!el.hidden) parts.push(rectOf(el));
  const x = Math.max(0, Math.min(...parts.map((r) => r.x))), y = Math.max(0, Math.min(...parts.map((r) => r.y)));
  const right = Math.min(innerWidth, Math.max(...parts.map((r) => r.x + r.width))), bottom = Math.min(innerHeight, Math.max(...parts.map((r) => r.y + r.height)));
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}
host?.onOverlay?.((on) => {
  overlayOn = on;
});
void useLanguage().then(() => {
  document.title = t("pet.title");
  host?.setLanguage?.(language());
  connect();
});
var skin = normalizeSkin(null);
var wanted = null;
function reportFigure(id, ok, reason, scheme, known) {
  send({ t: "figure", id, ok, ...scheme ? { scheme } : {}, ...reason ? { reason } : {}, ...known !== void 0 ? { words: known } : {} });
}
function bodyFailed(id, err) {
  console.error(err);
  reportFigure(id, false, String(err?.message ?? err));
  if (id !== "coo" && wanted === id) showFigure({ ...skin, figure: "coo" }).catch((e) => console.error(e));
}
var firstX = null;
var firstY = null;
var loading = null;
async function showFigure(s) {
  wanted = s.figure;
  if (loading === s.figure) return;
  if (body?.pack === s.figure) {
    body.set({ skin: s });
    if (s.figure !== "coo") await body.setScheme(s.scheme, { fade: 0.45 });
    lightFor(s);
    reportFigure(s.figure, true, null, s.figure === "coo" ? null : s.scheme);
    return;
  }
  loading = s.figure;
  try {
    await swapBody(s);
  } finally {
    if (loading === s.figure) loading = null;
  }
  if (body?.pack === skin.figure && skin !== s) await showFigure(skin);
}
async function swapBody(s) {
  const pack = (await (await fetch("/api/figures")).json()).find((p) => p.id === s.figure);
  if (!pack) throw new Error(t("figure.notInstalled"));
  const was = at();
  const x = was?.x ?? firstX ?? innerWidth * 0.7, y = was ? was.y : firstY;
  const holder = {};
  const next = await loadBody({
    layer: $("#figureLayer"),
    pack,
    theme: prefs.theme,
    bounds: bounds(),
    // the new body stands where the old one stood; the first one drops in
    start: { x, ...typeof y === "number" ? { y } : {}, facing: was?.facing ?? (x < innerWidth / 2 ? 1 : -1), enter: body ? void 0 : "drop", skin: s, scheme: s.scheme },
    onEvent: (kind, d) => {
      if (body === holder.body) onBody2(kind, d);
    },
    onSound: (name, kind, ...args) => {
      if (body === holder.body) sfx.play(name, kind, ...args);
    },
    onError: (err) => {
      if (body === holder.body) bodyFailed(pack.id, err);
    }
  });
  if (wanted !== s.figure) {
    next.dispose();
    return;
  }
  holder.body = next;
  next.set({ roam: prefs.roam, ...bodyState });
  body?.dispose();
  body = next;
  host?.watchWindows?.(next.needsWindows);
  words = new Map(pack.vocab.map((w) => [w.id, w]));
  shownPack = pack;
  lightFor(s);
  sfx.usePack(pack.base, pack.sounds, pack.voice);
  reportFigure(s.figure, true, null, s.figure === "coo" ? null : s.scheme, next.words);
}
async function applyFigure(s) {
  try {
    await showFigure(s);
  } catch (err) {
    bodyFailed(s.figure, err);
  }
}
var restored = false;
var sentX = null;
var sentY = null;
function restorePosition(startX, startY) {
  sentX = null;
  if (restored) return;
  restored = true;
  if (host && typeof startX === "number") {
    firstX = startX * innerWidth;
    firstY = typeof startY === "number" ? startY * innerHeight : null;
    body?.place(firstX, firstX < innerWidth / 2 ? 1 : -1, firstY ?? void 0);
  }
}
function reportPosition() {
  const l = at();
  if (!host || !prefs.rememberPosition || !l) return;
  const x = l.x / innerWidth, y = typeof l.y === "number" ? l.y / innerHeight : null;
  if (sentX !== null && Math.abs(x - sentX) * innerWidth < 1 && y === null === (sentY === null) && Math.abs((y ?? 0) - (sentY ?? 0)) * innerHeight < 1) return;
  sentX = x;
  sentY = y;
  send({ t: "position", x, ...y !== null ? { y } : {} });
}
var worn = null;
function putOn(s) {
  skin = s;
  skinStyle.textContent = skinCss(skin);
  void applyFigure(skin);
}
function tryOn(patch) {
  worn ??= skin;
  putOn(normalizeSkin({ ...worn, ...patch }));
}
function takeOff(keep) {
  if (!worn) return;
  const was = worn;
  worn = null;
  if (!keep) putOn(was);
}
function applyPrefs(p) {
  if (p.skin) {
    if (worn) worn = normalizeSkin(p.skin);
    else putOn(normalizeSkin(p.skin));
  }
  if (p.roam) {
    prefs.roam = p.roam;
    body?.set({ roam: p.roam });
  }
  if (typeof p.sound === "boolean") {
    prefs.sound = p.sound;
    sfx.set(p.sound);
  }
  if (p.sounds && typeof p.sounds === "object") sfx.configure({ kinds: p.sounds, snoreSeconds: p.sounds.snoreSeconds });
  if (p.speech && typeof p.speech === "object") speech.configure(p.speech);
  if (p.theme === "dark" || p.theme === "light") {
    prefs.theme = p.theme;
    applyTheme(p.theme);
    modeBtn?.show(p.theme);
    body?.set({ theme: p.theme });
  }
  if (typeof p.glow === "number") prefs.glow = p.glow;
  if (typeof p.scale === "number") {
    prefs.scale = p.scale;
    body?.set({ bounds: bounds() });
  }
  if (typeof p.bubbleSize === "number") {
    prefs.bubbleSize = p.bubbleSize;
    sizeVar("--bubble-size", p.bubbleSize);
  }
  if (typeof p.fontSize === "number") {
    prefs.fontSize = p.fontSize;
    sizeVar("--bubble-font", p.fontSize);
  }
  if (typeof p.bubbleSpeed === "number") prefs.bubbleSpeed = p.bubbleSpeed;
  if (typeof p.rememberPosition === "boolean") {
    prefs.rememberPosition = p.rememberPosition;
    reportPosition();
  }
  if (typeof p.user === "string") prefs.user = p.user;
  if (typeof p.micDevice === "string" && p.micDevice !== prefs.micDevice) {
    prefs.micDevice = p.micDevice;
    stopMic();
  }
  if (typeof p.mic === "boolean") {
    prefs.mic = p.mic;
    p.mic && !watching ? startMic() : stopMic();
  }
  if (p.voice && typeof p.voice === "object") prefs.voice = { ...prefs.voice, ...p.voice };
  if (typeof p.doubleClickChat === "boolean") prefs.doubleClickChat = p.doubleClickChat;
  if (typeof p.statusBubble === "boolean") {
    prefs.statusBubble = p.statusBubble;
    setBody({ thoughtShown: p.statusBubble });
  }
  if (typeof p.saidBubbles === "boolean") {
    prefs.saidBubbles = p.saidBubbles;
    if (!p.saidBubbles) {
      for (const line2 of lines) if (!line2.live) fadeLine(line2);
    }
  }
  if (typeof p.lockFrameRate === "boolean") prefs.lockFrameRate = p.lockFrameRate;
  if (typeof p.frameRate === "number" && p.frameRate >= 0) prefs.frameRate = p.frameRate;
  if (typeof p.hideWhenFullscreen === "boolean") host?.hideWhenFullscreen?.(p.hideWhenFullscreen);
  if (Array.isArray(p.hoverButtons)) prefs.hoverButtons = p.hoverButtons.filter((id) => typeof id === "string" && id in ACTIONS);
  if (p.bot) {
    prefs.bot = p.bot;
    if (!menu.hidden && !menu.querySelector(".m-head.confirm")) renderMenuHead();
  }
  if (typeof p.language === "string" && p.language !== language()) void switchLanguage(p.language);
  if ("status" in p) setStatus(p.status);
  refreshButtons();
}
function sizeVar(name, k) {
  if (k === 1) document.documentElement.style.removeProperty(name);
  else document.documentElement.style.setProperty(name, String(k));
}
async function switchLanguage(code) {
  await useLanguage(code);
  document.title = t("pet.title");
  host?.setLanguage?.(code);
  if (!menu.hidden && !menu.querySelector(".m-head.confirm")) renderMenuHead();
  refreshButtons();
}
function onOrder(m) {
  switch (m.t) {
    case "init":
      restorePosition(m.startX, m.startY);
      applyPrefs(m);
      if (!host) announcePainted();
      break;
    case "prefs":
      applyPrefs(m);
      break;
    case "watching":
      watching = true;
      stopMic();
      break;
    // the settings window's 「在桌面上隐藏」: the same as the menu's 「隐藏」
    case "hide":
      host?.hide?.();
      break;
    case "type":
      openTyping();
      break;
    case "say":
      dropAsks();
      queue.push({ kind: "say", id: m.id, beats: m.beats, i: -1 });
      holdRoam(20);
      break;
    case "ask":
      dropAsks();
      queue.push({ kind: "ask", id: m.id, question: m.question, options: m.options || [], own: m.own !== false });
      holdRoam(20);
      break;
    case "confirm":
      dropAsks();
      queue.push({ kind: "ask", confirm: true, id: m.id, question: m.question, options: m.options, own: false });
      holdRoam(20);
      break;
    case "walk":
      walk(m);
      break;
    case "move":
      walk(m);
      break;
    case "walk-stop":
      body?.stopWalk(m.id);
      break;
    case "ask-close":
      closeAsk(m.id);
      break;
    case "act":
      acts.push(...m.actions);
      holdRoam(20);
      break;
    case "listen":
      onListen(m);
      break;
    // a message sent from the chat page, once the bot has it, and one taken back before delivery
    case "said":
      if (prefs.saidBubbles) addLine("chat", typeof m.text === "string" ? m.text : "", false, { images: Number(m.images) || 0, cursor: m.cursor ?? null });
      break;
    case "said-withdrawn":
      withdrawLine(m.cursor);
      break;
    // 一张跟着 Coo 走的图：由扩展把 data URL 发到 World，再转给这里
    case "image-bubble":
      addImageBubble(m);
      break;
    case "status":
      setStatus(m.status);
      break;
    case "dialog":
      queue.push({ kind: "dialog", id: m.id, d: m });
      holdRoam(20);
      break;
    case "dialog-update":
      updateDialog(m);
      break;
    case "dialog-close":
      endDialog(m.id);
      break;
  }
}
function setBody(change) {
  if (Object.entries(change).every(([k, v]) => bodyState[k] === v)) return;
  Object.assign(bodyState, change);
  body?.set(change);
}
var walkTargets = /* @__PURE__ */ new Map();
function onBody2(kind, d) {
  if (kind === "arrived" || kind === "interrupted") {
    if (!d.walkId || !walkTargets.has(d.walkId)) return;
    walkTargets.delete(d.walkId);
    const y = typeof d.y === "number" ? d.y : at()?.y;
    send({ t: kind, walkId: d.walkId, x: (typeof d.x === "number" ? d.x : at()?.x ?? 0) / innerWidth, ...typeof y === "number" ? { y: y / innerHeight } : {}, by: d.by });
  } else if (kind === "touch") {
    send({ t: "touch", ...d });
    if (d.kind === "grab") closeMenu();
  } else if (kind === "mode") {
    reportPosition();
  } else if (kind === "done") {
    if (d.word === actWord) actUntil = T;
  }
}
function walk(m) {
  holdRoam(20);
  if (!body) {
    send({ t: "interrupted", walkId: m.id, x: 0.5, by: "none" });
    return;
  }
  walkTargets.set(m.id, true);
  if (m.t === "move") {
    body.move(m.move, m.id);
    return;
  }
  const x = m.to === "cursor" ? pointerSeen ? lastPointer.x : innerWidth / 2 : clamp(Number(m.to), 0, 1) * innerWidth;
  body.walk(x, !!m.run, m.id);
}
var acts = [];
var actUntil = 0;
var actWord = null;
function stepActs() {
  if (T < actUntil || !acts.length) return;
  const l = at();
  if (!l || l.busy) return;
  const a = acts.shift();
  body.do(a);
  actWord = a;
  actUntil = T + (words.get(a)?.seconds ?? 1);
  holdRoam(15);
}
var queue = [];
var item = null;
var PAUSE = /[,.!?;:…，。！？；：、]/;
var SILENT = /[\s,.!?;:…，。！？；：、「」『』()（）]/;
function dropAsks() {
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].kind === "ask" && !queue[i].confirm) queue.splice(i, 1);
  if (item && item.kind === "ask" && !item.answered && !item.confirm) closeBubble();
}
function openBubble(kind, html) {
  bubble.className = "bubble " + kind;
  bubble.removeAttribute("aria-label");
  delete bubble.dataset.kind;
  delete bubble.dataset.icon;
  bubble.innerHTML = html;
  bubble.hidden = false;
  void bubble.offsetWidth;
  bubble.classList.add("pop");
}
function closeBubble() {
  releaseKeys(item);
  if (item?.kind === "dialog") {
    talk.motion = null;
    takeOff(false);
  }
  bubble.hidden = true;
  bubble.innerHTML = "";
  if (item) item.endedAt = T;
  item = null;
  speech.stop();
}
function openTyping() {
  if (item?.kind !== "input") openInput();
  if (item?.kind !== "input") return;
  if (host?.grabFocus) {
    item.grabbed = true;
    host.grabFocus();
  }
  setTimeout(() => bubble.querySelector("textarea")?.focus(), 30);
}
function grabKeys(it) {
  if (!host?.grabFocus || !it.options.length) return;
  it.grabbed = true;
  host.grabFocus();
}
function releaseKeys(it) {
  if (!it?.grabbed) return;
  it.grabbed = false;
  host.releaseFocus();
}
function startItem(it) {
  item = it;
  if (it.kind === "say" || it.kind === "ask") answerLines(it);
  if (it.kind === "dialog") {
    openDialog(it);
    return;
  }
  if (it.kind === "ask") {
    openBubble("ask", `<button class="b-close" type="button" aria-label="${esc(t("bubble.close"))}">\xD7</button><p class="b-text"></p><div class="b-opts" hidden></div>`);
    bubble.querySelector(".b-close").addEventListener("click", () => dismissAsk());
    it.text = it.question;
    it.shown = 0;
    it.acc = 0;
    it.optsShown = false;
    sfx.pop();
  }
}
var pointedAt = () => !bubble.hidden && bubble.matches(":hover");
function stepDialog(dt) {
  if (!item && queue.length && at() && !at().busy) startItem(queue.shift());
  const it = item;
  if (!it) return;
  if (it.kind === "say") {
    if (it.i < 0 || it.beatDone) {
      if (it.beatDone && pointedAt()) it.holdUntil += dt;
      if (it.beatDone && T < it.holdUntil) return;
      it.i++;
      it.beatDone = false;
      if (it.i >= it.beats.length) {
        closeBubble();
        return;
      }
      const b2 = it.beats[it.i];
      let lead = 0;
      for (const a of b2.actions || []) {
        acts.push(a);
        lead = 0.45;
      }
      it.shown = 0;
      it.acc = 0;
      it.fired = 0;
      it.startAt = T + lead;
      if (b2.text) {
        openBubble("say", '<p class="b-text"></p>');
        sfx.pop();
      } else {
        bubble.hidden = true;
      }
      return;
    }
    const b = it.beats[it.i];
    if (T < it.startAt) return;
    if (!b.text) {
      it.beatDone = true;
      it.holdUntil = T + 0.8 / prefs.bubbleSpeed;
      return;
    }
    typeText(it, b.text, dt, b.anchors || []);
    if (it.shown >= b.text.length && !it.beatDone) {
      it.beatDone = true;
      const last2 = it.i === it.beats.length - 1;
      it.holdUntil = T + (last2 ? 1.6 + b.text.length * 0.07 : 0.9 + b.text.length * 0.03) / prefs.bubbleSpeed;
    }
    return;
  }
  if (it.kind === "ask") {
    if (it.shown < it.text.length) {
      typeText(it, it.text, dt, []);
      return;
    }
    if (!it.optsShown) {
      it.optsShown = true;
      showOptions(it);
    }
  }
  if (it.kind === "dialog") stepTalk(it, dt);
}
function typeText(it, text, dt, anchors) {
  const p = bubble.querySelector(".b-text");
  if (!p || it.shown >= text.length) return;
  if (it.spoken !== text) {
    it.spoken = text;
    speech.begin(text);
  }
  const spoken = speech.active;
  it.acc += dt * 20 * prefs.bubbleSpeed;
  while (it.acc >= 1 && it.shown < text.length) {
    const ch = text[it.shown++];
    it.acc -= spoken ? textSteps(ch) : PAUSE.test(ch) ? 5 : 1;
    if (spoken) speech.reveal(it.shown - 1);
    else if (!SILENT.test(ch)) {
      sfx.babble(ch);
      body?.talk();
    }
    while (it.fired < anchors.length && anchors[it.fired].at <= it.shown) acts.push(...anchors[it.fired++].actions);
  }
  if (it.marks?.length) p.innerHTML = marked(text, it.shown, it.marks);
  else p.replaceChildren(linked(text, it.shown));
}
function marked(text, n, words2) {
  const on = new Array(text.length).fill(false);
  for (const w of words2) {
    if (!w) continue;
    for (let i = text.indexOf(w); i >= 0; i = text.indexOf(w, i + w.length)) on.fill(true, i, i + w.length);
  }
  let out = "", open = false;
  for (let i = 0; i < n; i++) {
    if (on[i] !== open) {
      out += on[i] ? '<b class="d-mark">' : "</b>";
      open = on[i];
    }
    out += esc(text[i]);
  }
  return open ? out + "</b>" : out;
}
function showOptions(it) {
  const box = bubble.querySelector(".b-opts");
  it.options.forEach((label, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b-opt";
    b.innerHTML = i < 9 ? `<kbd>${i + 1}</kbd><span></span>` : "<span></span>";
    b.querySelector("span").textContent = label;
    b.style.animationDelay = i * 0.07 + "s";
    b.addEventListener("click", () => answer(b, { index: i }));
    box.appendChild(b);
    setTimeout(() => sfx.blub(), i * 70);
  });
  if (it.own) {
    const form = document.createElement("form");
    form.className = "b-own";
    form.innerHTML = `<input type="text" maxlength="200" autocomplete="off" placeholder="${esc(t("bubble.ownPlaceholder"))}" aria-label="${esc(t("bubble.ownLabel"))}"><button type="submit">${esc(t("bubble.send"))}</button>`;
    form.style.animationDelay = it.options.length * 0.07 + "s";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input"), v = input.value.trim();
      if (!v) {
        input.focus();
        return;
      }
      answer(form, { text: v });
    });
    box.appendChild(form);
  }
  box.hidden = false;
  grabKeys(it);
}
function answer(node, a) {
  const it = item;
  if (!it || it.kind !== "ask" || it.answered) return;
  it.answered = true;
  sfx.select();
  node.classList.add("chosen");
  bubble.querySelectorAll(".b-opt, .b-own").forEach((n) => {
    if (n !== node) n.classList.add("dim");
  });
  send(it.confirm ? { t: "confirmed", id: it.id, index: a.index } : { t: "answer", askId: it.id, ...a });
  releaseKeys(it);
  body?.cue("cheer");
  setTimeout(() => {
    if (item === it) closeBubble();
  }, 700);
}
function closeAsk(id) {
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].kind === "ask" && queue[i].id === id) queue.splice(i, 1);
  if (item && item.kind === "ask" && item.id === id && !item.answered) {
    item.answered = true;
    closeBubble();
  }
}
function dismissAsk() {
  const it = item;
  if (!it || it.kind !== "ask" || it.answered) return;
  it.answered = true;
  send(it.confirm ? { t: "confirmed", id: it.id, index: null } : { t: "answer", askId: it.id, dismissed: true });
  closeBubble();
}
var talk = { motion: null, next: 0 };
var TALK_RANGE = 240;
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function dropDialogs() {
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].kind === "dialog") queue.splice(i, 1);
  if (item?.kind === "dialog") closeBubble();
}
function openDialog(it) {
  const d = it.d;
  const dots = Array.isArray(d.step) ? Array.from({ length: d.step[1] }, (_, i) => `<i class="${i + 1 < d.step[0] ? "past" : i + 1 === d.step[0] ? "on" : ""}"></i>`).join("") : "";
  openBubble("talk", `${dots || d.closable ? `<div class="d-top"><span class="d-dots">${dots}</span>${d.closable ? `<button class="b-close" type="button" aria-label="${esc(t("bubble.skip"))}" title="${esc(t("bubble.skip"))}">\xD7</button>` : ""}</div>` : ""}<p class="b-text"></p><div class="d-body" hidden></div>`);
  bubble.querySelector(".b-close")?.addEventListener("click", () => settleDialog(it, { closed: true }));
  for (const a of d.actions || []) acts.push(a);
  it.text = d.text || "";
  it.shown = 0;
  it.acc = 0;
  it.bodyShown = false;
  it.readUntil = 0;
  it.marks = Array.isArray(d.marks) ? d.marks.filter((w) => typeof w === "string") : [];
  sfx.pop();
}
function stepTalk(it, dt) {
  if (it.shown < it.text.length) {
    typeText(it, it.text, dt, []);
    return;
  }
  if (it.bodyShown) return;
  it.bodyShown = true;
  if (!it.d.input) {
    it.readUntil = T + (1.4 + it.text.length * 0.05) / prefs.bubbleSpeed;
    return;
  }
  showDialogInput(it);
}
function stepTalkRead(dt) {
  const it = item;
  if (it?.kind !== "dialog" || !it.readUntil) return;
  if (pointedAt()) it.readUntil += dt;
  if (T > it.readUntil) settleDialog(it, { done: true });
}
function showDialogInput(it) {
  const body2 = bubble.querySelector(".d-body"), input = it.d.input;
  if (!body2) return;
  if (input.kind === "buttons") {
    if (input.keys) body2.insertAdjacentHTML("beforeend", `<div class="d-keys"><kbd class="d-key${input.taps > 1 ? " taps" : ""}">${esc(input.keys)}</kbd>${input.taps > 1 ? `<span class="d-taps">\xD7${Number(input.taps)}</span>` : ""}</div>`);
    const row = Object.assign(document.createElement("div"), { className: "d-row" });
    input.options.forEach((o, i) => row.appendChild(pill(o.label, o.primary, () => settleDialog(it, { index: i }), o.hover)));
    body2.appendChild(row);
  } else if (input.kind === "choices") {
    const cards = Object.assign(document.createElement("div"), { className: input.list ? "d-cards list" : "d-cards" });
    const extra = Array.isArray(input.more?.options) ? input.more.options : [];
    const all = [...input.options, ...extra];
    const pick = (i, speak) => {
      it.value = i;
      cards.querySelectorAll(".d-card").forEach((c) => c.classList.toggle("on", Number(c.dataset.i) === i));
      const o = all[i];
      if (it.pinX === void 0) {
        const a = at()?.bubble ?? { x: innerWidth / 2, y: innerHeight };
        it.pinX = a.x;
        it.pinY = a.y;
      }
      talk.motion = o?.motion ?? null;
      talk.next = 0;
      if (o?.skin) tryOn(o.skin);
      if (speak && o?.line) {
        it.text = o.line;
        it.shown = 0;
        it.acc = 0;
      }
      if (speak && o?.actions) acts.push(...o.actions);
    };
    const card = (o, k, onClick) => {
      const c = document.createElement("button");
      const pal = PALETTES.find((p) => p.id === o.skin?.palette);
      const tint = o.tint ?? (pal ? { light: pal.l[1], dark: pal.d[1] } : null);
      c.type = "button";
      c.className = tint ? "d-card tint" : "d-card";
      if (tint) {
        c.style.setProperty("--tint-l", tint.light);
        c.style.setProperty("--tint-d", tint.dark);
      }
      c.style.animationDelay = k * 0.07 + "s";
      const image = typeof o.image === "string" && o.image.startsWith("data:image/") ? `<img class="d-cardimg" alt="" src="${esc(o.image)}">` : "";
      c.innerHTML = `${image || (o.icon && ICONS[o.icon] ? `<span class="d-cardic ic-${esc(o.icon)}">${ICONS[o.icon]}</span>` : "")}<span class="d-cardlbl">${esc(o.label)}</span>${o.note ? `<span class="d-cardnote">${esc(o.note)}</span>` : ""}${o.level ? `<b class="d-level">${esc(o.level)}</b>` : ""}`;
      c.addEventListener("click", () => {
        sfx.tick();
        onClick();
      });
      cards.appendChild(c);
      setTimeout(() => sfx.blub(), k * 70);
      return c;
    };
    const add = (from, to, k0) => {
      for (let i = from; i < to; i++) card(all[i], k0 + i - from, () => pick(i, true)).dataset.i = String(i);
    };
    const start = typeof input.value === "number" ? input.value : 0;
    const folded = extra.length > 0 && start < input.options.length;
    add(0, folded ? input.options.length : all.length, 0);
    if (folded) {
      const more = card(input.more, input.options.length, () => {
        const from = cards.offsetHeight;
        more.remove();
        add(input.options.length, all.length, 0);
        pick(input.options.length, false);
        const to = cards.offsetHeight;
        if (to !== from && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
          cards.classList.add("unfolding");
          cards.animate([{ height: from + "px" }, { height: to + "px" }], { duration: 320, easing: "cubic-bezier(.3,1.1,.5,1)" }).finished.finally(() => cards.classList.remove("unfolding"));
        }
      });
    }
    body2.appendChild(cards);
    const row = Object.assign(document.createElement("div"), { className: input.hint ? "d-row d-foot-row" : "d-row" });
    if (input.hint) {
      const h = input.hint, at2 = h.text.indexOf(h.mark);
      const mark = `<b>${ICONS[h.icon] ?? ""}${esc(h.mark)}</b>`;
      row.insertAdjacentHTML("beforeend", `<span class="d-hint">${at2 < 0 ? esc(h.text) : esc(h.text.slice(0, at2)) + mark + esc(h.text.slice(at2 + h.mark.length))}</span>`);
    }
    row.appendChild(pill(input.confirm, true, () => settleDialog(it, { index: it.value ?? 0 })));
    body2.appendChild(row);
    pick(start, false);
  } else if (input.kind === "text") {
    const form = Object.assign(document.createElement("form"), { className: "d-field" });
    form.innerHTML = `<input type="${input.secret ? "password" : "text"}" autocomplete="off" spellcheck="false" maxlength="${Number(input.maxLength) || 200}">${input.secret ? `<button class="d-peek" type="button" aria-label="${esc(t("bubble.peek"))}" title="${esc(t("bubble.peek"))}">${ICONS.eye}</button>` : ""}<button class="d-send" type="submit"></button>`;
    const field = form.querySelector("input");
    field.placeholder = input.placeholder || "";
    field.value = input.value || "";
    if (Array.isArray(input.suggestions) && input.suggestions.length && !input.secret) {
      const list = document.createElement("datalist");
      list.id = `d-list-${it.id}`;
      for (const s of input.suggestions) list.appendChild(Object.assign(document.createElement("option"), { value: String(s) }));
      form.appendChild(list);
      field.setAttribute("list", list.id);
    }
    field.setAttribute("aria-label", it.text);
    form.querySelector(".d-send").textContent = input.submit;
    form.querySelector(".d-peek")?.addEventListener("click", (e) => {
      const show = field.type === "password";
      field.type = show ? "text" : "password";
      e.currentTarget.innerHTML = show ? ICONS.eyeOff : ICONS.eye;
      field.focus();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = field.value.trim();
      if (!v) {
        form.classList.remove("shake");
        void form.offsetWidth;
        form.classList.add("shake");
        field.focus();
        return;
      }
      settleDialog(it, { text: v });
    });
    body2.appendChild(form);
    if (input.link || input.alt) {
      const row = Object.assign(document.createElement("div"), { className: "d-links" });
      if (input.link) {
        const a = Object.assign(document.createElement("a"), { className: "d-link", href: input.link.url, target: "_blank", rel: "noopener" });
        a.innerHTML = `<span></span>${ICONS.external}`;
        a.querySelector("span").textContent = input.link.label;
        row.appendChild(a);
      }
      if (input.alt) {
        const b = Object.assign(document.createElement("button"), { type: "button", className: "d-alt", textContent: input.alt });
        b.addEventListener("click", () => settleDialog(it, { alt: true }));
        row.appendChild(b);
      }
      body2.appendChild(row);
    }
    host?.focus?.();
    setTimeout(() => field.focus(), 30);
  } else if (input.kind === "progress") {
    body2.innerHTML = `<div class="d-bar${typeof it.progress === "number" ? "" : " wait"}"><i></i></div><div class="d-barlbl"><span></span><b></b></div>`;
    body2.querySelector(".d-barlbl span").textContent = input.label || "";
    drawProgress(it);
  }
  body2.hidden = false;
  body2.querySelector(".d-send, .d-pill.primary")?.focus?.({ preventScroll: true });
}
function pill(label, primary, onClick, hover) {
  const b = Object.assign(document.createElement("button"), { type: "button", className: `d-pill${primary ? " primary" : ""}`, textContent: label });
  if (hover) {
    b.classList.add("swap");
    b.setAttribute("aria-label", hover);
    b.innerHTML = `<span class="d-pill-rest">${esc(label)}</span><span class="d-pill-hover">${esc(hover)}</span>`;
  }
  b.addEventListener("click", onClick);
  return b;
}
function drawProgress(it) {
  const bar = bubble.querySelector(".d-bar");
  if (!bar) return;
  const p = it.progress;
  bar.classList.toggle("wait", typeof p !== "number");
  bar.querySelector("i").style.width = typeof p === "number" ? `${Math.round(clamp(p, 0, 1) * 100)}%` : "";
  bubble.querySelector(".d-barlbl b").textContent = typeof p === "number" ? `${Math.floor(clamp(p, 0, 1) * 100)}%` : "";
}
function updateDialog(m) {
  const it = item?.kind === "dialog" && item.id === m.id ? item : queue.find((q) => q.kind === "dialog" && q.id === m.id);
  if (!it) return;
  if ("progress" in m) it.progress = m.progress;
  if (typeof m.text === "string") {
    it.d = { ...it.d, text: m.text };
    if (it === item) {
      it.text = m.text;
      it.shown = 0;
      it.acc = 0;
    }
  }
  if (it === item) drawProgress(it);
}
function endDialog(id) {
  const i = queue.findIndex((q) => q.kind === "dialog" && q.id === id);
  if (i >= 0) queue.splice(i, 1);
  if (item?.kind === "dialog" && item.id === id) closeBubble();
}
function settleDialog(it, answer2) {
  if (item !== it || it.answered) return;
  it.answered = true;
  send({ t: "dialog", id: it.id, ...answer2 });
  takeOff("index" in answer2);
  if (answer2.done) {
    closeBubble();
    return;
  }
  sfx.select();
  bubble.querySelectorAll("button, input").forEach((n) => {
    n.disabled = true;
  });
  if ("index" in answer2) bubble.querySelectorAll(".d-pill")[answer2.index]?.classList.add("chosen");
  setTimeout(() => {
    if (item === it) closeBubble();
  }, 260);
}
function stepTalkMotion() {
  const it = item;
  if (it?.kind !== "dialog") return;
  holdRoam(20);
  const l = at();
  if (!talk.motion || it.pinX === void 0 || !l || l.busy || T < talk.next || l.mode !== "idle") return;
  const home = it.pinX, R = Math.min(TALK_RANGE, innerWidth * 0.25);
  if (talk.motion === "still") {
    if (Math.abs(l.x - home) > 30) body.walk(home, false, 0);
    talk.next = T + 1;
    return;
  }
  const run = talk.motion === "run";
  if (run && Math.random() < 0.3 && words.has("hop")) {
    body.do("hop");
    talk.next = T + 0.5;
    return;
  }
  const x = l.x < home ? home + R * (0.4 + Math.random() * 0.6) : home - R * (0.4 + Math.random() * 0.6);
  body.walk(clamp(x, 40, innerWidth - 40), run, 0);
  talk.next = T + (run ? 0.1 : 1.2 + Math.random() * 1.2);
}
var IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
var IMAGE_EDGE = 2048;
var IMAGE_BYTES = 6 * 1024 * 1024;
var BOX_IMAGES = 4;
async function fitImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(t("bubble.imageUnreadable"));
  }
  try {
    const name = file.name || "image";
    const scale = Math.min(1, IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale));
    if (scale === 1 && file.size <= IMAGE_BYTES) return { name, mime: file.type, base64: await base64Of(file), bytes: file.size, width, height };
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    const encode = (mime2, quality) => new Promise((resolve) => canvas.toBlob(resolve, mime2, quality));
    let mime = file.type === "image/gif" ? "image/png" : file.type;
    let blob2 = await encode(mime);
    if (blob2 && blob2.size > IMAGE_BYTES && mime !== "image/jpeg") {
      mime = "image/jpeg";
      blob2 = await encode(mime, 0.85);
    }
    if (!blob2) throw new Error(t("bubble.imageUnreadable"));
    if (blob2.size > IMAGE_BYTES) throw new Error(t("bubble.imageTooLarge", { mb: IMAGE_BYTES / 1048576 }));
    return { name, mime, base64: await base64Of(blob2), bytes: blob2.size, width, height };
  } finally {
    bitmap.close();
  }
}
function base64Of(blob2) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(t("bubble.imageUnreadable")));
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob2);
  });
}
function openInput() {
  closeMenu();
  if (item && item.kind === "ask" && !item.answered) return;
  if (item) closeBubble();
  const it = item = { kind: "input", images: [], pending: 0, pasted: 0 };
  const expand = prefs.bot?.buttons?.chat ? `<button class="b-expand" type="button" aria-label="${esc(t("bubble.expand"))}" title="${esc(t("bubble.expand"))}">${ICONS.expand}</button>` : "";
  openBubble("ask", `<button class="b-close" type="button" aria-label="${esc(t("bubble.close"))}">\xD7</button><div class="b-imgs" hidden></div><form class="b-own"><textarea rows="1" maxlength="500" autocomplete="off" placeholder="${esc(t("bubble.typePlaceholder"))}" aria-label="${esc(t("bubble.typeLabel"))}"></textarea>${expand}<button type="submit">${esc(t("bubble.send"))}</button></form><span class="b-hint b-note" hidden></span>`);
  const form = bubble.querySelector("form"), input = form.querySelector("textarea");
  const tray = bubble.querySelector(".b-imgs"), note = bubble.querySelector(".b-note");
  const say = (text) => {
    note.textContent = text || "";
    note.hidden = !text;
  };
  const draw = () => {
    tray.hidden = !it.images.length;
    tray.replaceChildren(...it.images.map((img) => {
      const cell = document.createElement("span");
      cell.className = "b-img";
      cell.innerHTML = `<img alt="" src="data:${esc(img.mime)};base64,${img.base64}"><button type="button" aria-label="${esc(t("bubble.removeImage"))}" title="${esc(t("bubble.removeImage"))}">\xD7</button>`;
      cell.querySelector("button").addEventListener("click", () => {
        it.images.splice(it.images.indexOf(img), 1);
        say("");
        draw();
        input.focus();
      });
      return cell;
    }));
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener("paste", (e) => {
    const files = [...e.clipboardData?.files ?? []].filter((f3) => IMAGE_MIMES.includes(f3.type));
    if (!files.length) return;
    e.preventDefault();
    if (it.images.length + it.pending + files.length > BOX_IMAGES) {
      say(t("bubble.tooManyImages", { max: BOX_IMAGES }));
      return;
    }
    say(prefs.bot?.imagesSeen === false ? t("bubble.imagesUnseen", { bot: prefs.bot.name || "Coo" }) : "");
    for (const file of files) {
      const order = ++it.pasted;
      it.pending++;
      fitImage(file).then((img) => {
        if (item !== it) return;
        it.images.push({ ...img, order });
        it.images.sort((a, b) => a.order - b.order);
        draw();
      }, (err) => {
        if (item === it) say(err.message);
      }).finally(() => {
        it.pending--;
      });
    }
  });
  bubble.querySelector(".b-close").addEventListener("click", () => closeBubble());
  bubble.querySelector(".b-expand")?.addEventListener("click", () => {
    send({ t: "expand", text: input.value, images: it.images });
    closeBubble();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (it.pending || !v && !it.images.length) return;
    send({ t: "text", text: v, ...it.images.length ? { images: it.images.map(({ mime, base64, name }) => ({ mime, base64, name })) } : {} });
    sfx.select();
    body?.cue("cheer");
    closeBubble();
    if (prefs.saidBubbles) addLine("type", v, false, { images: it.images.length });
  });
  host?.focus?.();
  setTimeout(() => input.focus(), 30);
}
var listen = { phase: null, line: null, text: "", interim: "" };
function onListen(m) {
  if (m.phase === "ready") {
    if (listen.phase) return;
    sfx.tick();
    body?.cue("perk");
    return;
  }
  if (m.phase === "start") {
    if (!listen.phase) sfx.listenStart();
    listen.phase = "hearing";
    setBody({ listening: true });
    showHeard();
  } else if (m.phase === "transcribing") {
    listen.phase = listen.phase || "hearing";
    showHeard();
  } else if (m.phase === "partial") {
    listen.text = m.text || "";
    listen.interim = m.interim || "";
    showHeard();
  } else if (m.phase === "heard") {
    const line2 = listen.line ?? addLine("voice", "", true);
    endListen();
    settleLine(line2, m.text || "");
    if (!prefs.saidBubbles) fadeLine(line2);
    sfx.listenEnd();
    body?.cue("heard");
  } else if (m.phase === "none") {
    if (listen.line) dropLine(listen.line);
    endListen();
  }
}
function endListen() {
  listen.phase = null;
  listen.line = null;
  listen.text = "";
  listen.interim = "";
  setBody({ listening: false });
}
function showHeard() {
  listen.line ??= addLine("voice", "", true);
  const el = listen.line.el, { text, interim } = listen;
  el.querySelector(".b-cancel").hidden = prefs.voice.mode === "always";
  el.querySelector(".fin").textContent = text;
  el.querySelector(".interim").textContent = text && interim && /[A-Za-z0-9.,!?;:]$/.test(text) && /^[A-Za-z0-9]/.test(interim) ? " " + interim : interim;
  el.querySelector(".b-hint").textContent = t(text || interim ? "heard.more" : "heard.listening");
}
var REPLIED_FADE = 1;
var UNANSWERED_FADE = 8;
var MAX_LINES = 3;
var MAX_ROWS = 6;
var LINE_FADE = 0.4;
var MARKS = { voice: ICONS.mic, chat: ICONS.expand };
var lines = [];
function addLine(src, text, live = false, extra = {}) {
  const el = document.createElement("div");
  el.className = "bubble heard said pop";
  el.setAttribute("role", "status");
  document.body.append(el);
  const line2 = { el, src, text, live, settledAt: live ? null : T, reply: null, fadeAt: null, ox: null, oy: null, images: 0, cursor: null, ...extra };
  el.addEventListener("click", () => {
    if (!line2.live && line2.fadeAt === null) {
      sfx.tick();
      fadeLine(line2);
    }
  });
  if (live) {
    el.innerHTML = '<p class="b-text"><span class="fin"></span><span class="interim"></span><span class="caret" aria-hidden="true"></span></p><div class="b-foot"><span class="b-hint"></span><button class="b-cancel" type="button"></button></div>';
    el.querySelector(".b-cancel").textContent = t("heard.cancel");
    el.querySelector(".b-cancel").addEventListener("click", () => {
      sfx.tick();
      send({ t: "cancel" });
    });
  } else drawLine(line2);
  lines.push(line2);
  return line2;
}
function drawLine(line2) {
  const mark = MARKS[line2.src] ? `<span class="said-mark" aria-hidden="true">${MARKS[line2.src]}</span>` : "";
  const images = line2.images ? `<span class="b-hint">${line2.text ? "" : mark}${esc(t("said.images", { count: line2.images }))}</span>` : "";
  line2.el.innerHTML = (line2.text || !line2.images ? `<p class="b-text">${mark}${esc(line2.text)}</p>` : "") + images;
  line2.el.classList.add("settled");
  line2.el.title = t("bubble.close");
}
function settleLine(line2, text) {
  line2.live = false;
  line2.text = text;
  line2.settledAt = T;
  drawLine(line2);
}
function addImageBubble(m) {
  const url = typeof m.dataUrl === "string" ? m.dataUrl : "";
  if (!url.startsWith("data:image/")) return;
  const el = document.createElement("div");
  el.className = "bubble heard said pop image-bubble";
  el.setAttribute("role", "status");
  el.style.padding = "6px";
  el.style.lineHeight = "0";
  el.style.maxWidth = "none";
  const img = document.createElement("img");
  img.alt = "";
  img.decoding = "async";
  img.style.display = "block";
  img.style.objectFit = "contain";
  el.append(img);
  document.body.append(el);
  const line2 = {
    el,
    src: "chat",
    text: "",
    live: false,
    settledAt: T,
    reply: null,
    fadeAt: null,
    ox: null,
    oy: null,
    images: 0,
    cursor: null,
    image: true
  };
  el.addEventListener("click", () => {
    if (line2.fadeAt === null) fadeLine(line2);
  });
  const radius = Math.max(0, Math.min(64, Number(m.radius) || 16));
  img.onload = () => {
    const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
    const wanted2 = Number(m.size) > 0 ? Number(m.size) : Math.min(innerWidth, innerHeight) / 3 * (Number(m.scale) || 1);
    const long = Math.max(24, Math.min(2e3, wanted2));
    const k = long / Math.max(nw, nh);
    let w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
    const fit = Math.min(1, (innerWidth - 40) / w, innerHeight * 0.55 / h);
    w = Math.max(1, Math.round(w * fit));
    h = Math.max(1, Math.round(h * fit));
    img.style.width = w + "px";
    img.style.height = h + "px";
    const r = Math.min(radius, Math.max(w, h) * 0.12, Math.min(w, h) * 0.25);
    img.style.borderRadius = Math.max(0, Math.round(r)) + "px";
  };
  img.src = url;
  lines.push(line2);
  const duration = Math.max(1, Math.min(30, Number(m.duration) || 3));
  setTimeout(() => fadeLine(line2), duration * 1e3);
  return line2;
}
function fadeLine(line2) {
  if (line2.fadeAt !== null) return;
  line2.fadeAt = T;
  line2.el.classList.add("fading");
}
function dropLine(line2) {
  line2.el.remove();
  lines.splice(lines.indexOf(line2), 1);
}
function withdrawLine(cursor2) {
  const line2 = lines.find((l) => l.cursor === cursor2);
  if (line2) fadeLine(line2);
}
function answerLines(it) {
  for (const line2 of lines) if (!line2.live && !line2.reply) line2.reply = it;
}
function rowsOf(line2) {
  if (line2.image) return Math.max(1, Math.ceil((line2.el.offsetHeight + 8) / 24));
  const p = line2.el.querySelector(".b-text");
  const hint = line2.images ? 1 : 0;
  if (!p) return Math.max(1, hint);
  const lh = parseFloat(getComputedStyle(p).lineHeight) || 20;
  return Math.max(1, Math.round(p.getBoundingClientRect().height / lh)) + hint;
}
function stepLines() {
  const busy = !!status.wanted || queue.some((q) => q.kind === "say" || q.kind === "ask");
  let held = -1, answered = -1;
  lines.forEach((line2, i) => {
    if (line2.live) return;
    const r = line2.reply;
    if (r ? r.endedAt === void 0 : busy) held = i;
    else if (r && T >= r.endedAt + REPLIED_FADE) answered = i;
  });
  lines.forEach((line2, i) => {
    if (line2.fadeAt !== null || line2.live || i <= held) return;
    if (i <= answered || !line2.reply && T >= line2.settledAt + UNANSWERED_FADE) fadeLine(line2);
  });
  const up2 = lines.filter((l) => l.fadeAt === null);
  let rows = up2.reduce((n, l) => n + rowsOf(l), 0);
  while (up2.length > 1 && (up2.length > MAX_LINES || rows > MAX_ROWS)) {
    const line2 = up2.shift();
    rows -= rowsOf(line2);
    fadeLine(line2);
  }
  for (const line2 of [...lines]) if (line2.fadeAt !== null && T - line2.fadeAt >= LINE_FADE) dropLine(line2);
}
var status = { wanted: null, since: 0, shown: null, shownAt: 0, fadeAt: null };
function setStatus(next) {
  setBody({ thinking: next?.kind === "think", status: next?.kind ?? null });
  const prev = status.wanted;
  if (prev?.kind === next?.kind && prev?.text === next?.text && prev?.detail === next?.detail && prev?.count === next?.count) return;
  if (prev?.kind !== next?.kind) status.since = T;
  status.wanted = next;
}
function drawStatus(next, pop) {
  const icon2 = next.kind;
  if (!bubble.classList.contains("status") || bubble.dataset.icon !== icon2) {
    bubble.className = "bubble status";
    bubble.dataset.icon = icon2;
    bubble.innerHTML = `<span class="status-icon">${ICONS[`status_${icon2}`] || ICONS.status_work}</span><span class="status-text"></span>`;
  }
  bubble.dataset.kind = next.kind;
  const label = next.text + (next.detail ? ` \xB7 ${next.detail}` : "") + (next.count > 1 ? t("status.more", { others: next.count - 1 }) : "");
  bubble.querySelector(".status-text").textContent = label;
  bubble.setAttribute("aria-label", next.kind === "think" ? t("status.thinking") : label);
  bubble.classList.remove("fading");
  bubble.hidden = false;
  if (pop) {
    bubble.classList.remove("pop");
    void bubble.offsetWidth;
    bubble.classList.add("pop");
  }
}
function stepStatus() {
  if (!prefs.statusBubble || listen.phase || item || queue.length) {
    if (bubble.classList.contains("status")) bubble.hidden = true;
    status.shown = null;
    status.fadeAt = null;
    return;
  }
  if (status.fadeAt !== null && T - status.fadeAt >= 0.2) {
    bubble.hidden = true;
    status.shown = null;
    status.fadeAt = null;
  }
  const next = status.wanted, shown = status.shown;
  if (next?.kind === "think" && T - status.since < 0.6) return;
  if (shown && next && shown.kind === next.kind && shown.text === next.text) {
    if (shown !== next || status.fadeAt !== null) drawStatus(next, false);
    status.shown = next;
    status.fadeAt = null;
  } else if (!shown || T - status.shownAt >= 1.2) {
    if (next) {
      drawStatus(next, shown?.kind !== next.kind);
      status.shown = next;
      status.shownAt = T;
      status.fadeAt = null;
    } else if (shown && status.fadeAt === null) {
      status.fadeAt = T;
      bubble.classList.add("fading");
    }
  }
}
var mic = null;
async function startMic() {
  if (mic) return;
  const opening = mic = { starting: true };
  let stream = null, ctx = null;
  try {
    const audio = { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    if (prefs.micDevice) audio.deviceId = { exact: prefs.micDevice };
    stream = await navigator.mediaDevices.getUserMedia({ audio });
    ctx = new AudioContext({ sampleRate: 16e3 });
    await ctx.audioWorklet.addModule("/web/mic-worklet.js");
    const src = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, "pet-mic");
    node.port.onmessage = (e) => {
      if (ws && ws.readyState === 1) ws.send(e.data);
    };
    src.connect(node);
    if (!prefs.mic || mic !== opening) {
      stream.getTracks().forEach((t2) => t2.stop());
      ctx.close();
      if (mic === opening) mic = null;
      return;
    }
    mic = { stream, ctx, node };
    send({ t: "mic", state: "on", detail: stream.getAudioTracks()[0]?.label || null });
    void reportDevices();
  } catch (err) {
    if (stream) stream.getTracks().forEach((t2) => t2.stop());
    if (ctx) ctx.close();
    if (mic === opening) mic = null;
    send({ t: "mic", state: err && err.name === "NotAllowedError" ? "denied" : "error", detail: String(err && err.message || err) });
    if (err?.name !== "NotAllowedError") void reportDevices();
  }
}
async function reportDevices() {
  const all = await navigator.mediaDevices.enumerateDevices();
  send({ t: "devices", list: all.filter((d) => d.kind === "audioinput" && d.deviceId !== "default" && d.deviceId !== "communications").map((d) => ({ id: d.deviceId, label: d.label })) });
}
navigator.mediaDevices?.addEventListener("devicechange", () => {
  if (mic && !mic.starting) void reportDevices();
});
function stopMic() {
  const m = mic;
  mic = null;
  if (!m || m.starting) return;
  m.stream.getTracks().forEach((t2) => t2.stop());
  m.ctx.close();
  send({ t: "mic", state: "off" });
}
var ROAM_ORDER = ["off", "calm", "free"];
var roamName = (id) => ROAM_ORDER.includes(id) ? t(`roam.${id}`) : "";
var micBadge = () => prefs.voice.mode === "always" ? "auto" : prefs.voice.key || "key";
var MAX_HOVER = 6;
var ACTIONS = {
  chat: {
    icon: () => ICONS.chat,
    state: () => t(prefs.doubleClickChat ? "action.chatDoubleClick" : "action.chat"),
    run: () => openInput()
  },
  voice: {
    keep: true,
    icon: () => prefs.voice.enabled ? ICONS.mic : ICONS.micOff,
    badge: () => prefs.voice.enabled ? micBadge() : "",
    on: () => prefs.voice.enabled,
    state: () => !prefs.voice.enabled ? t("action.voiceOff") : !prefs.voice.ready ? t("action.voiceNotReady", { detail: prefs.voice.detail || t("action.voiceNoService") }) : t("action.voiceOn", { mode: t(prefs.voice.mode === "always" ? "action.voiceAlways" : "action.voiceKey"), hint: prefs.voice.hint || "" }),
    run: () => toggleVoice()
  },
  roam: {
    keep: true,
    hoverOnly: true,
    icon: () => ICONS[`roam_${prefs.roam}`] ?? ICONS.roam_calm,
    state: () => {
      const next = ROAM_ORDER[(ROAM_ORDER.indexOf(prefs.roam) + 1) % ROAM_ORDER.length];
      return t("action.roam", { name: roamName(prefs.roam), next: roamName(next) });
    },
    run: () => cycleRoam()
  },
  theme: {
    keep: true,
    icon: () => prefs.theme === "dark" ? ICONS.moon : ICONS.sun,
    on: () => prefs.theme === "dark",
    state: () => t(prefs.theme === "dark" ? "action.themeDark" : "action.themeLight"),
    run: () => toggleTheme()
  },
  sound: {
    keep: true,
    icon: () => prefs.sound ? ICONS.sound : ICONS.soundOff,
    on: () => prefs.sound,
    state: () => t(prefs.sound ? "action.soundOn" : "action.soundOff"),
    run: () => send({ t: "prefs", sound: !prefs.sound })
  },
  hide: {
    icon: () => ICONS.eyeOff,
    available: () => !!host?.hide,
    state: () => t("action.hide"),
    run: () => host.hide()
  },
  dress: {
    icon: () => ICONS.shirt,
    cls: "dress",
    state: () => t("action.dress"),
    // an embedding app that lends dressing shows its own dress page; otherwise the pet's dress window
    run: () => {
      if (prefs.bot?.buttons?.dress) send({ t: "control", action: "dress" });
      else if (host?.openDress) host.openDress();
      else window.open("/dress", "_blank");
    }
  }
};
var available = (id) => ACTIONS[id] && (ACTIONS[id].available?.() ?? true);
function drawAction(b, id) {
  const a = ACTIONS[id], on = a.on?.();
  const badge = a.badge?.() ?? "";
  b.querySelector(".ic").innerHTML = a.icon() + (badge ? `<b class="badge">${badge}</b>` : "");
  b.classList.toggle("on", on === true);
  b.classList.toggle("off", on === false);
  b.title = a.state();
  b.setAttribute("aria-label", b.title);
  if (on !== void 0) b.setAttribute("aria-pressed", String(on));
}
function cycleRoam() {
  const roam = ROAM_ORDER[(ROAM_ORDER.indexOf(prefs.roam) + 1) % ROAM_ORDER.length];
  applyPrefs({ roam });
  send({ t: "prefs", roam });
}
function toggleTheme() {
  const theme = prefs.theme === "dark" ? "light" : "dark";
  applyPrefs({ theme });
  send({ t: "prefs", theme });
}
function toggleVoice() {
  const on = !prefs.voice.enabled;
  prefs.voice = { ...prefs.voice, enabled: on };
  refreshButtons();
  send({ t: "prefs", mic: on });
}
function openMenu(x, y) {
  menu.innerHTML = "";
  menu.appendChild(Object.assign(document.createElement("div"), { className: "m-head" }));
  renderMenuHead();
  const grid = Object.assign(document.createElement("div"), { className: "m-grid" });
  for (const id of Object.keys(ACTIONS)) {
    const a = ACTIONS[id];
    if (!available(id) || a.hoverOnly) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "menuitem");
    b.className = `m-tile${a.cls ? " " + a.cls : ""}`;
    b.dataset.action = id;
    b.innerHTML = '<span class="ic"></span>';
    drawAction(b, id);
    b.addEventListener("click", () => {
      sfx.tick();
      if (!a.keep) closeMenu();
      a.run();
      if (a.keep) drawAction(b, id);
    });
    grid.appendChild(b);
  }
  menu.append(grid);
  menu.style.width = "";
  menu.hidden = false;
  host?.focus?.();
  menu.style.width = getComputedStyle(menu).width;
  const w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = f(clamp(x, 8, innerWidth - w - 8)) + "px";
  menu.style.top = f(clamp(y - h, 8, innerHeight - h - 8)) + "px";
}
function renderMenuHead(confirmQuit = false) {
  const head = menu.querySelector(".m-head"), bot = prefs.bot || {};
  if (!head) return;
  head.classList.toggle("confirm", confirmQuit);
  head.innerHTML = '<span class="m-avatar"></span><span class="m-name"></span><span class="m-acts"></span>';
  head.querySelector(".m-avatar").innerHTML = bot.avatar ? `<img alt="" src="/api/avatar?v=${encodeURIComponent(bot.avatar)}">` : `<svg viewBox="18 18 220 220" aria-hidden="true">${mini("neutral", skin)}</svg>`;
  const name = head.querySelector(".m-name");
  name.textContent = name.title = confirmQuit ? bot.quitPrompt : bot.name || "Coo";
  const acts2 = head.querySelector(".m-acts");
  const act = (iconHtml, label, fn, cls = "m-act") => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.title = label;
    b.setAttribute("aria-label", label);
    b.innerHTML = iconHtml;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      sfx.tick();
      fn();
    });
    acts2.appendChild(b);
  };
  if (!bot.controls) return;
  if (confirmQuit) {
    act(ICONS.power, bot.quitLabel, () => {
      closeMenu();
      send({ t: "control", action: "quit" });
    }, "m-act danger");
    act(`<span>${esc(t("menu.cancel"))}</span>`, t("menu.cancel"), () => renderMenuHead(), "m-act text");
    return;
  }
  const has = bot.buttons ?? { pause: true, settings: true, quit: true };
  if (has.pause) act(bot.paused ? ICONS.play : ICONS.pause, t(bot.paused ? "menu.resume" : "menu.pause"), () => send({ t: "control", action: bot.paused ? "resume" : "pause" }), `m-act run${bot.paused ? " paused" : ""}`);
  if (has.settings) act(ICONS.settings, t("menu.settings"), () => {
    closeMenu();
    send({ t: "control", action: "settings" });
  });
  if (has.quit) act(ICONS.power, bot.quitLabel, () => renderMenuHead(true), "m-act power");
}
function closeMenu() {
  menu.hidden = true;
}
function refreshButtons() {
  for (const b of menu.querySelectorAll(".m-tile")) drawAction(b, b.dataset.action);
  renderTools();
}
var TOOLS_LINGER = 0.8;
var HOLD_TO_SEND = 500;
var toolsUntil = 0;
var toolIds = "";
function renderTools() {
  const ids = prefs.hoverButtons.filter(available).slice(0, MAX_HOVER);
  if (ids.join(",") !== toolIds) {
    toolIds = ids.join(",");
    endHold();
    tools.innerHTML = "";
    tools.style.gridTemplateRows = `repeat(${Math.min(3, Math.max(1, ids.length))}, auto)`;
    for (const id of ids) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tool";
      b.dataset.action = id;
      b.innerHTML = '<span class="ic"></span>';
      if (id === "voice") wireVoiceTool(b);
      else b.addEventListener("click", () => {
        sfx.tick();
        if (!ACTIONS[id].keep) toolsUntil = 0;
        ACTIONS[id].run();
        refreshButtons();
      });
      tools.appendChild(b);
    }
  }
  for (const b of tools.children) drawAction(b, b.dataset.action);
  const mic2 = tools.querySelector('[data-action="voice"]');
  if (mic2) mic2.classList.toggle("waiting", prefs.voice.enabled && !prefs.voice.ready);
}
var hold = { timer: 0, sent: false, el: null };
function endHold() {
  clearTimeout(hold.timer);
  hold.timer = 0;
  hold.el?.classList.remove("holding");
}
function wireVoiceTool(b) {
  b.style.setProperty("--hold", HOLD_TO_SEND + "ms");
  b.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    hold.sent = false;
    hold.el = b;
    if (!prefs.voice.enabled || !prefs.voice.ready) return;
    b.classList.add("holding");
    hold.timer = setTimeout(() => {
      endHold();
      hold.sent = true;
      send({ t: "commit" });
      sfx.select();
      b.classList.remove("sent");
      void b.offsetWidth;
      b.classList.add("sent");
    }, HOLD_TO_SEND);
  });
  b.addEventListener("pointerup", (e) => {
    if (e.button !== 0) return;
    const sent = hold.sent;
    endHold();
    hold.sent = false;
    if (!sent) {
      toggleVoice();
      sfx.tick();
    }
  });
  b.addEventListener("pointerleave", () => {
    endHold();
    hold.sent = true;
  });
  b.addEventListener("pointercancel", () => {
    endHold();
    hold.sent = true;
  });
  b.addEventListener("click", (e) => {
    if (e.detail === 0) {
      toggleVoice();
      sfx.tick();
    }
  });
}
var cursor = { at: null };
function overTools(p) {
  if (tools.hidden) return false;
  const r = tools.getBoundingClientRect();
  return p.x >= r.left - 6 && p.x <= r.right + 6 && p.y >= r.top - 6 && p.y <= r.bottom + 6;
}
function stepTools() {
  const p = cursor.at;
  const l = at();
  if (p && (body?.hit(p) || overTools(p))) toolsUntil = T + TOOLS_LINGER;
  tools.hidden = !(T < toolsUntil && l && !l.pressing && !l.busy && menu.hidden && toolIds !== "");
  if (tools.hidden) endHold();
  tools.querySelector('[data-action="voice"]')?.classList.toggle("live", listen.phase === "hearing");
}
var pointerSeen = false;
var lastPointer = { x: 0, y: 0 };
var FRAME_STALL_MS = 1e3;
var lastFrameAt = performance.now();
var rendering = () => document.visibilityState === "visible" && performance.now() - lastFrameAt < FRAME_STALL_MS;
var MOUSE_RENEW_MS = 500;
var interactive = null;
var renewedAt = -Infinity;
function setInteractive(on, by) {
  if (!host) return;
  const now = performance.now();
  const changed = interactive !== on;
  if (!changed && !(on && now - renewedAt >= MOUSE_RENEW_MS)) return;
  interactive = on;
  renewedAt = now;
  host.setInteractive(on);
  if (changed) logPointer("flip", by);
}
var diag = { move: null, poll: null, type: "", types: /* @__PURE__ */ new Set(), skipped: 0, lastAt: -Infinity, timer: 0, held: null };
var POINTER_LOG_EVERY_MS = 1e3;
function logPointer(event, by) {
  const now = performance.now(), wait = POINTER_LOG_EVERY_MS - (now - diag.lastAt);
  diag.held = { event, by };
  if (wait <= 0) {
    writePointer(now);
    return;
  }
  diag.skipped++;
  diag.timer ||= setTimeout(() => {
    diag.skipped--;
    writePointer(performance.now());
  }, wait);
}
function seen(s, now) {
  if (!s) return null;
  const { at: at2, ...rest } = s;
  return { ...rest, ageMs: Math.round(now - at2) };
}
function writePointer(now) {
  clearTimeout(diag.timer);
  diag.timer = 0;
  const c = at()?.side ?? { x: 0, y: 0 };
  console.log("[pointer] " + JSON.stringify({
    ...diag.held,
    interactive,
    pressing: !!at()?.pressing,
    move: seen(diag.move, now),
    poll: seen(diag.poll, now),
    pet: { x: Math.round(c.x), y: Math.round(c.y) },
    types: [...diag.types],
    skipped: diag.skipped
  }));
  diag.lastAt = now;
  diag.skipped = 0;
  diag.types.clear();
}
var UI_SELECTOR = ".bubble:not(.status):not(.fading):not([hidden]), .menu:not([hidden]), .tools:not([hidden])";
var overUi = (e) => e.target.closest && e.target.closest(UI_SELECTOR);
document.addEventListener("pointermove", (e) => {
  pointerSeen = true;
  lastPointer.x = e.clientX;
  lastPointer.y = e.clientY;
  const p = { x: e.clientX, y: e.clientY };
  cursor.at = p;
  if (pressing && e.buttons === 0) pressing = false;
  if (!shifting) body?.pointer("move", { ...p, t: e.timeStamp });
  const hit = !!body?.hit(p), ui = !!overUi(e);
  diag.move = { at: performance.now(), type: e.pointerType, x: Math.round(p.x), y: Math.round(p.y), hit, ui };
  diag.types.add(e.pointerType);
  if (e.pointerType !== diag.type) {
    const first = !diag.type;
    diag.type = e.pointerType;
    if (!first) logPointer("type", "move");
  }
  setInteractive(rendering() && (pressing || hit || ui), "move");
  followDrag(p);
});
host?.onCursor?.((p) => {
  cursor.at = p;
  if (!p) {
    diag.poll = { at: performance.now(), off: true };
    if (!pressing) setInteractive(false, "poll");
    return;
  }
  const el = document.elementFromPoint(p.x, p.y);
  const hit = !!body?.hit(p), ui = !!el?.closest?.(UI_SELECTOR);
  diag.poll = { at: performance.now(), x: p.x, y: p.y, hit, ui };
  setInteractive(rendering() && (pressing || hit || ui), "poll");
});
var pressing = false;
stage.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  closeMenu();
  const p = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  body?.pointer("down", p);
  if (body?.hit(p)) {
    pressing = true;
    stage.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
});
var up = (e) => {
  pressing = false;
  body?.pointer("up", { x: e?.clientX ?? lastPointer.x, y: e?.clientY ?? lastPointer.y, t: e?.timeStamp ?? performance.now() });
  stage.style.cursor = "";
};
var RESIZE_WAIT_MS = 1e3;
async function settleSize(to) {
  const t0 = performance.now();
  while ((Math.abs(innerWidth - to.w) > 1 || Math.abs(innerHeight - to.h) > 1) && performance.now() - t0 < RESIZE_WAIT_MS) {
    await new Promise((r) => requestAnimationFrame(r));
  }
  body?.set({ bounds: bounds() });
}
var outside = (p) => p.x < 0 || p.y < 0 || p.x >= innerWidth || p.y >= innerHeight;
var following = null;
var shifting = false;
function followDrag(p) {
  if (following || at()?.mode !== "drag" || !host?.followCursor || !outside(p)) return;
  shifting = true;
  following = (async () => {
    const to = await host.followCursor().catch(() => null);
    shifting = false;
    if (!to) return;
    body?.shift(to.dx, to.dy);
    await settleSize(to);
  })().finally(() => {
    following = null;
    shifting = false;
  });
}
stage.addEventListener("pointerup", async (e) => {
  if (following) {
    await following;
    up();
    return;
  }
  if (!outside({ x: e.clientX, y: e.clientY }) || at()?.mode !== "drag" || !host?.followCursor) {
    up(e);
    return;
  }
  const to = await host.followCursor().catch(() => null);
  if (!to) {
    up(e);
    return;
  }
  pressing = false;
  stage.style.cursor = "";
  document.body.style.visibility = "hidden";
  try {
    await settleSize(to);
    body?.drop({ x: to.x, y: to.y });
  } finally {
    document.body.style.visibility = "";
  }
});
stage.addEventListener("pointercancel", up);
document.addEventListener("pointerleave", () => {
  cursor.at = null;
  body?.pointer("leave", {});
});
stage.addEventListener("dblclick", (e) => {
  if (prefs.doubleClickChat && body?.hit({ x: e.clientX, y: e.clientY })) openInput();
});
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (body?.hit({ x: e.clientX, y: e.clientY })) openMenu(e.clientX, e.clientY);
});
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest(".menu")) closeMenu();
}, { capture: true });
window.addEventListener("blur", closeMenu);
document.addEventListener("focusin", (e) => {
  if (e.target.matches?.("input, textarea")) host?.focus?.();
});
document.addEventListener("keydown", (e) => {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === "Escape") {
    closeMenu();
    if (item && item.kind === "ask") dismissAsk();
    else if (item && item.kind === "input") closeBubble();
    return;
  }
  const typing = e.target.closest && e.target.closest("input, textarea");
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code) || /^([1-9])$/.exec(e.key);
  if (item && item.kind === "ask" && item.optsShown && !item.answered && !typing && digit && !e.ctrlKey && !e.altKey && !e.metaKey) {
    e.preventDefault();
    const b = bubble.querySelectorAll(".b-opt")[+digit[1] - 1];
    if (b) b.click();
  }
});
var TAIL_CENTER = 70;
var TAIL_FOLLOW = 130;
function tailAt(bw, x) {
  const k = clamp((bw - TAIL_CENTER) / (TAIL_FOLLOW - TAIL_CENTER), 0, 1);
  return bw / 2 + (clamp(x, 22, bw - 22) - bw / 2) * k;
}
function place(el, a, extraUp) {
  const bw = el.offsetWidth, bh = el.offsetHeight;
  const left = clamp(a.x - bw / 2 + (at()?.facing ?? 1) * 26, 10, Math.max(10, innerWidth - bw - 10));
  const top = Math.max(8, a.y - bh - extraUp);
  el.style.left = f(left) + "px";
  el.style.top = f(top) + "px";
  el.style.setProperty("--tail", f(tailAt(bw, a.x - left)) + "px");
  return { left, top, bw, bh };
}
function placeTalk(it, a) {
  const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  const mode = at()?.mode;
  if (mode === "drag" || FLYING.has(mode) && !talk.motion) it.carried = true;
  if (it.carried) {
    it.pinX = a.x;
    it.pinY = a.y;
    if (!FLYING.has(mode)) it.carried = false;
  }
  const left = clamp(it.pinX - bw / 2, 10, Math.max(10, innerWidth - bw - 10));
  const top = Math.max(8, it.pinY - bh - 18 * prefs.bubbleSize);
  bubble.style.left = f(left) + "px";
  bubble.style.top = f(top) + "px";
  bubble.style.setProperty("--tail", f(tailAt(bw, a.x - left)) + "px");
  return { left, top, bw, bh };
}
function placeTools(l) {
  const c = l.side, reach = l.side.reach + 10;
  const w = tools.offsetWidth, h = tools.offsetHeight;
  const left = c.x + reach + w <= innerWidth - 8 ? c.x + reach : c.x - reach - w;
  tools.style.left = f(clamp(left, 8, innerWidth - w - 8)) + "px";
  tools.style.top = f(clamp(c.y - h / 2, 8, innerHeight - h - 8)) + "px";
}
function layout(dt = 0) {
  const l = at();
  if (!l) return;
  stage.style.cursor = l.cursor;
  sfx.setPan((screenX - screen.availLeft + l.x) / (screen.availWidth || innerWidth) * 2 - 1);
  if (!tools.hidden) placeTools(l);
  const a = l.bubble;
  let sayBox = null;
  if (!bubble.hidden && item?.kind === "dialog" && item.pinX !== void 0) sayBox = placeTalk(item, a);
  else if (!bubble.hidden) sayBox = place(bubble, a, 18 * prefs.bubbleSize);
  placeLines(a, sayBox, dt);
}
var LINES_UP = 46;
var LINES_GAP = 8;
function placeLines(a, box, dt) {
  if (!lines.length) return;
  const W = innerWidth, size = prefs.bubbleSize, gap2 = LINES_GAP * size;
  const cx = box ? box.left + box.bw / 2 : a.x;
  let bottom = box ? box.top - gap2 : a.y - LINES_UP * size;
  const k = dt > 0 ? Math.min(1, dt * 12) : 1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line2 = lines[i], el = line2.el;
    el.classList.toggle("older", i !== lines.length - 1);
    if (line2.fadeAt === null || line2.ox === null) {
      const bw = el.offsetWidth, bh = el.offsetHeight;
      const left = clamp(cx - bw / 2, 10, Math.max(10, W - bw - 10));
      const top = Math.max(8, bottom - bh);
      if (line2.ox === null) {
        line2.ox = left - a.x;
        line2.oy = top - a.y;
      } else {
        line2.ox += (left - a.x - line2.ox) * k;
        line2.oy += (top - a.y - line2.oy) * k;
      }
      bottom = top - gap2;
    }
    el.style.left = f(a.x + line2.ox) + "px";
    el.style.top = f(a.y + line2.oy) + "px";
  }
}
var BACKDROP_EVERY = 0.8;
var SAME_COLOR = 0.15;
var HALO_ON = 0.6;
var HALO_OFF = 0.45;
var HALO_STRENGTH = 0.5;
var backdrop = { on: !!host && !host.sampleBackdrop, fixed: !!host && !host.sampleBackdrop, k: 0, busy: false, next: 0 };
var lin = (c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
function oklab(r, g, b) {
  r = lin(r / 255);
  g = lin(g / 255);
  b = lin(b / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function inkRgb() {
  let h = getComputedStyle(document.documentElement).getPropertyValue("--skin-ink").trim().replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return /^[0-9a-f]{6}$/i.test(h) ? [n >> 16, n >> 8 & 255, n & 255] : null;
}
var inflate = (r, d) => ({ x: r.x - d, y: r.y - d, width: r.width + 2 * d, height: r.height + 2 * d });
var rectOf = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
};
var shadowed = (r) => ({ x: r.x - 14, y: r.y - 14, width: r.width + 28, height: r.height + 14 + 36 });
var FLYING = /* @__PURE__ */ new Set(["air", "drag", "land"]);
async function probeBackdrop() {
  const l = at(), ink = inkRgb(), b = l?.box;
  if (!ink || !b || FLYING.has(l.mode)) return;
  const S = bounds().S;
  const near = inflate({ x: b.x, y: b.y, width: b.w, height: b.h }, Math.max(4 + 34 * S, 4 + 2 * prefs.glow)), far = inflate(near, 8 + 40 * S);
  const x = Math.max(0, far.x), y = Math.max(0, far.y);
  const rect = { x, y, width: Math.min(innerWidth, far.x + far.width) - x, height: Math.min(innerHeight, far.y + far.height) - y };
  const covers = [bubble, menu, tools, ...lines.map((l2) => l2.el)].filter((el) => !el.hidden).map((el) => shadowed(rectOf(el)));
  const px = await host.sampleBackdrop(rect, [near, ...covers]);
  if (px === null) {
    backdrop.on = true;
    backdrop.fixed = true;
    return;
  }
  const n = px.length / 3;
  if (n < 24) return;
  const [L, A, B] = oklab(...ink);
  let same = 0;
  for (let i = 0; i < px.length; i += 3) {
    const [l2, a, b2] = oklab(px[i], px[i + 1], px[i + 2]);
    if (Math.hypot(l2 - L, a - A, b2 - B) < SAME_COLOR) same++;
  }
  const share = same / n;
  if (backdrop.on && covers.length) return;
  backdrop.on = backdrop.on ? share >= HALO_OFF : share > HALO_ON;
}
function stepBackdrop(dt) {
  const now = performance.now() / 1e3;
  if (host?.sampleBackdrop && prefs.glow > 0 && !backdrop.fixed && !backdrop.busy && now >= backdrop.next && document.visibilityState === "visible") {
    backdrop.busy = true;
    probeBackdrop().catch(() => {
    }).finally(() => {
      backdrop.busy = false;
      backdrop.next = performance.now() / 1e3 + BACKDROP_EVERY;
    });
  }
  const k = backdrop.k + ((backdrop.on ? 1 : 0) - backdrop.k) * Math.min(1, dt * 6);
  backdrop.k = k < 5e-3 ? 0 : k;
  body?.setHalo(backdrop.k * HALO_STRENGTH, prefs.glow);
}
var RESTING_FPS = 30;
var last = performance.now();
var dueAt = 0;
var gap = 0;
var frameErr = null;
var stalls = 0;
var stallLoggedAt = -Infinity;
var framed = false;
function frame(now) {
  lastFrameAt = performance.now();
  if (now < dueAt - gap / 4) {
    requestAnimationFrame(frame);
    return;
  }
  if (framed && now <= last) {
    stalls++;
    if (performance.now() - stallLoggedAt > 6e4) {
      stallLoggedAt = performance.now();
      console.warn(`[pet] \u5E27\u65F6\u95F4\u6233\u6CA1\u6709\u524D\u8FDB(\u7D2F\u8BA1 ${stalls} \u6B21):now=${now} \u4E0A\u4E00\u5E27=${last} \u9875\u9762=${document.visibilityState} \u7126\u70B9=${document.hasFocus()} \u6A21\u5F0F=${at()?.mode ?? "-"}`);
    }
  }
  framed = true;
  const dt = Math.min(0.05, (now - last) / 1e3);
  last = now;
  try {
    T += dt;
    stepActs();
    stepDialog(dt);
    stepTalkRead(dt);
    stepTalkMotion();
    stepLines();
    stepStatus();
    setBody({ dialogOpen: !!item || !!listen.phase });
    body?.tick(dt);
    stepBackdrop(dt);
    stepTools();
    layout(dt);
    if (overlayOn) host.overlayFrame(overlayRect(), performance.timeOrigin + now);
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (msg !== frameErr) {
      frameErr = msg;
      console.error(err);
    }
  }
  const full = prefs.lockFrameRate || !!at()?.moving;
  gap = full ? prefs.frameRate > 0 ? 1e3 / prefs.frameRate : 0 : 1e3 / RESTING_FPS;
  dueAt = now - dueAt > gap ? now + gap : dueAt + gap;
  if (full) requestAnimationFrame(frame);
  else setTimeout(() => requestAnimationFrame(frame), Math.max(0, dueAt - gap / 4 - performance.now()));
}
addEventListener("pagehide", reportPosition);
requestAnimationFrame(frame);
