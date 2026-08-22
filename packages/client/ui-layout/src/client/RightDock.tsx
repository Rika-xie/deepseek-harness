/**
 * RightDock: the tabbed container for the additive `shell.right-sidebar`
 * slot. It owns no business state of its own — the active tab id lives in
 * the layout store, the registered entries/labels come from the slots
 * ledger, and the active entry is dispatched through the parent's
 * `renderSlot` binding with `RenderOpts.only`. This keeps the dock generic:
 * any plugin can contribute a tab by registering a `shell.right-sidebar`
 * entry with an `id` and (optionally) a `label`.
 */
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { resolveSlotLabel, type PropsRenderSlots, type PropsStore, type StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import type { createLayoutStore } from './stores.ts'
import css from './RightDock.module.css'

/** Minimal slots-ledger projection consumed by the dock (stable entries array). */
export interface DockEntriesSource {
  subscribe(fn: () => void): () => void
  getSnapshot(): readonly StoredEntry[]
}

export interface RightDockProps {
  useStore: PropsStore<ReturnType<typeof createLayoutStore>>['useStore']
  actions: PropsStore<ReturnType<typeof createLayoutStore>>['actions']
  renderSlot: PropsRenderSlots<'shell.right-sidebar'>['renderSlot']
  dockEntries: DockEntriesSource
}

interface DockTab {
  id: string
  label: string
}

export function RightDock({ useStore, actions, renderSlot, dockEntries }: RightDockProps): ReactNode {
  const entries = useSyncExternalStore(dockEntries.subscribe, dockEntries.getSnapshot)
  const activeDockTab = useStore(s => s.activeDockTab)
  const open = useStore(s => s.rightSidebar > 0)
  const dockRef = useRef<HTMLDivElement | null>(null)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Closed dock must not receive focus; `inert` is a DOM property that the
  // installed @types/react version does not expose as a JSX attribute.
  useEffect(() => {
    if (dockRef.current !== null) dockRef.current.inert = !open
  }, [open])

  // Raw ledger entries are sorted by priority then order; keeping the first
  // occurrence per id gives the same winner semantics as entriesOfSlot without
  // returning a fresh array from uSES getSnapshot.
  const tabs = useMemo<DockTab[]>(() => {
    const seen = new Set<string>()
    const result: DockTab[] = []
    for (const entry of entries) {
      const id = entry.options.id
      if (id === undefined || seen.has(id)) continue
      seen.add(id)
      result.push({ id, label: resolveSlotLabel(entry.options.label) ?? id })
    }
    return result
  }, [entries])

  // A stale active id (entry not yet registered or later removed) falls back
  // to the first available tab without rewriting the store preference.
  const active = tabs.some(tab => tab.id === activeDockTab) ? activeDockTab : (tabs[0]?.id ?? '')
  const activeIndex = tabs.findIndex(tab => tab.id === active)

  const focusTab = (index: number): void => {
    const next = (index + tabs.length) % tabs.length
    const nextTab = tabs[next]
    if (nextTab !== undefined) actions.setDockTab(nextTab.id)
    tabRefs.current[next]?.focus()
  }

  const onTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (activeIndex === -1) return
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusTab(activeIndex + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusTab(activeIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusTab(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusTab(tabs.length - 1)
    }
  }

  return (
    <div ref={dockRef} className={css.dock} data-dock data-open={open || undefined} aria-hidden={!open || undefined}>
      {tabs.length > 0 ? (
        <>
          <div
            className={css.tabs}
            role="tablist"
            aria-label="右侧栏"
            onKeyDown={onTabListKeyDown}
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[index] = el }}
                type="button"
                role="tab"
                id={`right-dock-tab-${tab.id}`}
                aria-controls="right-dock-panel"
                aria-selected={tab.id === active}
                tabIndex={tab.id === active ? 0 : -1}
                data-active={tab.id === active || undefined}
                className={tab.id === active ? css.tabActive : css.tab}
                onClick={() => { actions.setDockTab(tab.id) }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div
            className={css.body}
            role="tabpanel"
            id="right-dock-panel"
            aria-labelledby={`right-dock-tab-${active}`}
            tabIndex={0}
          >
            {renderSlot('shell.right-sidebar', {}, { only: active })}
          </div>
        </>
      ) : (
        <div className={css.body}>
          <div className={css.empty}>右侧栏暂无内容</div>
        </div>
      )}
    </div>
  )
}
