import { Plugin } from "@opencode/plugin/tui"
import { loadDirStats } from "./db"
import { buildTree, flattenTree, type TreeNode } from "./tree"

function fmtTime(ts: number): string {
  if (!ts) return ""
  const d = new Date(ts)
  const now = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  const date = d.getFullYear() === now.getFullYear()
    ? `${p(d.getMonth() + 1)}-${p(d.getDate())}`
    : `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return `${date} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// Indent prefix for a non-root row: │   │   ├── name
function prefix(depth: number, isLast: boolean): string {
  if (depth === 0) return ""
  return "│   ".repeat(depth - 1) + (isLast ? "└── " : "├── ")
}

export default Plugin.define({
  id: "opencode-session-tree",
  setup(context) {
    const openTree = async () => {
      let stats
      try {
        stats = await loadDirStats()
      } catch (error) {
        await context.ui.dialog.alert({
          title: "Session Tree",
          message: `读取 opencode 数据库失败：${error instanceof Error ? error.message : String(error)}`,
        })
        return
      }

      if (stats.length === 0) {
        await context.ui.dialog.alert({ title: "Session Tree", message: "没有找到任何会话目录" })
        return
      }

      const roots = buildTree(stats)
      const lines = flattenTree(roots)
      const currentDir = context.location?.directory

      const options = lines.map((line, i) => {
        const isCurrent = line.node.fullPath === currentDir
        const time = fmtTime(line.node.lastActive)
        return {
          title: (isCurrent ? "● " : "") + prefix(line.depth, line.isLast) + line.node.name,
          description: `${line.node.sessions} 会话${time ? " · " + time : ""}`,
          value: String(i),
        }
      })

      const picked = await context.ui.dialog.select<string>({
        title: `会话目录树（${stats.length} 个目录 / ${roots.reduce((n, r) => n + r.sessions, 0)} 个会话）`,
        options,
      })

      if (picked === undefined) return
      const target = lines[Number(picked)]?.node
      if (!target?.latestSessionID) {
        context.ui.toast.show({ message: "该目录没有可跳转的会话", variant: "warning" })
        return
      }
      context.ui.router.navigate({ type: "session", sessionID: target.latestSessionID })
    }

    // keymap.layer() internally calls useContext(KeymapProvider), which is only
    // available inside the TUI component tree. Plugin setup runs outside it, so
    // registering the layer inside a slot's render component (which mounts
    // inside the host tree) is the reliable way — the layer disposes with the
    // component on plugin unload.
    let registered = false
    context.ui.slot({
      append: "app",
      render: () => {
        if (!registered) {
          registered = true
          context.keymap.layer(() => ({
            mode: "global",
            priority: 10,
            commands: [
              {
                id: "session-tree.open",
                title: "Open session directory tree",
                group: "Session Tree",
                bind: "ctrl+alt+t",
                palette: true,
                slash: { name: "tree" },
                run: openTree,
              },
            ],
            bindings: ["session-tree.open"],
          }))
        }
        return null
      },
    })
  },
})
