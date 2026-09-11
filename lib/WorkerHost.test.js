import { test } from 'node:test';
import assert from 'node:assert/strict';
import WorkerHost from './WorkerHost.js';

/**
 * A fake worker that records every message it's asked to run and lets the test control exactly
 * when each one "finishes" — enough surface for WorkerHost (addEventListener/postMessage) without
 * spinning up a real Worker thread.
 */
class FakeWorker extends EventTarget {
	dispatched = [];

	postMessage([id, method, payload]) {
		this.dispatched.push({ id, method, payload });
	}

	/** Simulates the worker replying "finished" for a given job id. */
	respond(id, payload = null) {
		this.dispatchEvent(new MessageEvent('message', { data: [id, 'finished', payload] }));
	}
}

test('WorkerHost only dispatches one job at a time to a single worker', async () => {
	const worker = new FakeWorker();
	const host = new WorkerHost({ workers: [worker] });

	// addWorkers() pushes an implicit "helo" job — let it finish, then clear the log so the
	// assertions below only look at the jobs this test actually cares about.
	const heloId = worker.dispatched[0].id;
	worker.respond(heloId);
	worker.dispatched.length = 0;

	const firstDone = host.push('writeFile', { path: 'a' });
	const secondDone = host.push('writeFile', { path: 'b' });

	// Both jobs are queued from the main thread's perspective, but only the first should have
	// actually been posted to the worker — the second must wait for the first to finish. This is
	// the exact bug: without isBusy being set, both get posted immediately and can run
	// concurrently in the worker, racing on any shared state (e.g. stratus-base's metadata.json).
	assert.equal(worker.dispatched.length, 1, 'second job must not be dispatched while the first is in flight');
	assert.equal(worker.dispatched[0].payload.path, 'a');

	worker.respond(worker.dispatched[0].id, 'result-a');
	await firstDone;

	assert.equal(worker.dispatched.length, 2, 'second job dispatches only after the first finishes');
	assert.equal(worker.dispatched[1].payload.path, 'b');

	worker.respond(worker.dispatched[1].id, 'result-b');
	assert.equal(await secondDone, 'result-b');
});
