# opencode-session-tree · OpenCode 会话目录树插件

[English](#english) | 中文

按一个快捷键，树状展示**所有**有对话记录的目录，回车直接跳转到选中目录的最近会话。
彻底解决「哪个目录开过 opencode、哪个没有」的全盘掌握问题。

```
会话目录树（12 个目录 / 72 个会话）
│
mnt/c  [72 会话]
├── dev  [68 会话]
│   ├── code  [32 会话]
│   │   ├── synology  [23 会话 · 09-30 10:45]  ●
│   │   ├── fakeName  [2 会话 · 09-26 20:38]
│   │   └── ...
│   ├── scripts  [8 会话]
│   └── doc  [28 会话]
└── Users/qxzha  [4 会话]
```

- 单链目录自动折叠：`ndd_plugins/desensitive_processor` 只占一行，不炸宽度
- 每个节点显示累计会话数 + 最后活跃时间，按最后活跃排序
- 当前所在目录带 ● 标记
- 中间节点（如 `code`）也可选中，跳转到其下**最近活跃**的会话

## 关联项目

- **[OpenCode](https://opencode.ai/)** —— 本插件宿主，AI 编程终端（V2 插件体系）
- [OpenCode GitHub](https://github.com/anomalyco/opencode) · [V2 插件文档](https://opencode.ai/v2/docs/plugins/)
- 姊妹项目：[notepad--ndd-desensitize-plugin](https://github.com/zhangqxgz/notepad--ndd-desensitize-plugin)（Notepad-- 脱敏插件）

## 安装

需要 OpenCode **V2**（v2.0.19 实测通过）。

### 方式一：本地目录（推荐，即刻生效）

把本仓库克隆（或拷贝）到 OpenCode 全局插件目录，server 的 watcher 会**热加载**，无需重启服务：

```bash
mkdir -p ~/.config/opencode/plugins
git clone https://github.com/zhangqxgz/opencode-session-tree ~/.config/opencode/plugins/opencode-session-tree
```

> Windows：`%USERPROFILE%\.config\opencode\plugins\opencode-session-tree`

然后**退出 TUI 重进**（TUI 插件在 TUI 启动时加载），即可使用。

### 方式二：Git 直装

```sh
opencode plugin add github:zhangqxgz/opencode-session-tree
```

## 使用

| 入口 | 操作 |
|------|------|
| `Ctrl+Alt+T` | 全局快捷键，随时调出目录树 |
| `/tree` | 斜杠命令 |
| `Ctrl+P` 输入 "session directory tree" | 命令面板 |

↑/↓ 选择，回车跳转到该目录最近活跃的会话，`Esc` 取消。
对话框支持输入过滤，目录多的时候直接敲关键词。

## 自定义快捷键

`~/.config/opencode/cli.json`（命令 ID：`session-tree.open`）：

```json
{
  "keybinds": {
    "session-tree.open": "ctrl+alt+o"
  }
}
```

## 工作原理

1. **数据**：直读 OpenCode 本地 SQLite（`~/.local/share/opencode/opencode.db`，只读），
   UNION `session` + `session_v2` 两张表（V1/V2 schema 并存），统计未归档会话；
   每个目录取其最新会话 ID 作为跳转目标
2. **展示**：`dialog.select` 树形缩进渲染，零 JSX 依赖
3. **跳转**：`ui.router.navigate({type:"session", sessionID})`，TUI 原生支持跨 location 打开会话

```
你的按键 → dialog.select 目录树 → 选中目录 → 该目录最近会话
```

**注意**：依赖 OpenCode 内部表结构，大版本升级可能需要适配（issue 区汇报即可）。

## 已知坑（v2.0.19 实测）

- 插件包根目录**必须**有 `index.ts` 和 `tui.ts` 桩文件（server discover 固定按包根找入口）
- `src/index.ts`（server 端）**不能** import `@opencode/plugin`，否则整个包被 server 静默跳过
- `keymap.layer()` 必须在 `ui.slot` 的 render 组件里注册——插件 setup 不在 Solid 组件树内，直接调会抛 `Keymap.Provider is missing`
- 详见 [AGENTS.md](AGENTS.md)

## 开发

```sh
# 数据层/树逻辑快速自测（需要 bun）
bun run test-db.ts
```

改代码后无需重启 service（watcher 热加载），**退出 TUI 重进**即可。

## License

[MIT](LICENSE)

---

## English

A TUI plugin for [OpenCode](https://opencode.ai/) (V2): press a hotkey to see a tree of **all**
directories that have conversations, and jump straight to the selected directory's most recent session.

- Single-child chains collapse into one line (`a/b/c` instead of three levels)
- Per-node session counts + last-active time, sorted by recency; current directory marked with ●
- Intermediate nodes are jumpable too (lands on their most recent descendant session)

**Install** (OpenCode V2, tested on v2.0.19):

```bash
git clone https://github.com/zhangqxgz/opencode-session-tree ~/.config/opencode/plugins/opencode-session-tree
```

Restart the TUI (exit & re-enter). Then press `Ctrl+Alt+T`, or run `/tree`.

**How it works**: reads OpenCode's local SQLite store read-only, unions the `session` and
`session_v2` tables, renders the tree via `dialog.select`, and jumps via the session router.
Depends on internal table shapes — may need adaptation across major OpenCode releases.

[MIT](LICENSE)
