# Browser editor source

`body.html` and `style.css` are authored source. `application.ts` initializes the
same editor for Pages, the seven single-file offline editions, and CEP. The build
copies relative imports unchanged and lets Vite bundle them; it does not assemble
or translate JavaScript. Offline navigation uses the sibling distribution HTML
filenames. Hosted locale routes and the historical directory-based CLI output
keep their existing URLs.

```ts
import type { EditorApplication } from './application.ts';

function update(app: EditorApplication) {
  app.editor.prepare();
  const current = app.editor.state(true);
  app.editor.lyrics(current.project.lyrics + '\nAnother line');
  app.editor.preview({ time: 0.5, action: 'pause' });
}
```

The bootstrap publishes `window.jizuraApp`; its `editor` is the exact object also
available as `J.uiApi.editor`. `types.ts` defines operations, snapshots, loading,
history and export jobs. `services/types.ts` describes the lazy browser font,
audio, storage and codec services retained on each engine. `EditorHost` preserves
CEP hooks, including actual audio-file loading and export ranges.

Adapters should wait for boot/loading completion, call `prepare()` before reading
a revision, validate untrusted inputs and enforce busy/revision checks, then invoke
the operations. Mutations own history, replanning and persistence. State snapshots
are detached; changing them does not change the document. Line/cut operation
indexes are zero-based; settings ranges and timing entries are one-based. Saved
projects keep their original zero-based representation. `startExport()` starts
immediately and returns a job snapshot: poll `state().exportJob` for completion.
`download_started` records browser download initiation; it does not prove the user
saved a file. Keep direct-to-file export inside the user activation path.

The algorithms in `editor.js` and `services/*.js` remain JavaScript modules. Their
TypeScript declarations are consumer boundaries, not proof of internal strict
typing. Source comparisons, browser interaction/export tests and separate syntax
checks verify the implementations. Renderer/item dynamic slots also remain;
this task does not claim their complete TypeScript conversion. Task 08 ports the
browser adapter; it must keep its published validation and registration contract.

Run `npm run typecheck`, `npm run check`, then `npm run test:editor:browser` with
Playwright/Pillow available to Python, installed Chrome, `ffmpeg`/`ffprobe`, and a
local TTF (`--font PATH` is accepted by `dev/editor_test.py`). The browser test
records actual downloaded JSON/LRC/PNG/MP4 contents in ignored `dist/task07/`.
It uses a real OPFS writable stream with a mocked picker for direct-to-file MP4;
native OS dialogs and actual Adobe/CEP runtimes remain separate verification.
Chrome 154 rejects OPFS at `file:`; that test records a visible picker-backend
failure separately from the successful hosted direct writer and offline MP4
download. It makes no claim about the native offline picker.
