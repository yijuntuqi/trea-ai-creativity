export type ParseErrorCode = 'unsupported' | 'no-text' | 'corrupt'

export class ParseError extends Error {
  constructor(
    public code: ParseErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ParseError'
  }
}
