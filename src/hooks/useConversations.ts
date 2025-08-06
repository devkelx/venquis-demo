import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useZepMemory } from '@/hooks/useZepMemory';

export interface Conversation {
  id: string;
  title: string;
  user_id: string;
  zep_session_id: string;
  created_at: string;
  updated_at: string;
  timeGroup?: 'today' | 'yesterday' | 'last7days' | 'older';
}

export const useConversations = () => {
  const { user } = useAuth();
  const { initializeSession } = useZepMemory();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

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
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

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
      const sessionId = `session_${Date.now()}_${user.id}`;
      const conversationTitle = title || `Chat ${new Date().toLocaleDateString()}`;

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          title: conversationTitle,
          user_id: user.id,
          zep_session_id: sessionId
        })
        .select()
        .single();

      if (error) throw error;

      const newConversation = {
        ...data,
        timeGroup: getTimeGroup(data.created_at) as 'today' | 'yesterday' | 'last7days' | 'older'
      };

      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);

      // Initialize Zep session
      await initializeSession(sessionId);

      return newConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateConversationTitle = async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', id);

      if (error) throw error;

      setConversations(prev => 
        prev.map(conv => 
          conv.id === id ? { ...conv, title } : conv
        )
      );
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to update conversation title",
        variant: "destructive"
      });
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== id));
      
      if (currentConversation?.id === id) {
        const remaining = conversations.filter(conv => conv.id !== id);
        setCurrentConversation(remaining.length > 0 ? remaining[0] : null);
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