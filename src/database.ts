export { openDatabase, saveData, loadData };

// generic indexedDB functions as suggested by Claude.

function openDatabase(dbName: string, storeName: string, version: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);
  
      request.onerror = () => {
        reject(request.error);
      };
  
      request.onsuccess = () => {
        resolve(request.result);
      };
  
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.createObjectStore(storeName, { keyPath: 'id' });
      };
    });
  }

  function saveData(db: IDBDatabase, storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
  
      request.onerror = () => {
        reject(request.error);
      };
  
      request.onsuccess = () => {
        resolve();
      };
    });
  }
  
  function loadData(db: IDBDatabase, storeName: string, id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
  
      request.onerror = () => {
        reject(request.error);
      };
  
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }