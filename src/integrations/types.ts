import type { LifecycleHooks } from "../core/lifecycle"

export type OwlIntegrationFactory = () => OwlIntegrationInterface

export interface OwlIntegrationInterface extends LifecycleHooks {
	name: string
}
