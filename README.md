# Workiq

A fast, promise-based queue & communication layer for web workers.

This library provides a `WorkerClient` for use inside a web worker, and `WorkerHost` for managing many web workers. Jobs are added to the queue and sent to the next available worker.

This library is in early development and doesn't yet implement everything yet. However it is a good layer for simple worker communication.

## Usage

In your worker, set up as many functions as you require. Functions should accept one object as a parameter and must be async/return a promise. Objects can contain simple data types such as strings, booleans, objects, numbers, arrays, and can return any of the same.

```js
import WorkerClient from "workiq";

const getPi = async () => [Math.PI];

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

## Transferrable objects

You may have noticed that the return value from `getPi` returns its value in an object. This is because functions may also return a second value containing an array of [transferrable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects).

You can transfer any type of transferrable objects, including ArrayBuffers, OffscreenCanvas etc. See the full list of [supported transferrable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects#supported_objects).

Consider the following examples:

```js
const uInt8Array = new Uint8Array(1024 * 1024 * 8).map((v, i) => i);

// transfer the array to the worker & get a new one in return.
const newUInt8Array = await client.push("manipulateArray", uInt8Array, {
  transferList: [uInt8Array],
});
```

And to transfer an object back:

```js
const manipulateArray = async (uInt8Array) => {
  // do something to the array

  // then return it as both the return value, and in the transferList
  return [uInt8Array, [uInt8Array]];
};

const workerClient = new WorkerClient({ manipulateArray });
```

Note that in these examples `uInt8Array` will not be transferred until a worker becomes free to take the job. If you try to access it after calling `client.push` you will hit race conditions. So it's best to treat it as alredy transferred.

## Development

- Development uses native ES modules. There is no build step.
- Typescript types are provided along with inline documentation using JSDoc.
- You're welcome to fork this library and add your own functionality. This repo is not currently accepting PRs unless otherwise agreed, but I'm happy to have a look at your work and merge it back if it matches the vague future architecture I've got in my head.
