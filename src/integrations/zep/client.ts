import { ZepClient } from '@getzep/zep-cloud';

// Get Zep configuration from environment
const getZepConfig = () => {
  // In production, these will be available from edge functions
  // For client-side usage, we'll use the edge function wrapper
  return {
    apiKey: '', // Will be set in edge functions
    apiUrl: ''  // Will be set in edge functions
  };
};

// Create Zep client (primarily for edge functions)
export const createZepClient = (apiKey: string, apiUrl?: string) => {
  return new ZepClient({
    apiKey,
    ...(apiUrl && { apiUrl })
  });
};

// Memory message format for Zep
export interface ZepMemoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  metadata?: {
    message_type?: 'text' | 'file' | 'button_click';
    file_url?: string;
    button_action?: string;
    conversation_id?: string;
    contract_data?: any;
  };
}

// Session metadata structure
export interface ZepSessionMetadata {
  user_id: string;
  conversation_id: string;
  created_at: string;
  updated_at: string;
}

// Contract context structure for memory
export interface ZepContractContext {
  contract_id: string;
  file_name: string;
  file_url: string;
  extracted_terms?: any;
  analysis_summary?: string;
  key_findings?: string[];
  uploaded_at: string;
}

// Utility functions for memory management
export const createMemoryMessage = (
  role: 'user' | 'assistant',
  content: string,
  metadata?: ZepMemoryMessage['metadata']
): ZepMemoryMessage => ({
  role,
  content,
  timestamp: new Date().toISOString(),
  metadata
});

export const createContractContext = (
  contractId: string,
  fileName: string,
  fileUrl: string,
  extractedTerms?: any
): ZepContractContext => ({
  contract_id: contractId,
  file_name: fileName,
  file_url: fileUrl,
  extracted_terms: extractedTerms,
  uploaded_at: new Date().toISOString()
});

// Format conversation history for AI context
export const formatMemoryForAI = (messages: ZepMemoryMessage[]): string => {
  return messages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
};

// Extract contract terms from analysis
export const extractContractTerms = (analysisText: string) => {
  // This would contain logic to parse AI analysis and extract structured data
  // For now, return basic structure
  return {
    key_terms: [],
    parties: [],
    dates: [],
    financial_terms: [],
    obligations: []
  };
};