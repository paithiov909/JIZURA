// Retained JS service installers keep dynamic internals. EditorAPI has a specific
// declaration in ui/editor.d.ts; effects use explicit TS registration contracts.
declare module '*.js' {
  const install: (engine: import('./legacy-types.ts').LegacyFacade) => void;
  export default install;
}
