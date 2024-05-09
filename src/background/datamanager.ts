import { WebPageDiacritizationData } from "../common/webpageDataClass";
import { calculateHash } from "../common/utils";
import { AppResponse } from "../common/types";

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

  async getWebPageData(url: string): Promise<WebPageDiacritizationData | undefined> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    try {
      const urlHash = await calculateHash(url);
      console.log("Getting data for", urlHash);
      const serializedData = await loadData<string>(this.db, "diacritizations_msa", urlHash);
      if (serializedData) {
        console.log("Data found", serializedData);
        return WebPageDiacritizationData.fromJSON(serializedData);
      } else {
        return undefined;
      }
    } catch (error) {
      console.error(error);
      throw new Error("Data not found. " + error);
    }
  }

  async updateWebPageData(url: string, data: WebPageDiacritizationData): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    } else {
      try {
        const urlHash = await calculateHash(url);
        const serializedData = JSON.stringify(data);
        await saveData(this.db, "diacritizations_msa", { item: serializedData, key: urlHash });
      } catch (error) {
        console.error(error);
        throw new Error("Failed to save data" + error);
      }
    }
  }


  // Remove all data related to a webpage
  async clearWebPageData(url: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    } else {
      try {
        const urlHash = await calculateHash(url);
        console.log("Clearing data for", urlHash);
        await clearData(this.db, "diacritizations_msa", urlHash );
        return Promise.resolve();
      } catch (error) {
        console.error(error);
        throw new Error("Failed to clear data" + error);
      }
    }
  }

  async clearAllData(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        deleteDatabase("WebpageDiacritizations");
        console.log("Database cleared, reinitializing...");
        openDatabase("WebpageDiacritizations", "diacritizations_msa", 1)
        resolve();
      } catch (error) {
        console.error(error);
        reject(new Error("Failed to clear database" + error));
      }
    });
  }
}

// Generic indexedDB functions as suggested by Claude.

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

function saveData(db: IDBDatabase, storeName: string, { item, key }: { item: string, key: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item, key);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

function clearData(db: IDBDatabase, storeName: string, dataId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(dataId);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

function loadData<T>(db: IDBDatabase, storeName: string, id: string): Promise<T> {
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

function deleteDatabase(database: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(database);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}