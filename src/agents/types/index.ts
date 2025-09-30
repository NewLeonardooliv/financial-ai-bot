export interface Agent {
  id: string;
  name: string;
  description: string;
  execute(_input: any): Promise<any>;
}

export interface AgentContext {
  sessionId: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface AgentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface LLMProvider {
  name: string;
  generate(_prompt: string, _options?: LLMOptions): Promise<string>;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
  diff?: string;
}

export interface ReleaseNotesRequest {
  commits: CommitInfo[];
  appName: string;
  language: Language;
  platform: 'playstore' | 'appstore' | 'generic';
  format: 'markdown' | 'html' | 'plain';
}

export interface CommitAnalysisResult {
  commits: CommitInfo[];
  summary: {
    totalCommits: number;
    features: number;
    fixes: number;
    improvements: number;
    breakingChanges: number;
  };
  categories: {
    features: CommitInfo[];
    fixes: CommitInfo[];
    improvements: CommitInfo[];
    breakingChanges: CommitInfo[];
  };
  impact: 'low' | 'medium' | 'high';
}

export interface ReleaseNotesResult {
  language: string;
  languageCode: string;
  content: string;
  summary: string;
  categories: {
    features: string[];
    fixes: string[];
    improvements: string[];
  };
  generatedAt: Date;
}

export type Language =
  | 'english'
  | 'spanish'
  | 'french'
  | 'german'
  | 'portuguese'
  | 'italian'
  | 'russian'
  | 'chinese'
  | 'japanese'
  | 'korean';
export interface TextTranslatorRequest {
  languages: Language[];
  text: string;
  defaultLanguage: Language;
}

export interface TextTranslatorResult {
  translations: {
    language: Language;
    text: string;
    languageCode: string;
  }[];
}

export interface AppConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  app: {
    name: string;
    defaultLanguage: string;
    logLevel: string;
  };
  git: {
    repoPath: string;
    branch: string;
  };
  output: {
    format: string;
    directory: string;
  };
}

export interface GrainQualityAnalyzerRequest {
  text: string;
}

export interface GrainQualityAnalyzerResult {
  quality: string;
}

export interface ReportAnalyzerRequest {
  data: {
    reports?: string[];
    charts?: string[];
    metrics?: Record<string, unknown>;
    rawData?: unknown[];
  };
  analysisType?: 'summary' | 'detailed' | 'trend' | 'comparison';
  language?: Language;
}

export interface ReportAnalyzerResult {
  summary: string;
  analysis: {
    keyFindings: string[];
    trends: string[];
    insights: string[];
    recommendations: string[];
  };
  metrics: {
    processedReports: number;
    processedCharts: number;
    dataPoints: number;
  };
}

export interface ExpenseExtractorRequest {
  text: string;
  language?: string;
}

export interface ExpenseExtractorResult {
  expenses: Array<{
    description: string;
    amount: number;
    category: string;
    currency: string;
    confidence: number;
  }>;
  summary: {
    totalExpenses: number;
    totalAmount: number;
    categories: string[];
  };
  extractedAt: Date;
  confidence: number;
}
