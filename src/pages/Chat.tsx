import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";

import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
const Chat = () => {
  const {
    user
  } = useAuth();
  const {
    currentConversation,
    setCurrentConversation
  } = useConversations();
  const {
    messages,
    loading,
    saveUserMessage,
    saveFileMessage,
    refetch: refetchMessages
  } = useMessages(currentConversation?.id || null);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Clear states when no conversation is selected
  useEffect(() => {
    if (!currentConversation) {
      setIsTyping(false);
      setIsProcessing(false);
      setIsUploading(false);
      setUploadProgress(0);
      setShouldAutoScroll(true);
    }
  }, [currentConversation]);

  // Auto-scroll functionality
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping, shouldAutoScroll]);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 100;
    setShouldAutoScroll(isNearBottom);
  };
  const handleSendMessage = async (message: string) => {
    if (!currentConversation) {
      toast({
        title: "No conversation",
        description: "Please create a new conversation first",
        variant: "destructive"
      });
      return;
    }
    setIsProcessing(true);
    try {
      // Save user message
      const userMessage = await saveUserMessage(message);
      if (!userMessage) return;

      setIsTyping(true);

      // Call n8n webhook via edge function with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const { data, error } = await supabase.functions.invoke('contract-analysis', {
            body: {
              conversation_id: currentConversation.id,
              session_id: currentConversation.session_id,
              message_content: message,
              message_type: 'text_message',
              timestamp: new Date().toISOString()
            }
          });
          
          if (error) throw error;

          // Messages are automatically saved by the edge function, so just refresh
          await refetchMessages();
          break; // Success, exit retry loop
        } catch (aiError: any) {
          retryCount++;
          console.error(`AI processing error (attempt ${retryCount}):`, aiError);
          
          if (retryCount < maxRetries) {
            // Wait 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            // Final retry failed
            toast({
              title: "AI Processing Error",
              description: "Failed to process your message after multiple attempts. Please try again.",
              variant: "destructive"
            });
          }
        }
      }
      
      setIsTyping(false);
      setIsProcessing(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      setIsProcessing(false);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };
  const handleFileUpload = async (file: File) => {
    if (!currentConversation) {
      toast({
        title: "No conversation",
        description: "Please create a new conversation first",
        variant: "destructive"
      });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    try {
      // Upload file to Supabase storage with user folder structure
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;
      const { data, error } = await supabase.storage.from('contracts').upload(filePath, file);
      setUploadProgress(100);
      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(filePath);

      // Save file message
      await saveFileMessage(file.name, urlData.publicUrl);

      toast({
        title: "Upload successful",
        description: "Analyzing document..."
      });

      // Trigger AI analysis immediately with retry logic
      setIsTyping(true);
      setIsUploading(false); // Stop showing upload progress
      setUploadProgress(0);
      
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke('contract-analysis', {
            body: {
              conversation_id: currentConversation.id,
              session_id: currentConversation.session_id,
              message_content: `Contract uploaded: ${file.name}`,
              message_type: 'file_upload',
              file_url: urlData.publicUrl,
              file_name: file.name,
              timestamp: new Date().toISOString()
            }
          });
          
          if (analysisError) throw analysisError;

          // Messages are automatically saved by the edge function, so just refresh  
          await refetchMessages();
          break; // Success, exit retry loop
        } catch (analysisError: any) {
          retryCount++;
          console.error(`Analysis error (attempt ${retryCount}):`, analysisError);
          
          if (retryCount < maxRetries) {
            // Wait 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            // Final retry failed
            toast({
              title: "Analysis Error",
              description: `Failed to analyze ${file.name} after multiple attempts. Please try again.`,
              variant: "destructive"
            });
          }
        }
      }
      
      setIsTyping(false);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.name}. Please try again.`,
        variant: "destructive"
      });
      setIsTyping(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  const handleButtonClick = async (buttonId: string, buttonLabel: string) => {
    if (!currentConversation) return;

    // Save button click as user message
    await saveUserMessage(`Clicked: ${buttonLabel}`);

    setIsTyping(true);

    // Process button action through edge function with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const { data, error } = await supabase.functions.invoke('contract-analysis', {
          body: {
            conversation_id: currentConversation.id,
            session_id: currentConversation.session_id,
            message_content: buttonLabel,
            message_type: 'button_action',
            button_action: buttonId,
            timestamp: new Date().toISOString()
          }
        });
        
        if (error) throw error;

        // Messages are automatically saved by the edge function, so just refresh
        await refetchMessages();
        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        console.error(`Button action error (attempt ${retryCount}):`, error);
        
        if (retryCount < maxRetries) {
          // Wait 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // Final retry failed
          toast({
            title: "Processing Error",
            description: "Failed to process your request after multiple attempts. Please try again.",
            variant: "destructive"
          });
        }
      }
    }
    
    setIsTyping(false);
  };
  return <div className="h-screen flex bg-background overflow-hidden">
      <ChatSidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        onNewChat={() => {
          setShouldAutoScroll(true);
        }} 
        onConversationSelect={conversation => {
          setCurrentConversation(conversation);
          setShouldAutoScroll(true);
        }} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {currentConversation ? (
          <div className="flex-1 flex flex-col h-full">
            <ScrollArea className="flex-1 px-6 pt-6" onScrollCapture={handleScroll} ref={scrollAreaRef}>
              <div className="max-w-4xl mx-auto pb-4">
                {loading && messages.length === 0 ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-6">
                    <h2 className="text-2xl font-semibold mb-4 text-foreground">Contract Analysis Assistant</h2>
                    <p className="text-muted-foreground mb-6">
                      Upload contract documents or ask questions to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(message => (
                      <ChatMessage 
                        key={message.id} 
                        type={message.type || 'ai'} 
                        content={message.content} 
                        fileName={message.fileName} 
                        actions={message.actions} 
                        onButtonClick={handleButtonClick} 
                      />
                    ))}
                  </div>
                )}
                {isTyping && (
                  <div className="flex justify-start mb-6">
                    <div className="bg-white text-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-border">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="shrink-0">
              <ChatInput 
                onSendMessage={handleSendMessage} 
                onFileUpload={handleFileUpload} 
                disabled={isProcessing || loading} 
                uploadProgress={uploadProgress} 
                isUploading={isUploading} 
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Welcome to Venquis</h2>
              <p className="text-muted-foreground mb-6">
                Create a new conversation to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>;
};
export default Chat;