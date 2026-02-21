import type { Component } from 'vue';

const registry = new Map<string, Component>();

/**
 * Register a Vue component as a named CEF module/page.
 * Call this as the default export of every module's root .vue file setup.
 *
 * @example
 * // HelloWorld.vue
 * export default createModule('hello-world', defineComponent({ ... }))
 */
export function createModule(name: string, component: Component): Component {
  if (registry.has(name)) {
    console.warn(`[ModuleRegistry] Module "${name}" is already registered. Skipping.`);
    return component;
  }
  registry.set(name, component);

  if (import.meta.env.DEV) {
    console.log(`[ModuleRegistry] Registered module: "${name}"`);
  }

  return component;
}

/** Retrieve a registered module component by page name. Returns undefined if not found. */
export function getModule(name: string | null): Component | undefined {
  if (!name) return undefined;
  return registry.get(name);
}
