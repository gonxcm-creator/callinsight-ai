/** IndexedDB persistence for analysis history (idb wrapper). */
/** Stores transcript + analysis; supports list, get, clear. */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { HistoryRecord } from '../engine/types'

interface CallInsightDB extends DBSchema {
  analyses: {
    key: string
    value: HistoryRecord
    indexes: { 'by-date': number }
  }
}

const DB_NAME = 'callinsight-ai'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<CallInsightDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<CallInsightDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('analyses', { keyPath: 'id' })
        store.createIndex('by-date', 'createdAt')
      },
    })
  }
  return dbPromise
}

export async function saveAnalysis(record: HistoryRecord): Promise<void> {
  const db = await getDb()
  await db.put('analyses', record)
}

export async function getAnalysis(id: string): Promise<HistoryRecord | undefined> {
  const db = await getDb()
  return db.get('analyses', id)
}

export async function listAnalyses(): Promise<HistoryRecord[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('analyses', 'by-date')
  return all.reverse()
}

export async function clearAnalyses(): Promise<void> {
  const db = await getDb()
  await db.clear('analyses')
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
