import type { EditorApplication } from '../../ui/application.ts';
import type { Project, AEPlan } from '../../engine/types.ts';

// Compile-only task-08 consumer: mutations require no DOM or dynamic J facade.
export async function adapterConsumer(app: EditorApplication): Promise<void> {
  const api = app.editor;
  api.prepare(); api.activate();
  const state = api.state(true);
  const project: Project = state.project;
  const plan: AEPlan = api.projectData(true);
  api.settings({ fx: { motion: 0.3 }, mode: 'pro', exportRange: { from: 1, to: 2 } });
  api.lyrics(project.lyrics);
  api.timing({ snap: false }, [{ line: 1, time: null }]);
  api.line(0, { text: 'Hello/world', lock: true });
  api.cut(0, 0, 'layout', 'center', true);
  api.techniques('enter', ['cut'], true);
  api.locks('params', ['motion'], true);
  api.randomize('cut', 0, 0, 'shuffle');
  api.history('edit', -1); api.preview({ time: 0.5, loop: 'line' });
  api.tap('start', 0); api.tap('stop');
  await api.importProject(project); await api.saveProject(false);
  api.startExport('pngl'); api.cancelExport();
  void plan;
  // @ts-expect-error wrong mode
  api.settings({ mode: 'advanced' });
  // @ts-expect-error wrong export family
  api.startExport('gif');
  // @ts-expect-error wrong cut group
  api.cut(0, 0, 'fx', 'flash');
  // @ts-expect-error wrong time
  api.preview({ time: '0.5' });
  // @ts-expect-error summaries deliberately do not expose projects
  const summaryProject: Project = api.state().project;
  // @ts-expect-error AE data uses version 2
  const saved: Project = api.projectData(true);
  void summaryProject; void saved;
}
