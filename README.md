# OwlBrain
**OwlBrain is an event‑driven automation engine that keeps the simplicity of Home Assistant–style triggers while unlocking the full expressive power of TypeScript for complex logic.**

While No‑code or visual ECA builders (like Home Assistant’s UI automations or Node‑RED flows) excel at simple rules. But as soon as your logic grows, they buckle under their own weight.

OwlBrain is built for the other half of automation — the part where things get interesting and magic.

- **Events stay familiar**—triggers, state changes, schedules, webhooks, events.
- **Full code** — for real logic, branching, composition, and reuse.
- **Automation stays maintainable** — no visual spaghetti, no YAML nesting hell, no flow‑chart bloat.

## How to start
If you wish to simply start using OwlBrain you can :
- checkout the [owlbrain-starter](https://github.com/Armaell/owlbrain-starter) package
- Take a loot at usage examples in the `examples/` folder and run them with `npm run example <example-name>`

## Examples list
### Features Highlight
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

### Full Practical
More complexes examples trying to simulate more realistic use-cases:
- **[restocker](./examples/practical/restocker/index.ts)** —Automated inventory system detecting low stock, and triggering restocking.
- **[sensors](./examples/practical/sensors/index.ts)** — Listen to sensors readings, and trigger alerts on sustained high temperatures.

## List of provided decorators
### Script
- **[@Script](./docs/decorators/scripts/script.md)** — Base script decorator
### Events
- **[@OnEvent](./docs/decorators/events/on-event.md)** — React to an event by name or a condition
- **[Lifecycle: @OnInit(), @OnStart(), @OnStop()](./docs/decorators/events/lifecycle.md)** — React to an event by name or a condition
- **[@Schedule](./docs//decorators/events/schedule.md)** — Trigger events at specific time
### Utility
- **[@Inject](./docs/decorators/utility/inject.md)** — Enable simple cross scripts call
- **[@OnlyIf](./docs/decorators/utility/only-if.md)** — Add further restriction on a event
- **[@Delay](./docs/decorators/utility/delay.md)** — Postpone the call to a triggered handle

## Main concepts
owlbrain‑core provides a framework for a script‑driven automations:

- **Scripts** are user-defined javascript classes to build their logic that reacts to events.
- **Integrations** connects to external system or extend the functionalities.
- An **event bus** centralizing events emitted by integrations and a **consumer** calling the event decorated methods when their conditions matches.
- **Event decorators** registered to the **consumer** and declaring which events their decorated method will be called upon

### The scripts
Scripts are the smallest unit of behavior.
They are simple TypeScript classes that react to events, perform work, and orchestrate integrations.

A script is:
- Instantiated by the runtime
- Activated by event decorators that declare what the script reacts to
- Isolated and modular, making it easy to reason about and test

If you checked-out the [owlbrain-starter](https://github.com/Armaell/owlbrain-starter) package you can find a default example in the `scripts/` folder:
```ts
import { Script, OnStart, OwlEvent } from "owlbrain-core";

@Script()
export class HelloWorld {
  @OnStart()
  async onStart(event: OwlEvent) {
    console.log("Hello world!");
  }
}
```
Scripts are long-lived, you can use it to hold state and information through events.
```ts
let count = 0
@OnEvent("motion.bedroom")
async onMotion(event: OwlEvent) {
  this.count++
  console.log("Bedroom motion count:", this.count)
}
```
Of course those state are not kept between restarts unless you ensure it yourself.
### The Event decorator
Event decorators are how scripts declare what they react to. They allow to easily react to events without having to bother with subscriptions. Everything comes pre-wired.

```ts
import { Script, OnEvent, OnStart, Logger } from "owlbrain-core"
import type { OwlEvent } from "owlbrain-core"

@Script()
class BedroomMorning {
    @OnEvent("time.07:00")
    async onMorning(event: OwlEvent) {
        // Turning light one gently to wake the occupant
    }

    @OnEvent("motion.bedroom")
    async onEarlyWake(event: OwlEvent) {
        // occupant woke-up early, opening the blinds
    }
}
```
This example is purely conceptual ; actual events will be provided by new event decorators from integrations. owlbrain-core by itself is actually a little bland.

### OwlEvent
All event decorators will pass along an event object, the OwlEvent is its most basic form.

It contains :
- **name**—the event identifier, can be any string
- **namespace**—an optional grouping that is generally the integration name origin. It prevent name collision

More specialized event type provided by integrations will contains more information.


### List the available decorators
Two methods :

You can either look at the [core](https://github.com/Armaell/owlbrain-core) or each integration documentation.

Or use the [ui](https://github.com/Armaell/owlbrain-ui) integration which launch a webpage compiling the documentation of all packages.\
The ui integration is defined by default in this starter package

### Integrations
Integrations are how OwlBrain connects to the outside world. They provide new event sources, new decorators, and optional services your scripts can use. Each integration plugs into the core at startup and extends what your automations can react to.

### Official integrations

- **[owlbrain-http](https://github.com/Armaell/owlbrain-http)** —  Allow to listen to http calls on your application
- **[owlbrain-homeassistant](https://github.com/Armaell/owlbrain-homeassistant)** —  Connect to Home Assistant
- **[owlbrain-ui](https://github.com/Armaell/owlbrain-ui)** —  Start a web application allowing to inspect scripts status and read a customized documentation of your app

### Enable an integration
Install it using npm or your preferred package manager.
```ts
import { OwlBrain } from "owlbrain-core";
import { HttpIntegration } from "owlbrain-http";

await OwlBrain.withIntegration(HttpIntegration({...})).run()
```
You can now use the event decorators provided by the integration.

By example with home assistant:
```ts
@EntityScript({ entity_id: "motion.bedroom" })
class LightAutomation {
  const dressingLight = lightEntity("light.dressing")

  @OnStateChange({ to: "on" })
  async onMotion(event: OwlEvent) {
    await this.dressingLight.turnOn()
  }
}
```

### Avoiding conflicts
Each integration has a **unique namespace**. While this is used to prevent mixing event name between two integrations, this an also be used two have multiple time the same integration.

By example if you want to open HTTP endpoints on multiple ports :
```ts
await OwlBrain
  .withIntegration(HttpIntegration({port: 80}, name: "http"))
  .withIntegration(HttpIntegration({port: 443}, name: "https"))
  .run()
```
Event will then be prefixed by the relevant namespace depending on their origin

## In Depth
The next sections are not necessary to use OwlBrain, but are useful for contributing to the core or writing integrations.
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

Method decorated by event decorators will be called by the event bus consumer.

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
