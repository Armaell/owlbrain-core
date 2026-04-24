# Logger
The logger provides a simple and unified per‑namespace logs. The Logger also share the concept of namespaces to easily understand who is currently logging.

## Use the logger
```ts
const logger = new Logger(["script", "my-super-script"])
logger.info("1,2,3")
```
## Configure levels visibility
Log levels cascade by namespace. The most specific match wins:
- `"core.eventbus"`
- `"core"`
- `""` (default)

Configured through:
```ts
OwlBrain.withLoggerLevels({
  "": "INFO",
  "core": "WARN",
  "core.eventbus": "DEBUG"
})
```
This allow precise control on logs content.
> [!WARNING]
> a DEBUG level on the core, or the event bus in particular can be useful for debugging, but it can also be very noisy
