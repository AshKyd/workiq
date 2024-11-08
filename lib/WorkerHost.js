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
  /**
   *
   * @param {object} options
   * @param {string} options.logLevel
   * @param {Worker[]} options.workers
   */
  constructor({ workers = [], logLevel = "debug" }) {
    this.logLevel = logLevel;
    this.addWorkers(workers);
  }
  /**
   * Add workers to the pool. These must all be identical, and probide identical
   * methods.
   */
  addWorkers(workers = []) {
    workers.forEach((worker) => {
      const workerId = jobId++;
      worker.addEventListener("message", (message) => this._onMessage(message));
      this.workers.push({
        id: workerId,
        isBusy: false,
        worker,
      });
      this.push("helo", { logLevel: this.logLevel });
    });
  }
  /**
   * Send a message to a worker
   * @param {string} method - function to call in the worker
   * @param {any} payload - payload to pass to the function in the worker
   * @returns PromiseLike<any> - return value from the worker
   */
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

      this._startNextJob();
    });
  }
  _finishJob(error, id, payload) {
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
    this._startNextJob();
    if (error) {
      return finishedJob.reject(error);
    }
    return finishedJob.resolve(payload);
  }
  _startNextJob() {
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
  _onMessage(message) {
    const actions = {
      finished: (id, payload) => this._finishJob(null, id, payload),
      errored: (id, payload) => this._finishJob(payload, id, null),
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
