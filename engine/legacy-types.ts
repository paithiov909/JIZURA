/** Temporary dynamic contract for unconverted engine renderer/item slots. Effects now
 * have their registration contract in effects/types.ts. Public engine boundaries live in types.ts. Task 07
 * narrows these remaining item slots; this is not a global namespace. */
export type LegacyValue = any;
export type LegacyFacade = Record<string, LegacyValue>;
