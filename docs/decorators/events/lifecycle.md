# Lifecycle @OnInit, @OnStart, @OnStop
These decorators let a script react to OwlBrain’s own lifecycle events. They allow to setup code, start logic when the engine is ready, or clean up before shutdown.

- `@OnInit()` — runs when the script is first registered and initialized, before the engine starts and integrations start producing events.
- `@OnStart()` — runs once OwlBrain and integrations have fully started and is ready to handle events.
- `@OnStop()` — runs when OwlBrain begins shutting down, useful for cleanup or saving state.

Each decorator maps to an internal lifecycle event emitted under the `core.lifecycle` namespace
