import { calculateHash } from "./utils";
export interface TextNode {
    elementId: string;
    text: string;
}
export class WebpageDiacritizationData {
    private diacritizations: {
        [method: string]: TextNode[]
    } = {}

    private constructor(
        public id: string,
        public pageUrl: string,
        public lastVisited: string,
        public contentSignature: string,
    ) { }

    static async build(
        pageUrl: string,
        contentSignature: string
    ) {
        const id = await calculateHash(pageUrl)
        const lastVisited = new Date().toISOString();
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
        this.lastVisited = date.toISOString();
    }

}