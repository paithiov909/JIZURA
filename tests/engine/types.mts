import type { Engine, AEPlan, Project, Plan, TextItem } from '../../engine/types.ts';
// Compile-only consumer examples: invalid persisted boundaries must be rejected.
export function checkConsumerTypes(engine: Engine, project: Project, plan: Plan): void {
  const item: TextItem = { text: '夜明け', font: 'gothic_black', size: 100 };
  const exported: AEPlan = engine.planForAE(engine.plan(project), project);
  const version: 2 = exported.version;
  const glyphCount: number = engine.layoutText(item).N;
  const picked: string = engine.rng(42).pick(['center', 'tile']);
  void [version, glyphCount, picked];
  // @ts-expect-error effect group names are stable, closed keys
  engine.order('layouts');
  // @ts-expect-error project seeds are numeric
  engine.plan({ ...project, seed: '42' });
  // @ts-expect-error browser plans cannot be passed as exported AE v2 plans
  const wrongPlan: AEPlan = plan;
  // @ts-expect-error glyph font and size are required
  engine.layoutText({ text: '夜明け' });
  void wrongPlan;
}
