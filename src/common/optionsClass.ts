export interface Prompt {
    name: string;
    text: string;
    tokenLength: number;
    default: boolean;
}

export interface APIUsageRecord {
    date: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
}
export class ExtensionOptions {
    [key: string]: unknown;

    // General Options
    public autoDiacritize: ('off' | 'fullDiacritics' | 'arabizi') = 'off';
    public transliterationMethod: string = 'ala-lc';
    public apiKeys: { name: string, key: string, savedAt: string }[] = [];
    public activeKey: string = '';
    public activeModel: string = 'haiku';
    public escalateModel: boolean = false;
    public maxTries: number = 3;
    public maxChars: number = 750;
    public maxConcurrent: number = 3;
    public waitTime: number = 1500;

    // Custom Prompt Options
    public useCustomPrompt: boolean = false;
    public savedPrompts: Prompt[] = defaultPrompts;
    public activePromptIndex: number = 0;
    public checkTokenLength: boolean = false;

    // Local Data Options
    // public lastSort

    // Transliteration Options
    // public baseScheme: string = 'arabizi';
    // public separateDigraphs: boolean = false;
    // public useSunMoon: boolean = true;
    // public modifyTaaMarbuutaLLM: boolean = true;
    // public hideCaseEndingsLLM: boolean = true;
    // public capitalizeProperNounsLLM: boolean = true;

    // API Usage Options
    public usageRecords: APIUsageRecord[] = [];

    // State Management
    public language: string = 'en';

}

const defaultPrompts = [
    {
        "name": "Full Diacritics (Default)",
        "text": "Add full diacritics (taškīl) to the Arabic text based on pronunciation and grammar. Maintain the same number of '|' delimiters and leave non-Arabic text, numbers, and symbols unchanged. Example:\nInput: وصل |John| إلى مطار |JFK| الساعة (|10:30| صباحا)| يوم الاثنين|.[1]|\nOutput: وَصَلَ |John| إِلَى مَطَارِ |JFK| السَّاعَةَ (|10:30| صَبَاحًا)| يَوْمَ الِاثْنَيْنِ|.[1]|",
        "tokenLength": 182,
        "default": true
    },
];