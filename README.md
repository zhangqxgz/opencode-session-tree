# opencode-session-tree

OpenCode TUI 插件：按一个快捷键，树状展示**所有**有对话记录的目录，回车直接跳转到选中目录的最近会话。

## 效果

```
会话目录树（12 个目录 / 72 个会话）
│
mnt/c  [72 会话]
├── dev  [68 会话]
│   ├── code  [32 会话]
│   │   ├── synology  [23 会话 · 09-30 10:45]
│   │   ├── fakeName  [2 会话 · 09-26 20:38]
│   │   └── ...
│   ├── scripts  [8 会话]
│   └── doc  [28 会话]
└── Users/qxzha  [4 会话]
```

- 单链目录自动折叠：`ndd_plugins/desensitive_processor` 占一行，不炸宽度
- 每个节点显示累计会话数 + 最后活跃时间，按最后活跃排序
- 当前所在目录带 ● 标记
- 中间节点（如 `code`）可选中，跳转到其下**最近活跃**的会话

## 安装

### 本地路径（开发）

`~/.config/opencode/cli.json`：

```json
{
  "plugins": ["/mnt/c/dev/code/opencode-session-tree"]
}
```

### Git 直装

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

## 数据从哪来

直读 OpenCode 本地 SQLite（`~/.local/share/opencode/opencode.db`，只读），UNION 两张会话表（`session` + `session_v2`），统计未归档会话。

**注意**：依赖 OpenCode 内部表结构，大版本升级可能需要适配。

## 开发

```sh
# 数据层/树逻辑单测（需要 bun）
bun run test-db.ts   # 从插件目录复制出去再跑，别提交
```

改动后重启 TUI（`opencode` 退出重进）即生效，TUI 插件不用重启 service。

## 快捷键自定义

在 `cli.json` 的 `keybinds` 里覆盖（命令 ID：`session-tree.open`）：

```json
{
  "keybinds": {
    "session-tree.open": "ctrl+alt+o"
  }
}
```

## License

MIT
