export default class Result {
  private result: string[] = [];
  private retract = 0;

  private getRetract() {
    let res = '';
    for (let i = 0; i < this.retract; i++) res += "\t";
    return res;
  }

  get() {
    return this.result.join("\n");
  }

  push(str?: string, afterRetract = 0, beforeRetract = 0) {
    if (beforeRetract !== 0) {
      this.retract += beforeRetract;
    }
    if (str && str.length > 0) {
      this.result.push(this.getRetract() + str);
    } else {
      this.result.push("");
    }
    if (afterRetract !== 0) {
      this.retract += afterRetract;
    }
  }

  leftBrace() {
    this.push('{', 1);
  }
  rightBrace() {
    this.retract--;
    this.push('}');
  }
}