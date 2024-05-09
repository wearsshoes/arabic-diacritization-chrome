import { calculateHash } from "./utils";
import { ElementAttributes } from "./types";

export interface PageMetadata {
    pageUrl: string,
    lastVisited: Date,
    contentSignature: string,
    structuralMetadata: { [key: string]: ElementAttributes },
}

export interface TextNode {
    elementId: string;
    index: number
    text: string;
}

export interface NodeHashDict {
    [nodeHash: string]: TextNode
}

export interface Diacritizations {
    [method: string]: NodeHashDict
}

export class WebPageDiacritizationData {
    diacritizations: Diacritizations = {};

    private constructor(
        public id: string,
        public metadata: PageMetadata,
    ) { }

    static async build(
        metadata: PageMetadata,
    ) {
        const id = await calculateHash(metadata.pageUrl)
        return new WebPageDiacritizationData(id, metadata)
    }

    async createOriginal(websiteText: TextNode[]) {
        const textlist = websiteText.map((textNode) => (textNode.elementId + textNode.text))
        const nodeHashes = await calculateHash(textlist)

        const original = nodeHashes.reduce((dict, nodeHash, index) => {
            dict[nodeHash] = websiteText[index];
            return dict;
        }, {} as NodeHashDict);
        this.diacritizations = { ['original']: original };
    }

    async addDiacritization(diacritizedText: TextNode[], method: string) {
        if (this.diacritizations['original'] === undefined) {
            throw new Error('Original text not created yet.');
        } else {
            const original = this.diacritizations['original'];
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

    getDiacritization(method: string): TextNode[] {
        if (this.diacritizations === undefined) {
            throw new Error('Diacritizations not created yet.');
        } else {
            const diacritization = this.diacritizations[method];
            if (diacritization === undefined) {
                throw new Error('Diacritization method not found.');
            } else {
                const acc: TextNode[] = [];
                Object.keys(diacritization).forEach((key, index) => {
                    acc[index] = diacritization[key];
                });
                return acc;
            }
        }
    }

    updateLastVisited(date: Date): void {
        this.metadata.lastVisited = date
    }

    // Deserialization method
    static fromJSON(json: string): WebPageDiacritizationData {
        const parsedData = JSON.parse(json);
        const { id, metadata, diacritizations } = parsedData;
        const instance = new WebPageDiacritizationData(id, metadata);
        instance.diacritizations = diacritizations;
        return instance;
    }
}