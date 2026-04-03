import type { OwlBrain, OwlBrainCore, OwlEvent } from "owlbrain-core"
import { Logger, OnEvent, Script, container } from "owlbrain-core"

@Script()
export class LoadedByPathExample {
	private owlbrain: OwlBrainCore
	private logger = new Logger(["example", "script"])

	constructor() {
		this.owlbrain = container.resolve<OwlBrainCore>(["core"])
	}

	@OnEvent("my-event")
	async onEvent(event: OwlEvent) {
		this.logger.info("Received event", event.name)
		this.logger.info("We will use it to stop OwlBrain")
		this.owlbrain.stop()
	}
}
