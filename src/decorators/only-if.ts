/**
 * Apply further restriction before calling an event handler
 * @example
 * .@Script()
 *  class HighTempAlertScript {
 *    readonly limit = 5
 *
 *   .@OnEvent("some-event")
 *   .@OnlyIf((event, script) => event.data > script.limit)
 *    onLimitReached(event) {
 *      //
 *    }
 * }
 */
export function OnlyIf<
	Value extends (this: any, event: any, ...args: any[]) => any
>(predicate: (event: Parameters<Value>[0], self: any) => boolean) {
	return function (value: Value) {
		return function wrapped(
			this: any,
			event: Parameters<Value>[0],
			...args: Parameters<Value>[1][]
		) {
			if (predicate(event, this)) {
				return value.call(this, event, ...args)
			}
		} as Value
	}
}
