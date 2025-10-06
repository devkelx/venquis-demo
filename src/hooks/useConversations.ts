import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const CONVERSATION_KEY = 'venquis_current_conversation_id';

export interface Conversation {
  id: string;
  title?: string;
  user_id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  last_activity?: string;
  metadata?: any;
  timeGroup?: 'today' | 'yesterday' | 'last7days' | 'older';
}

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  // Load conversation from localStorage on mount
  useEffect(() => {
    const loadPersistedConversation = async () => {
      const conversationId = localStorage.getItem(CONVERSATION_KEY);
      if (conversationId && user) {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .eq('user_id', user.id)
            .single();

          if (data && !error) {
            setCurrentConversation(data);
          } else {
            localStorage.removeItem(CONVERSATION_KEY);
          }
        } catch (error) {
          console.error('Error loading persisted conversation:', error);
          localStorage.removeItem(CONVERSATION_KEY);
        }
      }
    };

    if (user) {
      loadPersistedConversation();
    }
  }, [user]);

  const getTimeGroup = (date: string): 'today' | 'yesterday' | 'last7days' | 'older' => {
    const now = new Date();
    const createdAt = new Date(date);
    const diffTime = now.getTime() - createdAt.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (diffDays < 1) return 'today';
    if (diffDays < 2) return 'yesterday';
    if (diffDays < 7) return 'last7days';
    return 'older';
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, user_id, session_id, created_at, updated_at, title')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }) as any;

      if (error) throw error;

      const conversationsWithTimeGroup = data?.map(conv => ({
        ...conv,
        timeGroup: getTimeGroup(conv.created_at)
      })) || [];

      setConversations(conversationsWithTimeGroup);

      // Set first conversation as current if none selected
      if (!currentConversation && conversationsWithTimeGroup.length > 0) {
        setCurrentConversation(conversationsWithTimeGroup[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async (title?: string): Promise<Conversation | null> => {
    if (!user) return null;

    try {
      const conversationId = crypto.randomUUID();
      const sessionId = conversationId; // Use same ID for both

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          id: conversationId,
          user_id: user.id,
          session_id: sessionId
        })
        .select()
        .single();

      if (error) {
        console.error('Database error creating conversation:', error);
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      const newConversation = {
        ...data,
        timeGroup: getTimeGroup(data.created_at) as 'today' | 'yesterday' | 'last7days' | 'older'
      };

      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      
      // Persist to localStorage
      localStorage.setItem(CONVERSATION_KEY, conversationId);

      return newConversation;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Failed to Create Conversation",
        description: error.message || "Unable to start a new conversation. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateConversationTitle = async (id: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title: newTitle })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === id ? { ...conv, title: newTitle } : conv
        )
      );
      
      // Update current conversation if it's the one being renamed
      if (currentConversation?.id === id) {
        setCurrentConversation(prev => prev ? { ...prev, title: newTitle } : null);
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
      toast({
        title: "Error",
        description: "Failed to update conversation title",
        variant: "destructive"
      });
    }
  };

  const deleteConversation = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      const updatedConversations = conversations.filter(conv => conv.id !== id);
      setConversations(updatedConversations);
      
      if (currentConversation?.id === id) {
        setCurrentConversation(updatedConversations.length > 0 ? updatedConversations[0] : null);
        localStorage.removeItem(CONVERSATION_KEY);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
    }
  };

  // Update localStorage when currentConversation changes
  useEffect(() => {
    if (currentConversation) {
      localStorage.setItem(CONVERSATION_KEY, currentConversation.id);
    }
  }, [currentConversation]);

  useEffect(() => {
    fetchConversations();
  }, [user]);

  return {
    conversations,
    currentConversation,
    setCurrentConversation,
    loading,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    refetch: fetchConversations
  };
};