# OwlBrain
**OwlBrain is an event‑driven automation engine that keeps the simplicity of Home Assistant–style triggers while unlocking the full expressive power of TypeScript for complex logic.**

While No‑code or visual ECA builders (like Home Assistant’s UI automations or Node‑RED flows) excel at simple rules. But as soon as your logic grows, they buckle under their own weight.

OwlBrain is built for the other half of automation — the part where things get interesting and magic.

- **Events stay familiar**—triggers, state changes, schedules, webhooks, events.
- **Full code** — for real logic, branching, composition, and reuse.
- **Automation stays maintainable** — no visual spaghetti, no YAML nesting hell, no flow‑chart bloat.

### How to start
This document is for contributors who want to build **integrations** or contribute directly to the **core**. It explains the architecture you will interact with.

If you wish to simply start using OwlBrain you can :
- check the [owlbrain-start](https://github.com/Armaell/owlbrain-starter) package for more suitable documentation and quick stater project.
- Check usage examples in the `examples/` folder and run them with `npm run example <example-name>`

#### Examples list
##### Features Highlight
These examples highlight one particular feature per example file:
- **[basic](./examples/features/basic/index.ts)** — Minimal example
- **[load-by-path](./examples/features/load-by-path/index.ts)** — Make the Core autoload scripts files
- **[script-to-script](./examples/features/script-to-script/index.ts)** — Call methods of a script, from another script
- **[shared-script](./examples/features/script-to-script/index.ts)** — Reuse a script to share or extend behavior
- **[custom-event](./examples/features/custom-event/index.ts)** — Emit your own events with custom data
- **[lifecycle](./examples/features/lifecycle/index.ts)** — Listen to lifecycle events inside scripts
- **[delay](./examples/features/delay/index.ts)** — Use the utility @Delay() decorator
- **[schedule](./examples/features/schedule/index.ts)** — Emit events on scheduled time
- **[advanced-event-filtering](./examples/features/advanced-event-filtering/index.ts)** — Use more complex rules to filter events

##### Full Practical
More complexes examples trying to simulate more realistic use-cases:
- **[restocker](./examples/practical/restocker/index.ts)** —Automated inventory system detecting low stock, and triggering restocking.
- **[sensors](./examples/practical/sensors/index.ts)** — Listen to sensors readings, and trigger alerts on sustained high temperatures.


## Overview
owlbrain‑core provides a framework for a script‑driven automations:

- **Scripts** are user-defined javascript classes to build their logic that reacts to events.
- **Integrations** connects to external system or extend the functionalities.
- An **event bus** centralizing events emitted by integrations and a **consumer** calling the event decorated methods when their conditions matches.
- **Event decorators** registered to the **consumer** and declaring which events their decorated method will be called upon

## Core concepts
### Scripts
Scripts are user‑defined classes decorated with `@Script()` or another extended script decorator provided by an integration.\
They are discovered by the core at file import, and the core accept a path to the files to load.

The decorator can accept a configuration object, allowing then to either:
- do side effects before the script instantiation
- build a scriptData object that will be then be shared to event decorators as configuration.

A script class can be decorated multiple time with different script decorator. The class will be instantiated as many time with the different configurations.

### Integrations
Integrations extend with more capabilities, often connecting to external services. They will then generally emit events to the event bus.

Integrations then use the lifecycle to connect or disconnect from external services.

Each integration must define a unique name which can be used to namespace the events.

### Event Decorators

Method decorated by event decorators will be called by the event bus.

The decorator register the method to the event bus and set rules as to which event will trigger the method.

They can also apply side effect on script instantiation, use scriptData to modify their behavior or react on values returned by the decorated method.

They also set the event type.

### Event Bus
Events are at their most minimalistic:

```ts
interface OwlEvent {
  namespace?: string;
  name: string;
  datetime: Date;
}
```
They can be extended at will by integrations to provide more data and event Decorators will set the type.

The event bus is split in two parts:

---

First is the **EventBus** itself which provide two basic functions :
- `emit(event)` — pushes an event to all listeners
- `listen(handler)` — registers a listener that will receive all events.

In the future it may be possible to use user defined services as event bus, but for now only a **InMemoryEventBus** exists.

---

Second is the **EventBusConsumer**. It listen to the event bus and dispatch events to event decorated methods. More exactly it:
- Apply filtering rules to the event to only call relevant methods.
- Allow parallel executions if `workerCount > 1`, sequentially otherwise.
  - while also ensure that a script instance process only one event at a time.
- Act as application loop

### Dependency Injection Container

The DI container is a global singleton. Tokens are arrays of strings:

```ts
["core", "eventbus"]
["mqtt", "client"]
["homeassistant", "cache"]
```

The container supports:

- `register(token, value)` — registers a value
- `resolve(token)` — retrieves a value, if not found it throws an error
- `resolveAsync(token)` — waits for a value to be registered before resolving it

This allows:
- integrations to use core systems
- scripts to use services provided by integrations
- scripts to call other scripts

### Lifecycle
A basic lifecycle machine coordinates startup and shutdown. It transitions through:

```
Init → Starting → Started → Stopping → Stopped
```

It provide integrations with the following hooks:
- `onInit`
- `onStarting`
- `onStarted`
- `onStopping`
- `onStopped`

and scripts with the event decorators `@OnInit()`, `@OnStart()`, `@OnStop()`

## How the Core Works Internally

### Script Registry, Factory and Metadata Walker
Those three classes are responsible for the discovery and the instantiation of scripts
#### Script Registry
This is the interface for the core class to interact with scripts.
- Allow the core to trigger the instantiation of scripts
- It keeps a reference to all scripts to prevent them to be garbage collected.
- It also import the files using the path given at OwlBrain initial configuration.

A file import trigger decorators execution.
#### Metadata Walker
At file import, decorators function are triggered, each one separately. The Metadata Walker is used to create relationship between class decorators (@Script) and method decorators (event decorators)

Because TC39 decorators run in a strict order, the walker acts as a buffer that reconstructs the logical relationship between scripts and their event handlers.
- method decorators are called first
- class decorators are called once all the method decorators have been called in the class.

So the relationship is rebuilt by keeping a transactional stack.
- All events encountered consecutively belong to the same script.
- The stack grows until a script decorator appears, which take ownership of all previously encountered events handlers.

The ScriptFactory can then use this map of metadata

#### Script Factory
The ScriptFactory uses the built map of script and event metadata to instantiate scripts, register event handlers to the [event bus consumer](#event-bus-consumer)

### Event Bus Consumer
On event emission, the consumer orchestrate which event handler is called, it also provide async workers and concurrency rules.
It act as a small orchestration engine layered on top of the EventBus.

It is composed of three internal subsystems:

- **ConsumerRegistry** — Act as a pre-filter, matching events and handlers depending on their namespace
- **WorkerPool** — Run a fixed number of async workers that pull tasks from the queue and execute them without blocking the main thread.
- **KeyLockedQueue** — Provide a per script locking mechanism, preventing a script instance to run two events at the same time

The Consumer also act as blocking function with the `wait()` function, preventing the app to stop until desired.

## Writing an Integration
An integration typically:

- Connects to an external system (API, device, protocol)
- Exposes services to scripts via DI
- Emits events into the event bus
### The Integration entrypoint
An integration must provide an `OwlIntegrationFactory`. It then use lifecycle hooks to start/stop their own services.

Example:
```ts
export const MyIntegration = (config): OwlIntegrationFactory {
	const name = name: config.name ?? "my-integration",

	const logger = new Logger([this.name])
	const client = new MyClient(config.url);

	return {
		name,

		onInit: async () => {
			await client.connect();
		},

		onStarting: async () => {
			await client.connect();
			logger.info("Connected");
		},

		onStopping: async () => {
			await client.disconnect();
		}
	}
}
```
Note that each integration must have a unique name to prevent event collision. You will most likely provide a default name, and the possibility for the user to override it.
### Provide services
You can register services to the container
```ts
container.register([this.name, "client"], this.client);
```
allowing users to then use them
```ts
@Inject(["myintegration", "client"])
private client!: MyClient;
```
### Emitting Events

Integrations generally emit events. You can do that by resolving the event bus:

```ts
const bus = container.resolve(["core", "eventbus"]);
await bus.emit({ namespace: this.name, name: "update" });
```
### Provide Event Decorators
the `buildEventDecorator()` function allow to create your own event decorators, allowing you to :
- Set which events or which rules trigger the decorated method
- Define the event type
- Do any side effect at init
- Wrap the method, allowing you to:
  - Act on call
  - Act on return

Example:
```ts
export interface HighEnergyConfig {
  meterId: string
  threshold: number
}
export type HighEnergyResponse = string

export const OnHighEnergyUsage = buildEventDecorator(
  async (
    method: (event: EnergyEvent) => Promise<HighEnergyResponse>,
    scriptData: unknown,
    config: HighEnergyConfig
  ) => {
    const energyService = await container.resolveAsync<EnergyMonitoringService>(["energy"
	, "monitor"])
    energyService.registerMeter(config.meterId)

    return {
      method,
      eventNamespace: "energy",
      eventFilter: (event) => event.meterId === config.meterId && event.watts >= config.threshold,
      onReturnValue: async (event, result) => {
        await energyService.recordSpike(event.meterId, {
          watts: event.watts,
          message: result
        })
      }
    }
  }
)
```
In this example:
- **Decorator config** — Set a meterId to listen to, and a value treshold
- **Side effect** — Register a meterId, this could be starting the event emission until registered
- **Event filtering** — the method trigger only on event concerning the given meterId and if the value is above the threshold the user gave us
- **On return action** — we register the value the user gave us back

Here we did not wrap the method, or use `scriptData`

### Provide Script Decorators
Scripts decorator are simpler, they allow you to:
- Do any side effect at init
- Build a scriptData

The `scriptData` is then passed to event decorators allowing script wide configuration.

Example:
```ts
import type { OwlEvent } from "owlbrain-core"
import { buildScriptDecorator, buildEventDecorator } from "owlbrain-core/integration"

export interface LocalTimeEvent extends OwlEvent {
  localHour?: number
}

export const TimezoneScript = buildScriptDecorator(
	async (config: { timezone: string }) => ({
		scriptData: config
	})
)

export const OnLocalTimeEvent = buildEventDecorator(
	async (method: (event: LocalTimeEvent) => Promise<void>, scriptData: unknown) => {
		if (!isConfig(scriptData)) {
			throw new Error("Invalid scriptData: missing timezone")
		}

		return {
			method: async (event) => {
				const local = new Date(
					event.datetime.toLocaleString("en-US", {
						timeZone: scriptData.timezone
					})
				)

				event.localHour = local.getHours()
				return method(event)
			}
		}
	}
)
```
In this example:
- **Script config** — We set a timezone to apply to the whole script
- **Event handler behavior update** — Our event handler now catch all events and update them to add the localized hour before calling the decorated method
