import { ZepClient } from '@getzep/zep-cloud';

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