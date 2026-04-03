export function createGlobalSingleton<T>(key: string, factory: () => T): T {
	const globalKey = Symbol.for(key)
	const globalAny = globalThis as any

	if (!globalAny[globalKey]) {
		globalAny[globalKey] = factory()
	}

	return globalAny[globalKey] as T
}
