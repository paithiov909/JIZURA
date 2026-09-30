/** Temporary dynamic contract for unconverted engine renderer/item slots. Effects now
 * have their registration contract in effects/types.ts. Public engine boundaries live in types.ts;
 * task 07 adds editor/browser-service contracts in ui/. Renderer/item dynamic
 * slots remain a separate conversion boundary; this is not a global namespace. */
export type LegacyValue = any;
export type LegacyFacade = Record<string, LegacyValue>;
