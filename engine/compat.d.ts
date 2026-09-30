// JS installers keep their existing dynamic definitions until tasks 06–08; effects use explicit TS contracts.
declare module '*.js' {
  const install: (engine: import('./legacy-types.ts').LegacyFacade) => void;
  export default install;
}
