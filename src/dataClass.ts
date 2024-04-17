import { calculateHash } from "./utils";

export interface PageMetadata {
    pageUrl: string,
    lastVisited: Date,
    contentSignature: string,
    structuralMetadata: {[key: string]: any},
}

export interface TextNode {
    elementId: string;
    index: number
    text: string;
}

export interface NodeHashDict {
    [nodeHash: string]: TextNode
}

// it's like, not inconvceivable that you just transmit the entire webpage into background.ts
export class WebPageDiacritizationData {
    public original?: NodeHashDict
    private diacritizations?: {
        [method: string]: NodeHashDict
    };
    
    constructor(
        public id: string,
        public metadata: PageMetadata,
    ) {};

    static async build(
        metadata: PageMetadata,
    ) {
        const id = await calculateHash(metadata.pageUrl)
        return new WebPageDiacritizationData(id, metadata)      
    };
    
    async createOriginal(websiteText: TextNode[]) {
    const textlist = websiteText.map((textNode) => (textNode.elementId + textNode.text))
    const nodeHashes = await calculateHash(textlist)
  
    const original = nodeHashes.reduce((dict, nodeHash, index) => {
      dict[nodeHash] = websiteText[index];
      return dict;
    }, {} as NodeHashDict);
    this.original = original;
    };


    async addDiacritization(diacritizedText: TextNode[], method: string) {
        if (this.original === undefined) {
            throw new Error('Original text not created yet.');
        } else {
            const original = this.original;
            const diacritization: NodeHashDict = {};
            Object.keys(original).forEach((key, index) => {
                diacritization[key] = diacritizedText[index];
            });
            console.log('Adding diacritization:', diacritization);
            if (this.diacritizations === undefined) {
                this.diacritizations = { [method]: diacritization };
            } else {
                this.diacritizations[method] = diacritization;
            }
        }
    }

    getDiacritization(method: string): NodeHashDict {
        if (this.diacritizations === undefined) {
            throw new Error('Diacritizations not created yet.');
        } else {
            const diacritization = this.diacritizations[method];
            if (diacritization === undefined) {
                throw new Error('Diacritization method not found.');
            } else {
                return diacritization;
            }
        }
    }
    updateLastVisited(date: Date): void {
        this.metadata.lastVisited = date
    }

}