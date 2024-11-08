import WorkerClient from "../lib/WorkerClient.js";
const getPi = async () => Math.PI;
const workerClient = new WorkerClient({ getPi });
