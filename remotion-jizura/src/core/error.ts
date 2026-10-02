export class JizuraError extends Error {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, message: string) {
    super(message);
    this.name = 'JizuraError';
    this.code = code;
    this.path = path;
  }
}

export function unimplemented(path: string): never {
  throw new JizuraError('E_INPUT', path, `${path} is not implemented in the stage 02 scaffold.`);
}
