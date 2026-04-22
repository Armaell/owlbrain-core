# @Delay
This is a utility decorator.\
`@Delay()` postpones a method’s execution by a fixed number of milliseconds.

```ts
import { Script, OnEvent, Delay } from "owlbrain-core"

@Script()
class Example {

  @OnEvent("motion.bedroom")
  @Delay(2_000)
  async handleMotion(event) {
    // runs 2 seconds after the event
  }
}
```
