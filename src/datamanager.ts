import { WebPageDiacritizationData, DiacritizationElement, ElementAttributes } from "./types";
import { openDatabase, saveData, loadData } from "./database";
import { calculateHash } from "./utils";

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
        // Implementation to retrieve data from IndexedDB
        const data = await loadData(this.db, "diacritizations_msa" , url);
        if (data) {
            return data as WebPageDiacritizationData;
        } else {
            return undefined;
        }
    }
  
    async updateWebPageData(id: string, data: WebPageDiacritizationData): Promise<void> {
        // Implementation to update data in IndexedDB
        if (this.db) {
            try {
                await saveData(this.db, "diacritizations_msa", {id, data});
            } catch (error) {
                console.error(error);
                throw new Error("Failed to save data" + error);
            }
        } else {
            throw new Error("Database not initialized")
        };
    }
  
    // async getElementData(pageId: string, elementHash: string): Promise<DiacritizationElement | undefined> {
    //     // Retrieve specific element data
    // }
  
    async updateElementData(pageId: string, elementHash: string, data: DiacritizationElement): Promise<void> {
        // Update element data in the database
        if (!this.db) {
            throw new Error("Database not initialized");
        }
        const pageData = await this.getWebPageData(pageId);
        if (pageData) {
            pageData.elements[elementHash] = data;
            // eventually will want to rewrite to do multiple updates at once.
            await saveData(this.db, "diacritizations_msa", pageData.elements);
        } else {        
            throw new Error("Page data not found");
        }
 
    }
  
    // async removeElement(pageId: string, elementHash: string): Promise<void> {
    //     // Remove an element from storage
    // }
  
    // async removeWebPage(url: string): Promise<void> {
    //     // Remove all data related to a webpage
    // }
  
    async calculateContentSignature(elements: NodeListOf<Element>): Promise<string> {
        // Calculate a content signature by hashing
        const textContent = Array.from(elements).map((element) => element.textContent).join("");
        const signature = await calculateHash(textContent);
        return signature;
        
    }
  
    serializeStructureMetadata(elements: NodeListOf<Element>): string {
        // Serialize page structure metadata
        // This can be done by converting the elements to a JSON string without the text content
        const serialized: ElementAttributes[] = Array.from(elements).map((element) => {
            return {
                tagName: element.tagName,
                id: element.id,
                className: element.className,
            };
        });
        return JSON.stringify(serialized);
    }
  }