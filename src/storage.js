const DB_NAME = 'orbit-objectives'
const STORE_NAME = 'state'
const STATE_KEY = 'main'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadState() {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(STATE_KEY)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.warn('IndexedDB indisponible, fallback localStorage.', error)
    try { return JSON.parse(localStorage.getItem('orbit-state') || 'null') } catch { return null }
  }
}

export async function saveState(state) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(state, STATE_KEY)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (error) {
    console.warn('Sauvegarde IndexedDB impossible, fallback localStorage.', error)
    localStorage.setItem('orbit-state', JSON.stringify(state))
  }
}
