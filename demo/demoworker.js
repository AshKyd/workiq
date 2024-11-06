import WorkerClient from "../lib/WorkerClient.js";
const workerClient = new WorkerClient({ pi: async () => Math.PI });
