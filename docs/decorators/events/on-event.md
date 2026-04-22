# @OnEvent
event decorators connects a method to the event bus. This is the main way scripts respond to triggers coming from integrations, schedules, sensors, or other scripts.

Integrations will provide more complex events decorators tailored with for their own events, and typed with own OwlEvent objects.

`@OnEvent` is the most basic, and you will probably only use it if you want a dirty peek at the event bus.
## Usage
There is two way to use it:

Only passing the event name, and it will trigger on any event with the same name:
```ts
@OnEvent("motion.bedroom")
async onBedroomMotion(event) {
  // run when motion is detected in the bedroom
}
```

Using a filter function for more advanced cases:
```ts
@OnEvent(event => event.namespace === "http" && event.name === "webhook")
async onWebhook(event) {
  // react only to specific HTTP webhook events
}
```
