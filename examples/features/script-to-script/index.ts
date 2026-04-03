import type { EventBus, OwlBrainCore, OwlEvent } from "owlbrain-core"
import {
	Inject,
	Logger,
	OnEvent,
	OwlBrain,
	Script,
	container
} from "owlbrain-core"

let owlbrain: OwlBrainCore | undefined
let eventBus: EventBus | undefined
const logger = new Logger(["example"])

/**
 * Example showing **how to inject another script**, but also:
 * - How to start OwlBrain
 * - How to do a basic listen to a event
 * - How to emit an event manually
 * - How to gracefully stop the runtime
 *
 * You can run this example with `npm run example basic`
 */
@Script()
class ScriptExampleA {
	private logger = logger.child(["script", "a"])

	@Inject(["script", "b"])
	private scriptB!: ScriptExampleB

	@OnEvent("step-1")
	async onStep1(event: OwlEvent) {
		this.logger.info("Received event", event.name)
		this.logger.info(
			"The first way to call the function of another script is to inject it.",
			"We can then just call it like a regular function"
		)
		await this.scriptB.onStep2()
	}
	@OnEvent("step-3")
	async onStep3(event: OwlEvent) {
		this.logger.info("Received event", event.name)
		this.logger.info("We will use it to stop OwlBrain")
		owlbrain?.stop()
	}
}
@Script({
	injectableAs: ["script", "b"]
})
class ScriptExampleB {
	private logger = logger.child(["script", "b"])

	async onStep2() {
		this.logger.info("We called ScriptExampleB.onStep2()")
		this.logger.info(
			"The second way to call the function of another script is to simply emit an event."
		)
		this.logger.info("Emitting the custom event 'step-3'")
		await eventBus?.emit({
			name: "step-3"
		})
	}
}

async function main() {
	owlbrain = await OwlBrain.start()

	eventBus = container.resolve<EventBus>(["core", "eventbus"])
	logger.info("Emitting the custom event 'step-1'")
	await eventBus.emit({
		name: "step-1"
	})

	logger.info("Waiting for OwlBrain to stop")
	await owlbrain.wait()

	logger.info("🦉🧠")
}

main()
