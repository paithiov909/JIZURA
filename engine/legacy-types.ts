/** Temporary dynamic contract for unconverted effect definitions and per-effect
 * parameter objects. Public engine boundaries live in types.ts. Tasks 05/07
 * replace these slots with typed effects/items; this is not a global namespace. */
export type LegacyValue = any;
export type LegacyFacade = Record<string, LegacyValue>;
