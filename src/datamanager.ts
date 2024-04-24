import { WebPageDiacritizationData } from "./dataClass";
import { chromeStorageGet, chromeStorageSet } from "./utils";

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

    async getWebPageData(urlHash: string): Promise<WebPageDiacritizationData | undefined> {
        if (!this.db) {
          throw new Error("Database not initialized");
        }
        try {
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
          throw new Error("Data not found" + error);
        }
      }
    
      async updateWebPageData(urlHash: string, data: WebPageDiacritizationData): Promise<void> {
        if (!this.db) {
          throw new Error("Database not initialized");
        } else {
          try {
            const pageData = await this.getWebPageData(urlHash);
            const serializedData = JSON.stringify(data);
            await saveData(this.db, "diacritizations_msa", { id: data.id, data: serializedData });
            this.updateStorageSize(pageData ?? '', 'remove');
            this.updateStorageSize(data, 'add');
          } catch (error) {
            console.error(error);
            throw new Error("Failed to save data" + error);
          }
        }
      }
    
    // when called by an add/remove function, update storage size in chrome storage
    async updateStorageSize(obj: Object, action: 'add' | 'remove'): Promise<void> {
        const objectSize = getSizeInBytes(obj);

        try {
            const { storageSize = 0 } = await chromeStorageGet<number>('storageSize');
            const updatedSize = action === 'add' ? storageSize + objectSize : storageSize - objectSize;
            await chromeStorageSet({ storageSize: updatedSize });
        } catch (error) {
            console.error(error);
            throw new Error(`Error updating storage size: ${error}`);
        }
    }


    // async removeWebPage(url: string): Promise<void> {
    //     // Remove all data related to a webpage
    // } 

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

function loadData<T>(db: IDBDatabase, storeName: string, id: string): Promise<any> {
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

function getSizeInBytes(obj: Object) {
    return new Blob([JSON.stringify(obj)]).size;
}