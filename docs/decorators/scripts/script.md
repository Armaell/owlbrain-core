# @Script
A script decorator marks a class as an automation script. OwlBrain discovers these classes at startup, instantiates them once, and wires their event‑decorated methods so they can react to triggers.

Integrations may provide more specialized script decorators. `@Script` is the most basic version of script decorator

```ts
import { Script, OnStart, OwlEvent } from "owlbrain-core"

@Script()
export class HelloWorld {
  @OnStart()
  async onStart(event: OwlEvent) {
    console.log("Hello world!")
  }
}
```
> [!TIP]
> You can use a script decorator multiple time on the same class, it will be instantiated as many time. Useful if you want to run multiple script with the same behavior but maybe with difference script configuration
