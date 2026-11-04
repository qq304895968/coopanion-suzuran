# cortico-world-coo-diary

Owner: `src/definition.ts`

给 Coopanion(Cortico)写的 World 扩展:把一个你指定的目录变成 Coo 的日记本。每天一个 Markdown 文件,
只追加、不覆盖,可以读回最近几天,也可以按日期列出来。可选每天到点提醒一次。
还能和画画、看一眼插件联动:写日记时回想当天画过的画和「看一眼」留下的深刻瞬间并引用,
也可以照着那张原图画一张新的再写进去。

- **日记目录面板**:日记页可直接打开当前目录、复制路径、刷新状态;目录不存在时打开会自动创建。
- **类别**:World,`id: 'diary'`,契约 `cortico.api = 6`
- **网络**:不联网。不发任何 HTTP 请求。
- **碰的文件**:写 `<日记目录>/YYYY-MM-DD.md` 和 `<日记目录>/images/<日期>/`(引用画/截图时复制进去);
  只读画画插件的 `index.json`、看一眼的 `moments.json` 与包内只读的 `src/ENV_PROMPT.md`。

## 配置

走部署的 `config.json` 的 `worlds.diary` 段,也能在 WebUI 的「日记」页面改。三项都立即生效。
引用画时会自动读 `worlds.draw.saveDir`(留空时是 `<dataDir>/pet-draw`),不需要在日记这边再配一次。

| 键 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `false` | World 开关;在「World 总览」里启停 |
| `dir` | string | `""` | 日记目录的绝对路径;留空时工具会提示去填 |
| `reminderEnabled` | boolean | `false` | 每天到点提醒一次 |
| `reminderTime` | string | `"22:00"` | 提醒时刻 `HH:mm`,按部署时区;当天已有日记时不提醒 |

```jsonc
"worlds": {
  "diary": {
    "enabled": true,
    "dir": "D:\\我的日记",
    "reminderEnabled": true,
    "reminderTime": "22:30"
  }
}
```

## 工具

| 工具 | 作用 |
|---|---|
| `diary_write` | 把一篇日记追加到当天文件末尾。`date` / `time` / `mood` 可选;补写往日不给 `time` 时,标题写「补记」。`arts` 填画 id 可引用画;`moments` 填深刻瞬间 id;`includeDayArt` / `includeMemorable` 收进那一天全部画 / 瞬间 |
| `diary_read` | 给 `date` 读那天,给 `days` 读最近几篇;`maxChars` 控制回执长度 |
| `diary_list` | 列出哪些天有日记、各有多少篇与字数;支持 `from` / `to` / `limit` |
| `diary_art` | 回想某一天画过的画:列 id、时刻、评价、主题;图可作为附件交回来。支持 `date` / `rating` / `limit` / `attach` |
| `diary_moment` | 回想某一天「看一眼」留下的深刻瞬间:列 id、时刻、分数、摘要、原图路径;原图可作为附件交回来 |

事件:`diary.started`(挂载)、`diary.reminder`(到点且当天没写)。两条都是 `origin: internal`。

## 和画画插件联动

画画插件(`cortico-world-coo-draw`)把图存进画夹并写一份 `index.json`;日记只读这份索引,不调用对方的工具。

1. **回想**:`diary_art` 默认看今天,列出画过的画;`attach` 默认 true,最多 4 张图作为附件给模型看。
2. **引用**:把 `diary_art` 或 `pet_draw` 回执里的 id 填进 `diary_write.arts`。图会复制到
   `<日记目录>/images/<日期>/`,正文末尾写 `![主题](images/<日期>/<id>.png)`;之后画夹里重命名或换评价也不影响日记。
3. **画新的**:画室 World 开着时,先调用 `pet_draw`,再用它回执里的 id 写日记。日记的提示词会把这条流程教给桌宠;
   画室 World 没开时只写文字。

```markdown
# 2026-10-28 星期三

## 21:30 · 开心

今天画了一只坐在草地上的小狐狸。

![一只看星星的小狐狸](images/2026-10-28/d-20261028T092714-7d2559.png)
```

## 和「看一眼」联动

「看一眼」(`cortico-world-coo-screen`)会给每一帧打 1–10 分;达到阈值(默认 8)的截图会留在
`<dataDir>/coo-screen/moments.json` 与 `moments/` 里。日记只读这份索引。

1. **回想**:`diary_moment` 默认看今天,列出深刻瞬间的 id、分数、摘要和原图绝对路径;
   `attach` 默认 true,最多 4 张原图作为附件给模型看。
2. **引用**:把 id 填进 `diary_write.moments`。截图会复制到 `<日记目录>/images/<日期>/moment-*.png`,
   正文里写成一段 `> 深刻瞬间 9/10:……` 加图片;`includeMemorable: true` 收录那一天全部瞬间。
