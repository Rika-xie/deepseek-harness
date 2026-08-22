/**
 * LayoutController: the cross-plugin panel-action face behind ctx.layout.
 * Panel geometry itself lives in the root entry's layout store (stores.ts);
 * the current-session selection lives with the runtime sessions service, and
 * the per-session active view dissolved into ui-conversation's session store
 * (its only consumer). What remains here is the contract other plugins'
 * apply worlds reach for panel transitions (sidebar toggle from ui-sidebar,
 * dock open/close/tab from ui-conversation and the rightbar plugin) — writes
 * stay inside the store's declared action set, delivered as the
 * registration's bound actions.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { createLayoutStore } from './stores.ts'

/** The layout store's bound action set (framework-baked, draft params peeled). */
export type PanelActions = BoundActions<ReturnType<typeof createLayoutStore>>

/**
 * The outward layout face (`ctx.layout`): the panel transitions other
 * plugins may trigger — and exactly what a test fake must supply. The
 * attachPanels wiring hook stays on the concrete class (root-entry assembly
 * only).
 */
export interface ILayout {
  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void
  /**
   * Open the right dock and activate the `details` tab. The legacy details
   * column is superseded by the dock's tool-details tab, so this name is
   * kept as the conversation-facing gesture that restores native tool cards.
   */
  openDetails(): void
  /** Close the right dock (the details tab lives inside it). */
  closeDetails(): void
  /** Open the additive docked right-sidebar column. */
  openRightSidebar(): void
  /** Close the additive docked right-sidebar column. */
  closeRightSidebar(): void
  /** Activate one right-dock tab by entry id. */
  setDockTab(tab: string): void
}

/** Cross-plugin panel-action face (ctx.layout). */
export class LayoutController implements ILayout {
  #panels: PanelActions | undefined

  /**
   * Adopt the root entry's bound store actions. Called from the root
   * registration's inject hook (a sanctioned assembly side effect), so the
   * face is live from the entry's first render; on entry re-register the
   * fresh actions overwrite the stale set.
   * @param actions - bound actions of the entry's layout store instance.
   */
  attachPanels(actions: PanelActions): void {
    this.#panels = actions
  }

  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void {
    this.#require().toggleSidebar()
  }

  /** Open the right dock and activate the `details` tab. */
  openDetails(): void {
    const panels = this.#require()
    panels.openRightSidebar()
    panels.setDockTab('details')
  }

  /** Close the right dock (the details tab lives inside it). */
  closeDetails(): void {
    this.#require().closeRightSidebar()
  }

  /** Open the additive docked right-sidebar column. */
  openRightSidebar(): void {
    this.#require().openRightSidebar()
  }

  /** Close the additive docked right-sidebar column. */
  closeRightSidebar(): void {
    this.#require().closeRightSidebar()
  }

  /** Activate one right-dock tab by entry id. */
  setDockTab(tab: string): void {
    this.#require().setDockTab(tab)
  }

  #require(): PanelActions {
    // Callers are UI gestures, which cannot fire before the root entry
    // rendered (the inject hook runs in its first render) — reaching this
    // unwired is a boot-order bug, not a race to tolerate.
    if (this.#panels === undefined) throw new Error('layout: panel actions not wired (root entry not mounted)')
    return this.#panels
  }
}
