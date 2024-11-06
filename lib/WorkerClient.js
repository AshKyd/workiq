/**
 * Run this inside the worker. Pass in an object of actions that can be called.
 * @param {*} _actions
 */
export default function WorkerClient(_actions) {
  let logLevel = "debug";
  const actions = {
    ..._actions,
    helo: async ({ logLevel = "error" }) => {
      logLevel = logLevel;
      if (logLevel === "debug") {
        console.log("worker - setting logLevel", logLevel);
      }
      return "hello";
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
      .then((responsePayload) => {
        postMessage([id, "finished", responsePayload]);
      })
      .catch((e) => {
        console.error("worker errored", e);
        postMessage([id, "errored", e.message]);
      });
  });
}
