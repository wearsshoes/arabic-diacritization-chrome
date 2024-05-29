import { calculateHash } from "./utils";
export interface TextNode {
    elementId: string;
    text: string;
}
export class WebpageDiacritizationData {
    diacritizations: {
        [method: string]: TextNode[]
    } = {}

    private constructor(
        public id: string,
        public pageUrl: string,
        public lastVisited: Date,
        public contentSignature: string,
    ) { }

    static async build(
        pageUrl: string,
        contentSignature: string
    ) {
        const id = await calculateHash(pageUrl)
        const lastVisited = new Date();
        return new WebpageDiacritizationData(id, pageUrl, lastVisited, contentSignature)
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
        this.lastVisited = date
    }

    // Deserialization method
    static fromJSON(json: string): WebpageDiacritizationData {
        const parsedData = JSON.parse(json);
        const { id, pageUrl, lastVisited, contentSignature, diacritizations } = parsedData;
        const instance = new WebpageDiacritizationData(id, pageUrl, lastVisited, contentSignature) ;
        instance.diacritizations = diacritizations;
        return instance;
    }
}