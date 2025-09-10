// 動態載入 Azure 翻譯套件（若未安裝則以 mock 模式運行）
let AzureKeyCredential: any;
let TextTranslationClient: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@azure/ai-translation-text');
  AzureKeyCredential = mod.AzureKeyCredential;
  TextTranslationClient = mod.TextTranslationClient;
} catch (_) {
  // 套件未安裝時忽略，保持 mock 模式
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  confidence: number;
}

export class TranslationService {
  private client: any | null = null;

  constructor() {
    const translatorKey = process.env.AZURE_TRANSLATOR_KEY;
    const translatorRegion = process.env.AZURE_TRANSLATOR_REGION;

    if (translatorKey && translatorRegion && TextTranslationClient && AzureKeyCredential) {
      this.client = new TextTranslationClient(
        new AzureKeyCredential(translatorKey),
        translatorRegion
      );
    } else {
      console.warn('⚠️ Azure Translator 未配置，將使用模擬模式');
    }
  }

  /**
   * 翻譯單段文字
   */
  async translateText(
    text: string,
    fromLanguage: string = 'en',
    toLanguage: string = 'zh-Hans'
  ): Promise<TranslationResult> {
    if (!this.client) {
      return this.mockTranslation(text, fromLanguage, toLanguage);
    }

    try {
      const result = await this.client.translate([text], toLanguage, fromLanguage);
      const translation = result[0];

      return {
        originalText: text,
        translatedText: translation.translations[0].text,
        fromLanguage,
        toLanguage,
        confidence: translation.translations[0].confidence || 1.0
      };
    } catch (error) {
      console.error('翻譯錯誤:', error);
      throw error;
    }
  }

  /**
   * 批量翻譯文字
   */
  async translateMultipleTexts(
    texts: string[],
    fromLanguage: string = 'en',
    toLanguage: string = 'zh-Hans'
  ): Promise<TranslationResult[]> {
    if (!this.client) {
      return texts.map(text => this.mockTranslation(text, fromLanguage, toLanguage));
    }

    try {
      const result = await this.client.translate(texts, toLanguage, fromLanguage);

      return result.map((item: any, index: number) => ({
        originalText: texts[index],
        translatedText: item.translations[0].text,
        fromLanguage,
        toLanguage,
        confidence: item.translations[0].confidence || 1.0
      }));
    } catch (error) {
      console.error('批量翻譯錯誤:', error);
      throw error;
    }
  }

  /**
   * 檢測文字語言
   */
  async detectLanguage(text: string): Promise<string> {
    if (!this.client) {
      return 'en'; // 預設返回英語
    }

    try {
      const result = await this.client.detectLanguage([text]);
      return result[0].language;
    } catch (error) {
      console.error('語言檢測錯誤:', error);
      return 'en';
    }
  }

  /**
   * 支援的語言列表
   */
  getSupportedLanguages(): string[] {
    return [
      'en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'pt',
      'ru', 'ar', 'hi', 'th', 'vi', 'id', 'ms', 'tl', 'tr', 'pl', 'nl', 'sv',
      'da', 'no', 'fi', 'he', 'el', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl',
      'et', 'lv', 'lt', 'uk', 'sr', 'mk', 'bs', 'sq', 'mt', 'ga', 'cy', 'eu',
      'is', 'fo', 'kl'
    ];
  }

  /**
   * 模擬翻譯（用於開發測試）
   */
  private mockTranslation(
    text: string,
    fromLanguage: string,
    toLanguage: string
  ): TranslationResult {
    // 簡單的模擬翻譯邏輯
    const mockTranslations: { [key: string]: string } = {
      'Welcome to today\'s lecture': '歡迎參加今天的課程',
      'Let\'s start with the basics': '讓我們從基礎開始',
      'This is a test sentence': '這是一個測試句子',
      'Thank you for your attention': '感謝您的關注',
      'Please ask questions if you have any': '如果您有任何問題，請提出來'
    };

    // 查找完全匹配的翻譯
    const mockTranslation = mockTranslations[text] ||
      `翻譯: ${text} (${fromLanguage} → ${toLanguage})`;

    return {
      originalText: text,
      translatedText: mockTranslation,
      fromLanguage,
      toLanguage,
      confidence: 0.8
    };
  }
}

export default TranslationService;
