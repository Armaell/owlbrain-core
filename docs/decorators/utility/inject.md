# @Inject
## Making a script injectable
A good way to allow cross-script calls is by injecting a script into another. This is enabled by the `injectableAs` parameter of the [@Script](../scripts/script.md) decorator, and the `@Inject` decorator.
```ts
@Script({ injectableAs: ["script", "my-super-script"] })
export class MySuperScript {
  // ...
}
```
Then you can retrieve it in another script:
```ts
@Script()
export class MyOtherScript {
  @Inject(["script", "my-super-script"])
  private superScript!: MySuperScript
}
