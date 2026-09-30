// Server discovers this package by its root index.ts. Re-export the real
// entry from src/ so the package shape stays compatible.
export { default } from "./src/index.ts"
