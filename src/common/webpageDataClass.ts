import { calculateHash } from "./utils";
export interface PageMetadata {
    pageUrl: string,
    lastVisited: Date,
    contentSignature?: string,
}
export interface TextNode {
    elementId: string;
    text: string;
}
export class WebpageDiacritizationData {
    diacritizations: {
        [method: string]: Set<TextNode>
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

    async createOriginal(websiteText: Set<TextNode>) {
        this.diacritizations = { ['original']: new Set(websiteText) };
    }

    async addDiacritization(diacritizedText: Set<TextNode>, method: string) {
        this.diacritizations[method] = new Set(diacritizedText);
    }

    getDiacritization(method: string): Set<TextNode> {
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