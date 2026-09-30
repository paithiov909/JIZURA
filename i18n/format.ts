/** Literal insertion: never reparse inserted values as templates or executable code. */
export function formatMessage(message: string | undefined, key: string, values: readonly unknown[] = []): string {
  if (typeof message !== 'string') throw new Error(`Missing translation: ${key}`);
  return message.replace(/\{p(\d+)\}/g, (_match, index: string) => {
    if (Number(index) >= values.length) throw new Error(`Missing parameter: ${key}/p${index}`);
    return String(values[Number(index)]);
  });
}
