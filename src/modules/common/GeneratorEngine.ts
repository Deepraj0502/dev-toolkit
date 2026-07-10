export interface GeneratorEngine<Request, Result> {
  generate(request: Request, options?: Record<string, unknown>): Promise<Result>;
}
