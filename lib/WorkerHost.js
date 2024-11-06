let jobId = 0;

function findAndRemove(array, matcher) {
  const index = array.findIndex(matcher);
  if (index === -1) {
    return [array, null];
  }
  const foundJob = array[index];
  const newArray = array.toSpliced(index, 1);
  return [newArray, foundJob];
}

/**
 * Create a WorkerHost and pass in an array of workers running the WorkerClient.
 */
export default class WorkerHost {
  queue = [];
  queueInProgress = [];
  workers = [];
  logLevel = "error";
  constructor({ workers = [], logLevel = "debug" }) {
    this.logLevel = logLevel;
    this.addWorkers(workers);
  }
  addWorkers(workers = []) {
    workers.forEach((worker) => {
      const workerId = jobId++;
      worker.addEventListener("message", (message) => this.onMessage(message));
      this.workers.push({
        id: workerId,
        isBusy: false,
        worker,
      });
      this.push("helo", { logLevel: this.logLevel });
    });
  }
  push(method, payload) {
    const thisJobId = jobId++;
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: thisJobId,
        method,
        payload,
        resolve,
        reject,
      });

      this.startNextJob();
    });
  }
  finishJob(error, id, payload) {
    const [newQueue, finishedJob] = findAndRemove(
      this.queueInProgress,
      ({ id: currentId }) => currentId === id
    );
    this.queueInProgress = newQueue;
    if (!finishedJob) {
      throw new Error(`Job with ID "${id}" doesn't exist`);
    }
    const worker = this.workers.find(
      (worker) => worker.id === finishedJob.workerId
    );
    worker.isBusy = false;
    this.startNextJob();
    if (error) {
      return finishedJob.reject(error);
    }
    return finishedJob.resolve(payload);
  }
  startNextJob() {
    if (!this.queue.length) {
      return;
    }
    const nextWorker = this.workers.find((worker) => !worker.isBusy);
    if (!nextWorker) {
      return;
    }
    const nextJob = this.queue.shift();
    this.queueInProgress.push({
      ...nextJob,
      workerId: nextWorker.id,
    });
    nextWorker.worker.postMessage([
      nextJob.id,
      nextJob.method,
      nextJob.payload,
    ]);
  }
  onMessage(message) {
    const actions = {
      finished: (id, payload) => this.finishJob(null, id, payload),
      errored: (id, payload) => this.finishJob(payload, id, null),
    };
    const [id, method, payload] = message.data;
    if (typeof actions[method] !== "function") {
      throw new Error(
        `Worker attempted to perform an action "${method} that isn't defined`
      );
    }
    actions[method](id, payload);
  }
}
