


export class Timer {
    private startTime = 0;
    private endTime = 0;
    private diff = 0;

    constructor() {}

    start() {
        this.startTime = performance.now();
    }

    end() {
        this.endTime = performance.now();
        this.diff = this.endTime - this.startTime;
    }

    log() {
        const timeDiffSec = this.diff / 1000;
        console.log(`builded in ${timeDiffSec.toFixed(2)} second(s)`);
    }
}