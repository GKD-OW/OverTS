
export class OverTSError {
  private obj: any;
  private error: Error;
  constructor(message: string, obj: any) {
    this.obj = obj;
    this.error = new Error(message);
  }
}