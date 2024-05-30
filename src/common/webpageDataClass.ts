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

    createOriginal(websiteText: TextNode[]) {
        this.diacritizations = { ['original']: websiteText };
    }

    updateDiacritization(updates: TextNode[], method: string) {
        if (this.diacritizations[method] === undefined) {
            this.diacritizations[method] = updates;
        } else {
            const textNodes = new Map(this.diacritizations[method].map(textNode => [textNode.elementId, textNode]));
            updates.forEach(textNode => textNodes.set(textNode.elementId, textNode));
            this.diacritizations[method] = Array.from(textNodes.values());
        }
    }

    getDiacritization(method: string): TextNode[] {
        if (this.diacritizations === undefined) {
            return [];
        } else {
            return this.diacritizations[method];
        }
    }

    getDiacritizationMethods(): string[] {
        return Object.keys(this.diacritizations);
    }

    updateLastVisited(date: Date): void {
        this.lastVisited = date.toISOString();
    }

}