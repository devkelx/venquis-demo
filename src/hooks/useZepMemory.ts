import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ZepMemoryMessage, ZepContractContext } from '@/integrations/zep/client';

export const useZepMemory = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Initialize session via edge function (optional - doesn't block conversation creation)
  const initializeSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zep-memory', {
        body: { 
          action: 'initialize-session',
          session_id: sessionId 
        }
      });

      if (error) {
        console.warn('Zep memory initialization failed:', error.message);
        return false; // Don't throw error, just return false
      }

      return true;
    } catch (error) {
      console.warn('Zep memory initialization failed:', error);
      // Don't show toast or block conversation creation
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add message to Zep memory via edge function
  const addMemoryMessage = useCallback(async (
    sessionId: string,
    message: ZepMemoryMessage
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zep-memory', {
        body: {
          action: 'add-memory',
          session_id: sessionId,
          message
        }
      });

      if (error) {
        throw new Error(`Failed to add memory: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error adding memory:', error);
      // Don't show toast for memory errors to avoid spam
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get memory for session via edge function
  const getMemory = useCallback(async (
    sessionId: string,
    limit: number = 50
  ): Promise<ZepMemoryMessage[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zep-memory', {
        body: { 
          action: 'get-memory',
          session_id: sessionId, 
          limit 
        }
      });

      if (error) {
        throw new Error(`Failed to get memory: ${error.message}`);
      }

      return data.messages || [];
    } catch (error) {
      console.error('Error getting memory:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search memory via edge function
  const searchMemory = useCallback(async (
    sessionId: string,
    query: string,
    limit: number = 10
  ): Promise<ZepMemoryMessage[]> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zep-memory', {
        body: { 
          action: 'search-memory',
          session_id: sessionId, 
          query, 
          limit 
        }
      });

      if (error) {
        throw new Error(`Failed to search memory: ${error.message}`);
      }

      return data.messages || [];
    } catch (error) {
      console.error('Error searching memory:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Store contract context via edge function
  const storeContractContext = useCallback(async (
    sessionId: string,
    context: ZepContractContext
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zep-memory', {
        body: { 
          action: 'store-context',
          session_id: sessionId, 
          context 
        }
      });

      if (error) {
        throw new Error(`Failed to store context: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error storing context:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    initializeSession,
    addMemoryMessage,
    getMemory,
    searchMemory,
    storeContractContext
  };
};