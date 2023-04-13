export class Throttle {
  constructor(duration) {
    this.duration = duration;
    this.lastInvocationTime = null;
    this.timeoutId = null;
  }

  async exec(fn) {
    const now = Date.now();
    return new Promise(async (resolve, reject) => {
      if (!this.lastInvocationTime || now - this.lastInvocationTime >= this.duration) {
        try {
          const result = await fn();
          this.lastInvocationTime = now;
          resolve(result);
        } catch (error) {
          reject(error);
        }
      } else {
        clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(async () => {
          try {
            const result = await fn();
            this.lastInvocationTime = Date.now();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, this.duration - (now - this.lastInvocationTime));
      }
    });
  }
}
