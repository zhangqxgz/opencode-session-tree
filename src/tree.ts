import type { DirStat } from "./db"

export type TreeNode = {
  name: string // display name, already collapsed: "mnt/c/dev" or "synology"
  fullPath: string
  ownSessions: number // sessions whose directory is exactly fullPath
  sessions: number // own + descendants
  lastActive: number
  latestSessionID: string | null
  children: TreeNode[]
}

export type RenderedLine = {
  depth: number
  isLast: boolean
  node: TreeNode
}

function splitPath(directory: string): string[] {
  return directory.split("/").filter(Boolean)
}

// Collapse single-child chains where intermediate nodes have no sessions of
// their own: mnt -> c -> dev renders as "mnt/c/dev". A node that itself has
// sessions is a real jump target, so we never collapse through it.
function collapse(name: string, node: TreeNode): { name: string; node: TreeNode } {
  let result = { name, node }
  while (result.node.ownSessions === 0 && result.node.children.length === 1) {
    const only = result.node.children[0]
    result = { name: result.name + "/" + only.name, node: only }
  }
  return result
}

export function buildTree(stats: DirStat[]): TreeNode[] {
  type Raw = {
    name: string
    fullPath: string
    sessions: number
    lastActive: number
    latestSessionID: string | null
    children: Map<string, Raw>
  }
  const root: Raw = {
    name: "",
    fullPath: "",
    sessions: 0,
    lastActive: 0,
    latestSessionID: null,
    children: new Map(),
  }

  for (const stat of stats) {
    const parts = splitPath(stat.directory)
    if (parts.length === 0) continue
    let cursor = root
    const acc: string[] = []
    for (const part of parts) {
      acc.push(part)
      const fullPath = "/" + acc.join("/")
      let next = cursor.children.get(part)
      if (!next) {
        next = {
          name: part,
          fullPath,
          sessions: 0,
          lastActive: 0,
          latestSessionID: null,
          children: new Map(),
        }
        cursor.children.set(part, next)
      }
      cursor = next
    }
    cursor.sessions += stat.sessions
    cursor.lastActive = Math.max(cursor.lastActive, stat.lastActive)
    if (stat.latestSessionID) cursor.latestSessionID = stat.latestSessionID
  }

  // Convert Raw -> TreeNode with aggregate counts bubbling up.
  const finalize = (raw: Raw): TreeNode => {
    const children = [...raw.children.values()].map(finalize)
    const node: TreeNode = {
      name: raw.name,
      fullPath: raw.fullPath,
      ownSessions: raw.sessions,
      sessions: raw.sessions + children.reduce((n, c) => n + c.sessions, 0),
      lastActive: Math.max(raw.lastActive, ...children.map((c) => c.lastActive), 0),
      latestSessionID: raw.latestSessionID,
      children,
    }
    if (!node.latestSessionID) {
      const newest = children.filter((c) => c.latestSessionID).sort((a, b) => b.lastActive - a.lastActive)[0]
      if (newest) node.latestSessionID = newest.latestSessionID
    }
    // Sort newest first at every level.
    node.children.sort((a, b) => b.lastActive - a.lastActive)
    const collapsed = collapse(node.name, node)
    // collapse() may merge this node into its single child; the merged node
    // keeps the child's fullPath/latestSessionID but shows the longer name.
    return { ...collapsed.node, name: collapsed.name }
  }

  const finalized = [...root.children.values()].map(finalize)
  finalized.sort((a, b) => b.lastActive - a.lastActive)
  return finalized
}

export function flattenTree(nodes: TreeNode[], depth = 0): RenderedLine[] {
  const out: RenderedLine[] = []
  nodes.forEach((node, i) => {
    out.push({ depth, isLast: i === nodes.length - 1, node })
    out.push(...flattenTree(node.children, depth + 1))
  })
  return out
}
