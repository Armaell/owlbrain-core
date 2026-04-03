import type { LifecycleMachine } from "../core/lifecycle"
import { LifecycleState } from "../core/lifecycle"
import { Logger } from "../logging/logger"
import type { EventTask } from "./consumer"
import type { OwlEvent } from "./events-bus"
import type { KeyLockedQueue } from "./key-locked-queue"

/**
 * A fixed‑size pool of async workers consuming tasks from a {@link KeyLockedQueue}
 */
export class WorkerPool {
	private logger = new Logger(["core", "eventbus", "consumer"])

	private idleWorkers: (() => void)[] = []
	private workerPromises: Promise<void>[] = []
	private keepAlive?: ReturnType<typeof setInterval>

	constructor(
		private lifecycle: LifecycleMachine,
		private queue: KeyLockedQueue<EventTask>,
		private workerCount: number,
		private executeTask: (task: EventTask) => Promise<void>
	) {
		this.keepAlive = setInterval(() => {
			this.wakeAllWorkers()
		}, 1000)

		for (let i = 0; i < this.workerCount; i++) {
			this.workerPromises.push(this.workerLoop())
		}
	}

	/**
	 * Wait for workers to finish (after {@link WorkerPool.stop})
	 */
	async wait(): Promise<void> {
		this.lifecycle.shouldBe(LifecycleState.Started)

		await Promise.allSettled(this.workerPromises)
	}

	private async workerLoop(): Promise<void> {
		while (true) {
			if (this.workerShouldStop()) {
				break
			}

			const task = this.queue.next()

			if (!task) {
				await this.waitForNewTask()
				continue
			}

			try {
				await this.executeTask(task.item)
			} catch (err) {
				this.logger.error(err)
			} finally {
				const releasedCount = this.queue.release(
					task.item.consumer.concurrencyKey
				)
				this.wakeWorkers(releasedCount)
			}
		}
	}

	private waitForNewTask(): Promise<void> {
		return new Promise((resolve) => {
			if (this.isStoppingLifecycle()) resolve()
			else {
				this.idleWorkers.push(resolve)
			}
		})
	}

	wakeWorker() {
		this.wakeWorkers(1)
	}

	wakeWorkers(count: number) {
		while (count-- > 0 && this.idleWorkers.length > 0) {
			this.idleWorkers.shift()?.()
		}
	}

	wakeAllWorkers() {
		while (this.idleWorkers.length > 0) {
			this.idleWorkers.shift()?.()
		}
	}

	/**
	 * Let the currently running ones to complete before stopping all workers
	 * @param timeoutMs Maximum time for working to complete their task before being forcefully stopped
	 */
	async stop(timeoutMs = 5000): Promise<void> {
		this.queue.releaseAll()
		// wake all sleeping workers so they exit
		this.wakeAllWorkers()

		// wait for workers to finish or timeout
		let timeoutId
		await Promise.race([
			Promise.allSettled(this.workerPromises),
			new Promise((resolve) => (timeoutId = setTimeout(resolve, timeoutMs)))
		])

		clearTimeout(timeoutId)
		clearInterval(this.keepAlive)
	}

	private isStoppingLifecycle(): boolean {
		return (
			this.lifecycle.state === LifecycleState.Stopping ||
			this.lifecycle.state === LifecycleState.Stopped
		)
	}

	private workerShouldStop(): boolean {
		return this.isStoppingLifecycle() && this.queue.isEmpty()
	}
}
