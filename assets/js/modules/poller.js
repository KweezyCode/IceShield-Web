export class Poller {
  constructor(intervalMs, fn){
    this.intervalMs = intervalMs;
    this.fn = fn;
    this.timer = null;
  }

  start(){
    this.stop();
    this.timer = setInterval(()=>{ this.fn(); }, this.intervalMs);
  }

  stop(){
    if(this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

