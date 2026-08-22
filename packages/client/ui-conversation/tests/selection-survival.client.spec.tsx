// @vitest-environment jsdom
/**
 * Tool-detail selection persistence: ui-conversation keeps the selected
 * tool-detail target in a per-session snapshot store (the single source
 * shared by ChatView and DetailsPanel). This spec pins the persistence and
 * per-session isolation contract that `apply`'s selectionFor uses; the
 * ChatView/DetailsPanel injection wiring is covered by apply-inject.spec.tsx.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

const KEY = (id: string) => `dsh.conversation.selection.${id}`

beforeEach(() => {
  localStorage.clear()
})

describe('selection snapshot store', () => {
  it('persists the selected target per session and rehydrates a fresh store', () => {
    const first = createSnapshotStore<{ turnSeq: number; callId: string } | null>(null, {
      persist: { name: KEY('s1') },
    })
    first.set({ turnSeq: 3, callId: 'c1' })

    const again = createSnapshotStore<{ turnSeq: number; callId: string } | null>(null, {
      persist: { name: KEY('s1') },
    })
    expect(again.getSnapshot()).toEqual({ turnSeq: 3, callId: 'c1' })
  })

  it('sessions are isolated by storage key', () => {
    const one = createSnapshotStore<{ turnSeq: number; callId: string } | null>(null, {
      persist: { name: KEY('s1') },
    })
    const two = createSnapshotStore<{ turnSeq: number; callId: string } | null>(null, {
      persist: { name: KEY('s2') },
    })
    one.set({ turnSeq: 1, callId: 'a' })
    two.set({ turnSeq: 9, callId: 'z' })
    expect(one.getSnapshot()).toEqual({ turnSeq: 1, callId: 'a' })
    expect(two.getSnapshot()).toEqual({ turnSeq: 9, callId: 'z' })
  })

  it('clearing the storage key resets a later store (session-death cleanup)', () => {
    const store = createSnapshotStore<{ turnSeq: number } | null>(null, {
      persist: { name: KEY('dead') },
    })
    store.set({ turnSeq: 1 })
    localStorage.removeItem(KEY('dead'))

    const reborn = createSnapshotStore<{ turnSeq: number } | null>(null, {
      persist: { name: KEY('dead') },
    })
    expect(reborn.getSnapshot()).toBeNull()
  })
})