3. **照着画**:把 `diary_moment` 回执里的原图路径填进 `pet_draw` 的 `referencePath`,让画室
   用这张图当图生图参考;不要再用 `referenceName` / `referenceQuery` 搜关键词。画好后把新画 id
   填进 `diary_write.arts`,这一刻的屏幕和画就都在日记里了。画室 World 开着时,日记提示词默认
   会先照着这一刻画一张(一个瞬间最多一张);用户明确说不要画时除外。

## 日记目录面板

「日记」页有一张「日记目录」卡片:

- **打开当前文件夹**:Windows 用资源管理器,macOS 用 `open`,Linux 用 `xdg-open`;目录不存在时先创建再打开。
- **复制路径**:打不开文件管理器时,把路径复制到资源管理器/终端。
- **刷新**:重新读当前目录和今天的文件状态。
- 面板走 `world:diary` 的 `folder` panel;`info` 是普通 POST,`open` 在服务端声明为 GET,由隐藏 iframe 导航触发。
- 浏览器端 bundle 是 `dist/webui.js`,改了 `src/webui/` 后必须重新 `pnpm build`,再重启 Coopanion。
- 官方 Coopanion 0.2.17 不处理 `companion:open-folder`；旧文档中的处理器属于作者本机 0.2.13 的私有补丁，不是官方接口。`process.send()` 返回 `true` 也不代表宿主执行成功。
- 当前扩展直接请求系统文件管理器：Windows 使用 PowerShell `Shell.Application`，macOS 使用 `open`，Linux 使用 `xdg-open`，不再被未处理的 IPC 消息阻断。实际窗口是否显示仍需交互桌面验收，打不开时请复制路径；依赖旧私有宿主 `shell.openPath` 行为的部署也需重新验收。

## 文件长什么样

一天一个文件,文件名就是日期:

```text
2026-10-27.md
```

```markdown
# 2026-10-27 星期二

## 21:30 · 平静

今天去看了海。风很大,但站在堤上很安静。

## 23:10

睡前补一句:明天记得把车钥匙还给阿岚。
```

- 第一篇新建文件时写 `# 日期 星期` 标题,之后只追加 `## HH:mm` 小节。
- 正文用 `appendFile`,已有内容一个字节都不改;不重命名、不删除。
- 目录里不是 `YYYY-MM-DD.md` 的文件一律不读。

## 边界

- `date` 只接受真实存在的 `YYYY-MM-DD`;拼出的路径必须仍在配置的目录下,`../` 之类直接拒绝。
- 单篇正文上限 20000 字,心情上限 40 字,单个文件读取上限 4 MB。
- 引用画时一次最多 20 张,单张上限 25 MB;只复制进日记目录,不改画夹。
- 深刻瞬间一篇最多 10 个,截图同样复制进日记目录;之后清空「看一眼」的存储不影响日记。
- 日记正文会随工具回执进入对话,也就是会到你配置的模型端点。写什么、写多细,由你和 Coo 决定。

## 开发

```bash
corepack pnpm install
pnpm test          # 56 个测试:干装载、五个工具、画夹/深刻瞬间联动、目录面板、提醒、路径校验、describe.json 一致性
pnpm typecheck     # Node 侧 + src/webui 浏览器侧
pnpm build         # 生成 dist/webui.js;改了 src/webui 后必跑
pnpm describe      # 改了工具、事件或 ENV_PROMPT.md 之后重新生成 describe.json
pnpm check:manifest # 用框架自己的 manifest 解析器核对 package.json 与默认导出
```

安装试用见下一节;`pnpm check:extension` 要在 Cortico 源码仓库根下跑,本包自带的前两个脚本覆盖了它
在本机的可核对部分。

## 装进 Coopanion 试用

1. 打开 Coopanion 的「扩展」页。
2. 选「手动安装」→「本机目录」,填这个包的绝对路径(本机是
   `F:\study\coopanion\coo-diary`)。它以 link 方式装入,装之前会先只读 `package.json` 做一次检查。
3. 先 `pnpm build` 生成 `dist/webui.js`,再重启 Coopanion 进程。
4. 「World 总览」里启用「日记」。
5. 设置里把「日记目录」填成一个绝对路径。
6. 让 Coo 写一篇,`diary_list` 看看有没有。

改 Node 侧代码后重启进程即可,不用重装;改了 `src/webui/` 要先 `pnpm build` 再重启。

## 来源与许可

MIT,见 [LICENSE](LICENSE)。包的骨架、`tests/helpers/fake-host.ts`、`tsconfig.json`、`vitest.config.ts`
来自 Cortico 的 [`templates/extension/world`](https://github.com/Pal-AI-Lab/Cortico/tree/main/templates/extension/world)
(MIT,Copyright (c) 2026 Phantivia)。没有引入其他第三方代码或素材。
