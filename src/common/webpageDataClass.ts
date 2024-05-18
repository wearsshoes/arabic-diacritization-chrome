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
    text: string;
}

export class WebpageDiacritizationData {
    diacritizations: {
        [method: string]: TextNode[]
    } = {};

    private constructor(
        public id: string,
        public metadata: PageMetadata,
    ) { }

    static async build(
        metadata: PageMetadata,
    ) {
        const id = await calculateHash(metadata.pageUrl)
        return new WebpageDiacritizationData(id, metadata)
    }

    async createOriginal(websiteText: TextNode[]) {
        this.diacritizations = { ['original']: websiteText };
    }

    async addDiacritization(diacritizedText: TextNode[], method: string) {
        this.diacritizations[method] = diacritizedText;
    }

    getDiacritization(method: string): TextNode[] {
        if (this.diacritizations === undefined) {
            throw new Error('Diacritizations not created yet.');
        } else {
            return this.diacritizations[method];
        }
    }

    updateLastVisited(date: Date): void {
        this.metadata.lastVisited = date
    }

    // Deserialization method
    static fromJSON(json: string): WebpageDiacritizationData {
        const parsedData = JSON.parse(json);
        const { id, metadata, diacritizations } = parsedData;
        const instance = new WebpageDiacritizationData(id, metadata);
        instance.diacritizations = diacritizations;
        return instance;
    }
}