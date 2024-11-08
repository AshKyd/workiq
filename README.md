# Workiq

A fast, promise-based queue & communication layer for web workers.

This library provides a `WorkerClient` for use inside a web worker, and `WorkerHost` for managing many web workers. Jobs are added to the queue and sent to the next available worker.

This library is in early development and doesn't yet implement things like cancelling jobs and transferrable data. However it is a good layer for simple worker communication.

## Usage

In your worker, set up as many functions as you require. Functions should accept one object as a parameter and must be async/return a promise. Objects can contain simple data types such as strings, booleans, objects, numbers, arrays, and can return any of the same.

```js
import WorkerClient from "workiq";

const getPi = async () => Math.PI;

const workerClient = new WorkerClient({ getPi });
```

Next, create as many workers as you require for your task. In this example we're creating a worker for each thread on the system:

```js
const workers = Array.from({
  length: window.navigator.hardwareConcurrency - 1,
}).map(
  () =>
    new Worker(new URL("./demoworker.js", import.meta.url), {
      type: "module",
    })
);
```

Finally, create the worker host to manage the workers. Call `push` to push jobs onto the queue, corresponding to the functions in your worker:

```js
import WorkerHost from "workiq";

const client = new WorkerHost({ workers, logLevel: "debug" });
client.push("getPi", {}).then((pi) => console.log(`Got pi: ${pi}`));
```

## Development

- Development uses native ES modules. There is no build step.
- Typescript types are provided along with inline documentation using JSDoc.
- You're welcome to fork this library and add your own functionality. This repo is not currently accepting PRs unless otherwise agreed, but I'm happy to have a look at your work and merge it back if it matches the vague future architecture I've got in my head.
