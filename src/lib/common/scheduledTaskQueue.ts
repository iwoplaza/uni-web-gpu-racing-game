type Task = () => void;

class ScheduledTaskQueue {
  queue: [number, Task][] = [];
  executorRunning = false;

  private async startExecutor() {
    if (this.executorRunning) {
      // Already running
      return;
    }

    this.executorRunning = true;
    while (this.queue.length > 0) {
      const now = Date.now();
      const [sendAt, sendPayload] = this.queue.shift()!;

      if (now < sendAt) {
        await new Promise((resolve) => setTimeout(resolve, sendAt - now));
      }

      sendPayload();
    }
    this.executorRunning = false;
  }

  schedule(runAt: number, task: Task): void {
    this.queue.push([runAt, task]);

    // Executing the process, if it is not currently running.
    this.startExecutor();
  }
}

export default ScheduledTaskQueue;
