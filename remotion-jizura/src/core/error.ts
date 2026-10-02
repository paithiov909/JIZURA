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
