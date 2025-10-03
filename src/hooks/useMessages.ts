import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: 'user' | 'assistant' | 'file';
  agent_used?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  action_buttons?: any;
  metadata?: any;
  created_at: string | null;
  // UI-specific properties
  type?: 'user' | 'ai' | 'file';
  fileName?: string;
  actions?: Array<{
    id: string;
    label: string;
    variant?: 'default' | 'outline' | 'destructive';
    icon?: React.ReactNode;
  }>;
}

export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform database messages to UI format
      const transformedMessages: Message[] = data?.map(msg => ({
        ...msg,
        sender_type: msg.sender_type as 'user' | 'assistant' | 'file',
        type: msg.sender_type === 'user' ? 'user' as const :
              msg.sender_type === 'file' ? 'file' as const : 'ai' as const,
        fileName: msg.file_name || undefined,
        actions: (msg.action_buttons && Array.isArray(msg.action_buttons)) ? msg.action_buttons as Array<{
          id: string;
          label: string;
          variant?: 'default' | 'outline' | 'destructive';
          icon?: React.ReactNode;
        }> : undefined
      })) || [];

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveUserMessage = async (content: string): Promise<Message | null> => {
    if (!conversationId) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content,
          sender_type: 'user'
        })
        .select()
        .single();

      if (error) throw error;

      const newMessage: Message = {
        ...data,
        type: 'user',
        sender_type: 'user'
      };

      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (error) {
      console.error('Error saving user message:', error);
      toast({
        title: "Error",
        description: "Failed to save message",
        variant: "destructive"
      });
      return null;
    }
  };


  const saveFileMessage = async (
    fileName: string, 
    fileUrl: string,
    content?: string
  ): Promise<Message | null> => {
    if (!conversationId) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: content || `Uploaded file: ${fileName}`,
          sender_type: 'file',
          file_name: fileName,
          file_url: fileUrl
        })
        .select()
        .single();

      if (error) throw error;

      const newMessage: Message = {
        ...data,
        type: 'file',
        sender_type: 'file',
        fileName
      };

      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (error) {
      console.error('Error saving file message:', error);
      toast({
        title: "Error",
        description: "Failed to save file upload",
        variant: "destructive"
      });
      return null;
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  return {
    messages,
    loading,
    saveUserMessage,
    saveFileMessage,
    refetch: fetchMessages
  };
};