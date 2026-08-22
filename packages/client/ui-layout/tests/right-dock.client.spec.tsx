// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import { RightDock, type DockEntriesSource } from '@deepseek-ai/dsh-client-ui-layout/src/client/RightDock.tsx'
import { createLayoutStore } from '@deepseek-ai/dsh-client-ui-layout/src/client/stores.ts'

function hookOf<T>(inst: { subscribe: (fn: () => void) => () => void; getSnapshot: () => T }) {
  return function useSelector<S>(sel: (s: T) => S): S { return sel(useSyncExternalStore(inst.subscribe, inst.getSnapshot)) }
}

function entry(id: string, label?: string): StoredEntry {
  return { component: null, options: label === undefined ? { id } : { id, label } }
}

function mount(entries: readonly StoredEntry[], initialTab = '') {
  const instance = createLayoutStore().create()
  instance.actions.openRightSidebar() // tabs are only accessible while the dock is open
  if (initialTab !== '') instance.actions.setDockTab(initialTab)
  const calls: Array<{ only?: string }> = []
  const renderSlot = ((_key: string, _owner: object, opts?: { only?: string }) => {
    if (opts?.only !== undefined) calls.push({ only: opts.only })
    else calls.push({})
    return <div data-testid="dock-body" />
  }) as never
  const source: DockEntriesSource = {
    subscribe: () => () => {},
    getSnapshot: () => entries,
  }
  const utils = render(
    <RightDock
      useStore={hookOf(instance)}
      actions={instance.actions}
      renderSlot={renderSlot}
      dockEntries={source}
    />,
  )
  return { instance, calls, ...utils }
}

afterEach(cleanup)

describe('RightDock', () => {
  it('renders an empty state and does not dispatch renderSlot when no entries exist', () => {
    const { calls, getByText } = mount([])
    expect(getByText('右侧栏暂无内容')).toBeTruthy()
    expect(calls).toHaveLength(0)
  })

  it('falls back to the first tab when the stored active id is stale', () => {
    const { instance, calls, getByRole } = mount([entry('files', '文件'), entry('details', '详情')], 'ghost')
    expect(instance.getSnapshot().activeDockTab).toBe('ghost') // preference untouched
    expect(getByRole('tab', { name: '文件' }).getAttribute('aria-selected')).toBe('true')
    expect(calls[0]).toEqual({ only: 'files' })
  })

  it('switching tabs writes the store and re-dispatches only the new active tab', () => {
    const { instance, calls, getByRole } = mount([entry('files', '文件'), entry('details', '详情')], 'files')
    act(() => { fireEvent.click(getByRole('tab', { name: '详情' })) })
    expect(instance.getSnapshot().activeDockTab).toBe('details')
    expect(calls.at(-1)).toEqual({ only: 'details' })
    expect(getByRole('tab', { name: '详情' }).getAttribute('aria-selected')).toBe('true')
  })

  it('dedupes shadowed ids using the first (winning) entry', () => {
    const { getAllByRole, queryByRole } = mount([
      entry('files', '文件'),
      entry('files', '文件 Shadow'),
      entry('details', '详情'),
    ], 'files')
    expect(getAllByRole('tab')).toHaveLength(2)
    expect(queryByRole('tab', { name: '文件 Shadow' })).toBeNull()
    expect(getAllByRole('tab')[0]?.textContent).toBe('文件')
  })
})
