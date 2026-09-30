// Server-side entry. The plugin is TUI-only; this no-op satisfies the server
// loader, which requires a default export of { id, setup }.
//
// Zero imports on purpose: bare imports of `@opencode/plugin` are not
// resolvable in the server process and would fail the whole package load.
export default {
  id: "opencode-session-tree",
  setup: () => {},
}
