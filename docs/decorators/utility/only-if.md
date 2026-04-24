# @OnlyIf
This is a utility decorator.\
`@OnlyIf()` allows to apply another restriction to an event handler call.
```ts
import { Script, OnEvent, Delay } from "owlbrain-core"

@Script()
class HighTempAlertScript {

  readonly limit = 5

  @OnEvent("some-event")
  @OnlyIf((event, script) => event.data > script.limit)
  async onLimitReached(event) {
    // method only called if event data is higher than the script limit of 5
  }
}
```
