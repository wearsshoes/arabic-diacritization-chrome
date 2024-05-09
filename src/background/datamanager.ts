import { WebpageDiacritizationData } from "../common/webpageDataClass";
import { calculateHash } from "../common/utils";

export class DiacritizationDataManager {
  private static instance: DiacritizationDataManager;
  private db: IDBDatabase | null = null;

  private constructor() {
    // Initialize the database
    openDatabase("WebpageDiacritizations", "diacritizations_msa", 1)
      .then((db) => {
        this.db = db;
      })
      .catch((error) => {
        console.error("Error opening database", error);
      });
  }

  public static getInstance(): DiacritizationDataManager {
    if (!this.instance) {
      this.instance = new DiacritizationDataManager();
    }
    return this.instance;
  }

  async getWebpageData(url: string): Promise<WebpageDiacritizationData | undefined> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      const urlHash = await calculateHash(url);
      console.log("Getting data for", urlHash);
      const serializedData = await loadData<string>(this.db, "diacritizations_msa", urlHash);
      if (serializedData) {
        console.log("Data found", serializedData);
        return WebpageDiacritizationData.fromJSON(serializedData);
      } else {
        return undefined;
      }
    } catch (error) {
      console.error(error);
      throw new Error("Data not found. " + error);
    }
  }

  async updateWebpageData(url: string, data: WebpageDiacritizationData): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    } else {
      try {
        const urlHash = await calculateHash(url);
        const serializedData = JSON.stringify(data);
        await saveData(this.db, "diacritizations_msa", { item: serializedData, key: urlHash });
        return Promise.resolve();
      } catch (error) {
        throw new Error("Failed to save data" + error);
      }
    }
  }


  // Remove all data related to a webpage
  async clearWebpageData(url: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    } else {
      try {
        const urlHash = await calculateHash(url);
        console.log("Clearing data for", urlHash);
        await clearData(this.db, "diacritizations_msa", urlHash);
        return Promise.resolve();
      } catch (error) {
        throw new Error("Failed to clear data" + error);
      }
    }
  }

  async clearAllData(): Promise<void> {
    try {
      deleteDatabase("WebpageDiacritizations");
      console.log("Database cleared, reinitializing...");
      openDatabase("WebpageDiacritizations", "diacritizations_msa", 1)
      return Promise.resolve();
    }
    catch (error) {
      throw new Error("Failed to clear database" + error);
    }
  }
}

// Generic indexedDB functions as suggested by Claude.

function openDatabase(dbName: string, storeName: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.createObjectStore(storeName, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveData(db: IDBDatabase, storeName: string, { item, key }: { item: string, key: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearData(db: IDBDatabase, storeName: string, dataId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(dataId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function loadData<T>(db: IDBDatabase, storeName: string, id: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteDatabase(database: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(database);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}