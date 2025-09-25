// Constants and configuration
export const TZ = "Asia/Kuala_Lumpur";

export const STORAGE_KEYS = {
  users: "wc_users",
  homestays: "wc_homestays",
  homestayGeneralKnowledge: "wc_homestay_general_knowledge",
  conversationMemory: "wc_conversation_memory",
  faqs: "wc_faqs",
  logs: "wc_logs",
  settings: "wc_settings",
  session: "wc_session",
};

export const PAGES = ["Dashboard", "Messages", "Homestay Data", "FAQ", "Chat Tester", "User Management", "Settings", "Logs"];

export const SYNONYMS = [
  ["check-in","入住","办理入住"],
  ["check-out","退房","离店"],
  ["wifi","wi‑fi","无线","上网"],
  ["parking","停车","车位"],
  ["deposit","押金","按金"],
  ["late","延迟","加时"],
];

export const defaultSettings = {
  alwaysOn: true, // 24/7 operation
  businessHours: { 
    tz: TZ, 
    start: "09:00", 
    end: "18:00",
    monday: { start: "09:00", end: "18:00", enabled: true },
    tuesday: { start: "09:00", end: "18:00", enabled: true },
    wednesday: { start: "09:00", end: "18:00", enabled: true },
    thursday: { start: "09:00", end: "18:00", enabled: true },
    friday: { start: "09:00", end: "18:00", enabled: true },
    saturday: { start: "09:00", end: "18:00", enabled: true },
    sunday: { start: "09:00", end: "18:00", enabled: true }
  },
  fallbackReply: "Sorry, I couldn't understand your question. We will have someone contact you soon.",
  // AI settings
  answerMode: "AI", // AI or Simple
  aiProvider: "OpenAI", // Options: OpenAI / Google / AzureOpenAI etc.
  embeddingModel: "text-embedding-3-small", // OpenAI embedding model
  chatModel: "gpt-3.5-turbo", // OpenAI chat model
  apiKeyEnc: "", // Base64 encrypted storage
  similarityThreshold: 0.3, // Similarity threshold for FAQ matching
  preferredLang: "auto", // zh / en / auto
  confidenceThreshold: 0.6,
  maxTokens: 512,
  temperature: 0.2,
  busyMode: false,
  // AI Rules
  aiRules: {
    languageDetection: true,
    autoLanguageResponse: true,
    languageRules: [
      {
        id: "chinese_rule",
        name: "Chinese Response Rule",
        description: "Reply in Chinese when customer speaks Chinese",
        triggerLanguages: ["zh", "chinese", "中文"],
        responseLanguage: "zh",
        enabled: true
      },
      {
        id: "english_rule", 
        name: "English Response Rule",
        description: "Reply in English for English, Malay, and Indian languages",
        triggerLanguages: ["en", "english", "malay", "malaysia", "indian", "hindi", "tamil"],
        responseLanguage: "en",
        enabled: true
      }
    ],
    responseTemplates: {
      zh: {
        greeting: "您好！欢迎咨询我们的民宿服务。",
        fallback: "抱歉，我没有理解您的问题。我们会尽快安排人员联系您。",
        busy: "【目前咨询量较大，可能会有轻微延迟】"
      },
      en: {
        greeting: "Hello! Welcome to our homestay service. How can I help you today?",
        fallback: "Sorry, I couldn't understand your question. We will have someone contact you soon.",
        busy: "[We are experiencing high volume, there may be slight delays]"
      }
    }
  },
  // WhatsApp Business Configuration
  whatsapp: {
    phoneNumber: '',
    apiToken: '',
    webhookToken: '',
    webhookUrl: '',
    autoReply: true,
    responseDelay: 1,
    maxMessagesPerHour: 1000
  }
};

export const demoUserSeed = [{ email: "admin@demo.com", role: "Admin", password_hash: "__TO_BE_HASHED__" }];

// AI Model Options
export const AI_MODEL_OPTIONS = {
  OpenAI: {
    embedding: [
      { value: "text-embedding-3-small", label: "text-embedding-3-small", description: "Latest, most efficient (recommended)" },
      { value: "text-embedding-3-large", label: "text-embedding-3-large", description: "Highest quality, more expensive" },
      { value: "text-embedding-ada-002", label: "text-embedding-ada-002", description: "Older model, cheapest option" }
    ],
    chat: [
      { value: "gpt-3.5-turbo", label: "gpt-3.5-turbo", description: "Fast, cost-effective (recommended)" },
      { value: "gpt-3.5-turbo-16k", label: "gpt-3.5-turbo-16k", description: "Same as above, longer context" },
      { value: "gpt-4", label: "gpt-4", description: "Highest quality, more expensive" },
      { value: "gpt-4-turbo", label: "gpt-4-turbo", description: "Latest GPT-4, balanced performance" },
      { value: "gpt-4o", label: "gpt-4o", description: "Most advanced, multimodal capabilities" }
    ]
  },
  Google: {
    embedding: [
      { value: "text-embedding-004", label: "text-embedding-004", description: "Google's latest embedding model" },
      { value: "text-multilingual-embedding-002", label: "text-multilingual-embedding-002", description: "Multilingual support" }
    ],
    chat: [
      { value: "gemini-pro", label: "gemini-pro", description: "Google's flagship model" },
      { value: "gemini-pro-vision", label: "gemini-pro-vision", description: "With image understanding" }
    ]
  },
  AzureOpenAI: {
    embedding: [
      { value: "text-embedding-ada-002", label: "text-embedding-ada-002", description: "Azure OpenAI embedding model" },
      { value: "text-embedding-3-small", label: "text-embedding-3-small", description: "Latest embedding model" }
    ],
    chat: [
      { value: "gpt-35-turbo", label: "gpt-35-turbo", description: "Azure OpenAI GPT-3.5" },
      { value: "gpt-4", label: "gpt-4", description: "Azure OpenAI GPT-4" },
      { value: "gpt-4-turbo", label: "gpt-4-turbo", description: "Azure OpenAI GPT-4 Turbo" }
    ]
  }
};
