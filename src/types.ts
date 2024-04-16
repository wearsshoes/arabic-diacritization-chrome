// Definition of types used in the application
import { calculateHash } from "./utils";

export interface ElementAttributes {
  tagName: string;
  id?: string;
  className?: string; // space separated list of classes, not an array
}

export interface Prompt {
  name: string;
  text: string;
}

export interface TransliterationDict {
  [key: string]: string[];
}

export interface SysPromptTokenCache {
  hash: string;
  model: string;
  tokens: number;
}

export interface PageMetadata {
  lastVisited: Date,
  contentSignature: string,
  structuralMetadata: string,
}

export interface TextNode {
  elementId: string;
  index: number
  text: string;
}

export interface NodeHashlist {
  [nodeHash: string]: TextNode
}

// it's like, not inconvceivable that you just transmit the entire webpage into background.ts
export class WebPageDiacritizationData {
  public original?: NodeHashlist[];
  public diacritizations?: {
    [method: string]: NodeHashlist[]
  }[];

  constructor(  
    public pageUrl: string,
    public metadata: PageMetadata,
    websiteText: TextNode[]
    ) { 
      this.createOriginal(websiteText)
    }
          
  async createOriginal(websiteText: TextNode[]) {
    // aaa this calls calculateHash like a thousand times 
    const nodeHashes = await Promise.all(websiteText.map( (textNode) => {
      const hash = calculateHash(textNode.text)
      return hash
    }));

    this.original = websiteText.map((textNode, index) => {
      const nodeHash = nodeHashes[index]
      return {[nodeHash]: textNode}
    });
  }

  async addDiacritization(diacritizedText: TextNode[], method: string) {
    if (this.original === undefined) {
      throw new Error('Original text not created yet.');
    } else {
      const original = this.original;
      const diacritization: NodeHashlist[] = Object.keys(original).map((key, index) => (
        {[key]: diacritizedText[index]}
      )); 

      if (this.diacritizations === undefined) {
        this.diacritizations = [{[method]: diacritization}];
      } else {
        this.diacritizations.push({method: diacritization});
      }
    }
  }

  getDiacritization(method: string): NodeHashlist[] {
    if (this.diacritizations === undefined) {
      throw new Error('Diacritizations not created yet.');
    } else {
      const diacritization = this.diacritizations.find((diacritization) => diacritization[method]);
      if (diacritization === undefined) {
        throw new Error('Diacritization method not found.');
      } else {
        return diacritization[method];
      }
    }
  }
  updateLastVisited(date: Date): void {
      this.metadata.lastVisited = date
  }

}