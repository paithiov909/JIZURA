// JS installers keep their existing dynamic definitions until tasks 05–08.
declare module '*.js' {
  const install: (engine: import('./legacy-types.ts').LegacyFacade) => void;
  export default install;
}
