# 09 — After Effects ScriptUI and core build

**Depends on:** tasks 04 and 05; compare with task 01.

## Work

Retain `ae/*.jsx` as ExtendScript ES3 source and connect its data generation and assembly to the root build commands. Produce Japanese and English ScriptUI panels plus the core used by CEP. Remove the requirement to commit generated `ae/data.json` or generated root `.jsx` files on `v1.x`: generate them into ignored build output from typed source metadata. Keep version, localized labels, external API, pack inclusion and encoding behavior compatible.

Preserve the distinction between browser effects and AE-native implementations. Test explicit fallbacks rather than assuming every Canvas effect has an identical AE equivalent.

## Deliverable and acceptance

- All generated AE files parse as ES3 and the existing AE object-model tests pass against both languages and the CEP core.
- Browser-exported AE plan fixtures build without new unknown IDs or unreported fallbacks.
- Any actual AE run is recorded separately; a green mock alone is not described as real-host compatibility.

**Handoff to:** task 10.
