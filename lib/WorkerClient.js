/**
 * Run this inside the worker. Pass in an object of actions that can be called.
 * @param {Object.<string, function(any): PromiseLike<any>>} _methods - An object of actions that can be called from WorkerHost.push
 */
export default function WorkerClient(_methods) {
  let logLevel = "debug";
  const actions = {
    ..._methods,
    helo: async ({ logLevel = "error" }) => {
      logLevel = logLevel;
      if (logLevel === "debug") {
        console.log("worker - setting logLevel", logLevel);
      }
      return ["hello"];
    },
  };

  addEventListener("message", (message) => {
    const [id, method, payload] = message.data;
    if (typeof actions[method] !== "function") {
      throw new Error(
        `Host attempted to perform an action "${method} that isn't defined`
      );
    }
    if (logLevel === "debug") {
      console.log("worker - ", id, method, payload);
    }
    actions[method](payload)
      .then(([responsePayload, transferList]) => {
        postMessage([id, "finished", responsePayload], {
          transfer: transferList,
        });
      })
      .catch((e) => {
        console.error("worker errored", e);
        postMessage([id, "errored", e.message]);
      });
  });
}
