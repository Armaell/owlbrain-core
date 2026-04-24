import type { LifecycleState } from "./core/lifecycle"

export class OwlError extends Error {
	public readonly namespace?: string[]
	constructor(args: {
		namespace?: string[]
		message: string
		cause?: unknown
	}) {
		super(args.message, { cause: args.cause })
		Object.setPrototypeOf(this, new.target.prototype)
		this.name = new.target.name
		this.namespace = args.namespace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor)
		}
	}
}

export class OwlBrainIsSingleUseError extends OwlError {
	constructor(args: { namespace?: string[] }) {
		super({
			namespace: args.namespace,
			message: `Only one OwlBrainCore instance can exist at a time.`
		})
	}
}

export class NotEnoughWorkersError extends OwlError {
	constructor(args: { namespace?: string[] }) {
		super({
			namespace: args.namespace,
			message: `There must be at least 1 worker`
		})
	}
}

export class IncorrectStateError extends OwlError {
	public readonly expected: LifecycleState
	public readonly current: LifecycleState
	constructor(args: {
		namespace?: string[]
		expected: LifecycleState
		current: LifecycleState
	}) {
		super({
			namespace: args.namespace,
			message: `OwlBrain is in an incorrect state, expect ${args.expected} but is currently ${args.current}. This usually means a component attempted to start before initialization completed.`
		})
		this.expected = args.expected
		this.current = args.current
	}
}

export class LifecycleTransitionError extends OwlError {
	public readonly from: LifecycleState
	public readonly to: LifecycleState
	constructor(args: {
		namespace?: string[]
		from: LifecycleState
		to: LifecycleState
		cause: unknown
	}) {
		super({
			namespace: args.namespace,
			message: `Error while transitioning from state ${args.from} to ${args.to}`,
			cause: args.cause
		})
		this.from = args.from
		this.to = args.to
	}
}

export class TokenNotFoundError extends OwlError {
	public readonly token: string
	constructor(args: { namespace?: string[]; token: string }) {
		super({
			namespace: args.namespace,
			message: `Container token ${args.token} not found`
		})
		this.token = args.token
	}
}

export class TokenAlreadyExistError extends OwlError {
	public readonly token: string
	constructor(args: { namespace?: string[]; token: string }) {
		super({
			namespace: args.namespace,
			message: `Container token ${args.token} not found`
		})
		this.token = args.token
	}
}

export class IntegrationConflictError extends OwlError {
	public readonly integrationName: string
	constructor(args: { namespace?: string[]; integrationName: string }) {
		super({
			namespace: args.namespace,
			message: `Two integrations with the name ${args.integrationName} have been declared. Either remove one or override the name of one of them`
		})
		this.integrationName = args.integrationName
	}
}

export class ScriptInstantiationError extends OwlError {
	public readonly token: string
	constructor(args: { namespace?: string[]; name: string; cause: unknown }) {
		super({
			namespace: args.namespace,
			message: `An error occurred while trying to instantiate the script ${args.name}`,
			cause: args.cause
		})
		this.token = args.name
	}
}

export class RestrictedIntegrationNameError extends OwlError {
	public readonly integrationName: string
	constructor(args: {
		namespace?: string[]
		integrationName: string
		cause?: unknown
	}) {
		super({
			namespace: args.namespace,
			message: `The namespace ${args.integrationName} is restricted for integrations. Select another`,
			cause: args.cause
		})
		this.integrationName = args.integrationName
	}
}

export class InvalidDecoratorPlacementError extends OwlError {
	public readonly decoratedName: string | symbol
	public readonly decoratorName: string | symbol | undefined
	public readonly actualKind: string
	public readonly expectedKind: string
	constructor(args: {
		namespace?: string[]
		decoratorName?: string
		decoratedName: string | symbol
		actualKind: string
		expectedKind: string
		cause?: unknown
	}) {
		super({
			namespace: args.namespace,
			message: `A${args.decoratorName ? `@${args.decoratorName} decorator` : ""} ${args.decoratedName.toString()} can only be used on ${args.expectedKind} but was applied to a ${args.actualKind}`,
			cause: args.cause
		})
		this.decoratorName = args.decoratorName
		this.decoratedName = args.decoratedName
		this.actualKind = args.actualKind
		this.expectedKind = args.expectedKind
	}
}

export class InvalidScheduleError extends OwlError {
	constructor(args: { text: string; type: "text" | "cron"; cause?: unknown }) {
		super({
			message: `The given ${args.type} schedule "${args.text}" is not a valid schedule. Please check later.js documentation at https://breejs.github.io/later/parsers.html#${args.type}`,
			cause: args.cause
		})
	}
}
