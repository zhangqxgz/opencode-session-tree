// Server-side entry. The plugin is TUI-only for now; this no-op keeps the
// package shape valid (`opencode plugin` expects a default export from ".").
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "opencode-session-tree",
  setup() {
    // Intentionally empty. All functionality lives in the TUI entry (./tui).
  },
})
