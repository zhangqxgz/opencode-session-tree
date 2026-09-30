# opencode-session-tree 项目记忆

OpenCode TUI 插件：快捷键树状展示所有有对话的目录并跳转。

## 结构

- `src/tui.ts` — TUI 入口：`Plugin.define({id, setup})`，注册快捷键 `ctrl+alt+t`（命令 ID `session-tree.open`）、斜杠 `/tree`、命令面板入口；调 `dialog.select` 展示树，选中后 `ui.router.navigate({type:"session", sessionID})` 跳转
- `src/db.ts` — 直读 `~/.local/share/opencode/opencode.db`（只读），优先 `bun:sqlite` 兜底 `node:sqlite`；SQL UNION `session`+`session_v2` 两表（V1/V2 schema 并存），每目录取最新未归档会话 ID 作跳转目标
- `src/tree.ts` — 建树 + 单链折叠（`ownSessions===0` 且有独子才折叠）+ 按 lastActive 排序
- `src/index.ts` — server 端空实现（插件包必须有 `.` 导出）

## 关键机制（勿踩坑）

- 插件通过 `~/.config/opencode/cli.json` 的 `plugins` 数组加载（TUI 插件走 cli.json，不是 opencode.jsonc）；改完代码**退出 TUI 重进**即生效，不用重启 service
- 包必须有 `package.json` 且 `exports` 含 `"./tui"` 键，否则解析不到入口
- 代码是裸 TS，opencode(Bun) 运行时直接转译加载，**不需要构建、不需要 node_modules**；`@opencode/plugin/tui` 由 opencode 运行时解析
- 内部表结构依赖：OpenCode 大版本升级需检查 `session/session_v2` 是否还在
- 跨目录跳转走「跳到该目录最近会话」路线（TUI 原生支持跨 location 打开 session），不要试图去改 TUI 的 cwd

## 测试

便携 bun 在 `/tmp/opencode/bun-linux-x64/bun`（/tmp 重启即失）：`bun build src/tui.ts --external @opencode/plugin/tui --outfile /dev/null` 查语法；数据层测试脚本参考 git 首个提交里的 test-db.ts。

GitHub: https://github.com/zhangqxgz/opencode-session-tree
