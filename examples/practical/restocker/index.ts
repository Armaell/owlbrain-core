import type { EventBus, OwlBrainCore, OwlEvent } from "owlbrain-core"
import {
	Logger,
	OnEvent,
	OwlBrain,
	Schedule,
	Script,
	container
} from "owlbrain-core"

/**
 * Practical example
 *
 * This example implements a tiny autonomous inventory‑management loop:
 * > The system simulate a store of item being continuously consumed items
 * > We detects shortages, and restocks them automatically.
 *
 *  You can run this example with `npm run example restocker`
 */

let owlbrain: OwlBrainCore | undefined
let eventBus: EventBus | undefined
const logger = new Logger(["example", "inventory"])

interface ItemConsumedEvent extends OwlEvent {
	name: "item-consumed"
	itemId: string
	consumed: number
	newQty: number
}

interface LowStockEvent extends OwlEvent {
	name: "low-stock"
	itemId: string
	currentQty: number
}

interface RestockConfirmedEvent extends OwlEvent {
	name: "restock-confirmed"
	itemId: string
	newQty: number
}

type Item = {
	id: string
	name: string
	qty: number
	minQty: number
	restockAmount: number
}

const items: Item[] = [
	{ id: "item-1", name: "Screws", qty: 3, minQty: 5, restockAmount: 10 },
	{ id: "item-2", name: "Nails", qty: 8, minQty: 10, restockAmount: 20 }
]

@Script()
class StockCheckerScript {
	private logger = logger.child(["stock-checker"])

	@OnEvent("item-consumed")
	async onItemConsumed(event: ItemConsumedEvent) {
		const item = items.find((i) => i.id === event.itemId)
		if (!item) return

		if (item.qty < item.minQty) {
			this.logger.info(`Low stock of ${item.name} detected (${item.qty})`)

			await eventBus?.emit<LowStockEvent>({
				name: "low-stock",
				itemId: item.id,
				currentQty: item.qty,
				datetime: new Date()
			})
		}
	}
}

@Script()
class RestockScript {
	private logger = logger.child(["restock"])

	@OnEvent("low-stock")
	async onLowStock(event: LowStockEvent) {
		const item = items.find((i) => i.id === event.itemId)
		if (!item) {
			this.logger.warn("Unknown item in low-stock event", event.itemId)
			return
		}
		const previousQty = item.qty

		item.qty += item.restockAmount

		this.logger.info(`Restocked ${item.name} (${previousQty} → ${item.qty})`)

		await eventBus?.emit<RestockConfirmedEvent>({
			name: "restock-confirmed",
			itemId: item.id,
			newQty: item.qty,
			datetime: new Date()
		})
	}
}

@Script()
class ConsumptionSimulatorScript {
	private logger = logger.child(["consumption"])

	@Schedule.text("every 7 s")
	async onConsume(event: OwlEvent) {
		const item = items[Math.floor(Math.random() * items.length)]
		const consumed = Math.floor(Math.random() * 3) + 1

		const previousQty = item.qty
		item.qty = Math.max(0, item.qty - consumed)

		this.logger.info(
			`Consumed ${consumed} units of ${item.name} (${previousQty} → ${item.qty})`
		)

		await eventBus?.emit<ItemConsumedEvent>({
			name: "item-consumed",
			itemId: item.id,
			consumed,
			newQty: item.qty,
			datetime: new Date()
		})
	}
}

async function main() {
	owlbrain = await OwlBrain.start()
	eventBus = container.resolve<EventBus>(["core", "eventbus"])

	logger.info("Waiting for OwlBrain to stop")
	await owlbrain.wait()

	logger.info("🦉🧠")
}

main()
