export class ExtensionOptions {
    [key: string]: unknown;

    // General Options
    public autoDiacritize: ('off' | 'fullDiacritics' | 'arabizi') = 'off';
    public apiKeys: { name: string, key: string, savedAt: string }[] = [];
    public activeKey: string = '';
    public activeModel: string = 'haiku';
    public rejectMalformed: boolean = false;
    public escalateModel: boolean = false;
    public maxTries: number = 3;
    public maxChars: number = 750;

    // Custom Prompt Options
    public addColors: boolean = false;
    public useCustomPrompt: boolean = false;
    public savedPrompts: { name: string, text: string, tokenLength: number }[] = defaultPrompts;
    public selectedPrompt: { name: string, text: string, tokenLength: number } = defaultPrompts[0];
    public checkTokenLength: boolean = false;

    // Local Data Options

    // Transliteration Options
    public transliterationMethod: string = 'phonetic';
    public baseScheme: string = 'arabizi';
    public separateDigraphs: boolean = false;
    public useSunMoon: boolean = true;
    public modifyTaaMarbuutaLLM: boolean = true;
    public hideCaseEndingsLLM: boolean = true;
    public capitalizeProperNounsLLM: boolean = true;

    // API Usage Options

    // State Management
    public language: string = 'en';

}

const defaultPrompts = [
    {
        "name": "Full Diacritics",
        "text": "Add full diacritics (taškīl) to the Arabic text based on pronunciation and grammar. Maintain the same number of '|' delimiters and leave non-Arabic text, numbers, and symbols unchanged. Example:\nInput: وصل |John| إلى مطار |JFK| الساعة (|10:30| صباحا)| يوم الاثنين|.[1]|\nOutput: وَصَلَ |John| إِلَى مَطَارِ |JFK| السَّاعَةَ (|10:30| صَبَاحًا)| يَوْمَ الِاثْنَيْنِ|.[1]|",
        "tokenLength": 182
    }
]
