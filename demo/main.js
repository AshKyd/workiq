import "./style.css";
import WorkerHost from "../lib/WorkerHost.js";

const workers = Array.from({
  length: window.navigator.hardwareConcurrency - 1,
}).map(
  () =>
    new Worker(new URL("./demoworker.js", import.meta.url), {
      type: "module",
    })
);

const client = new WorkerHost({ workers, logLevel: "debug" });
client.push("pi", {}).then((pi) => console.log("got pi", pi));
