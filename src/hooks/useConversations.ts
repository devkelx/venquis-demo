import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  title: string;
  user_id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  last_activity: string;
  metadata: any;
  timeGroup?: 'today' | 'yesterday' | 'last7days' | 'older';
}

export const useConversations = () => {
  const { user } = useAuth();
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
        .order('last_activity', { ascending: false });

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
      const sessionId = crypto.randomUUID();
      const conversationTitle = title || 'New Analysis';

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          title: conversationTitle,
          user_id: user.id,
          session_id: sessionId,
          last_activity: new Date().toISOString(),
          metadata: {}
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

      const updatedConversations = conversations.filter(conv => conv.id !== id);
      setConversations(updatedConversations);
      
      if (currentConversation?.id === id) {
        setCurrentConversation(updatedConversations.length > 0 ? updatedConversations[0] : null);
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