# opencode-session-tree 项目记忆

OpenCode TUI 插件：快捷键树状展示所有有对话的目录并跳转。

## 结构

- `src/tui.ts` — TUI 入口：`Plugin.define({id, setup})`，注册快捷键 `ctrl+alt+t`（命令 ID `session-tree.open`）、斜杠 `/tree`、命令面板入口；调 `dialog.select` 展示树，选中后 `ui.router.navigate({type:"session", sessionID})` 跳转
- `src/db.ts` — 直读 `~/.local/share/opencode/opencode.db`（只读），优先 `bun:sqlite` 兜底 `node:sqlite`；SQL UNION `session`+`session_v2` 两表（V1/V2 schema 并存），每目录取最新未归档会话 ID 作跳转目标
- `src/tree.ts` — 建树 + 单链折叠（`ownSessions===0` 且有独子才折叠）+ 按 lastActive 排序
- `src/index.ts` — server 端空实现（插件包必须有 `.` 导出）

## 关键机制（勿踩坑，v2.0.19 实测）

- **加载路径**：插件包放 `~/.config/opencode/plugins/<包名>/`，server 的 inotify watcher 热加载，不用重启 service；TUI 每次启动从 server 的 `/api/plugin` 拉取（features 含 tui 才加载）
- **包结构**：server discover 按**包根目录**固定找 `index.ts`（server 入口）和 `tui.ts`（探测 TUI 特性），所以根目录必须有这两个桩文件 re-export src/ 里的真身；package.json 建议同时有 `main` 和 `exports`（`.`/`./server`/`./tui`）
- **server 端零依赖**：`src/index.ts` 不能 import `@opencode/plugin`（server 进程没有运行时映射，解析失败整个包被跳过），直接 `export default { id, setup }`
- **TUI 端**：`src/tui.ts` 可用 `Plugin.define({id, setup})`（`@opencode/plugin/tui` 由 TUI 进程运行时映射解析）
- **`Keymap.Provider is missing` 大坑**：插件 setup **不在 Solid 组件树内**，直接调 `context.keymap.layer()` 必抛此错。必须把 layer 注册放进 `context.ui.slot({append:"app", render(){...}})` 的 render 组件里（mount 在宿主树内，context 完整），用标志位防重复注册；layer 随组件卸载自动 dispose
- **`dialog.select`** 返回选中 option 的 `value`（取消返回 undefined），`onSelect` 回调拿到的是整个 option 对象
- 配置键名：`opencode.jsonc` 的 `plugins` 数组 / cli.json 的 `plugin` 键 / tui.json 实测 **v2.0.19 都不认**（文档超前），唯一实测有效的就 plugins/ 目录发现机制
- 内部表结构依赖：OpenCode 大版本升级需检查 `session/session_v2` 是否还在
- 跨目录跳转走「跳到该目录最近会话」路线（TUI 原生支持跨 location 打开 session），不要试图去改 TUI 的 cwd

## 调试技巧

- 查加载状态：`opencode api get /api/plugin` 看 features（server/tui）和 state（active/failed）
- 查错误：`grep "role=server" ~/.local/share/opencode/log/opencode.log`（server 端加载）+ `grep "role=cli"`（TUI 端 setup）
- TUI 插件数：日志里 `plugin reconciliation completed plugins=N`（内置 12 个，+1 即自定义插件载入）
- 插件 setup 成功只打 DEBUG 日志，**没新 WARN 就是成功**

## 测试

便携 bun 在 `/tmp/opencode/bun-linux-x64/bun`（/tmp 重启即失）：`bun build src/tui.ts --external @opencode/plugin/tui --outfile /dev/null` 查语法；数据层测试脚本参考 git 首个提交里的 test-db.ts。

GitHub: https://github.com/zhangqxgz/opencode-session-tree（已推送 v0.1.0 + Release）
