export { type OwlIntegrationFactory } from "./integrations/types"
export { ScriptRegistry } from "./scripts/registry"

export { EventBusConsumer } from "./events-bus/consumer"
export { buildEventDecorator } from "./decorators//builders/event"
export {
	buildScriptDecorator,
	type ScriptClass
} from "./decorators/builders/script"
