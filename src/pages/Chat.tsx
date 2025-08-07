import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { ContractsPanel } from "@/components/ContractsPanel";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useZepMemory } from "@/hooks/useZepMemory";
import { createMemoryMessage, createContractContext } from "@/integrations/zep/client";
const Chat = () => {
  const {
    user
  } = useAuth();
  const {
    currentConversation,
    setCurrentConversation,
    createConversation
  } = useConversations();
  const {
    messages,
    loading,
    saveUserMessage,
    saveAIMessage,
    saveFileMessage,
    refetch: refetchMessages
  } = useMessages(currentConversation?.id || null);
  const {
    addMemoryMessage,
    storeContractContext
  } = useZepMemory();
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

      // Add to Zep memory
      await addMemoryMessage(currentConversation.zep_session_id, createMemoryMessage('user', message, {
        message_type: 'text',
        conversation_id: currentConversation.id
      }));
      setIsTyping(true);

      // Call n8n webhook for all messages (text and files)
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke('contract-analysis', {
          body: {
            conversation_id: currentConversation.id,
            message_content: message,
            zep_session_id: currentConversation.zep_session_id
          }
        });
        if (error) throw error;

        // Messages are automatically saved by the edge function, so just refresh
        await refetchMessages();
      } catch (aiError) {
        console.error('AI processing error:', aiError);
        toast({
          title: "AI Processing Error",
          description: "Failed to process your message. Please try again.",
          variant: "destructive"
        });
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
      const {
        data,
        error
      } = await supabase.storage.from('contracts').upload(filePath, file);
      setUploadProgress(100);
      if (error) throw error;

      // Get public URL
      const {
        data: urlData
      } = supabase.storage.from('contracts').getPublicUrl(filePath);

      // Save file message
      await saveFileMessage(file.name, urlData.publicUrl);

      // Store contract context in Zep
      await storeContractContext(currentConversation.zep_session_id, createContractContext(fileName, file.name, urlData.publicUrl));
      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded and is ready for analysis`
      });

      // Trigger real AI analysis
      setIsTyping(true);
      try {
        const {
          data: analysisData,
          error: analysisError
        } = await supabase.functions.invoke('contract-analysis', {
          body: {
            conversation_id: currentConversation.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            message_content: `Contract uploaded: ${file.name}`,
            zep_session_id: currentConversation.zep_session_id
          }
        });
        if (analysisError) throw analysisError;

        // Messages are automatically saved by the edge function, so just refresh  
        await refetchMessages();
      } catch (analysisError) {
        console.error('Analysis error:', analysisError);
        toast({
          title: "Analysis Error",
          description: "Failed to analyze contract. Please try again.",
          variant: "destructive"
        });
      }
      setIsTyping(false);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  const handleButtonClick = async (buttonId: string, buttonLabel: string) => {
    if (!currentConversation) return;

    // Save button click as user message
    await saveUserMessage(`Clicked: ${buttonLabel}`);

    // Add to memory
    await addMemoryMessage(currentConversation.zep_session_id, createMemoryMessage('user', `User clicked: ${buttonLabel}`, {
      message_type: 'button_click',
      button_action: buttonId,
      conversation_id: currentConversation.id
    }));
    setIsTyping(true);

    // Process button action through real AI
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('contract-analysis', {
        body: {
          conversation_id: currentConversation.id,
          message_content: `User requested: ${buttonLabel}`,
          zep_session_id: currentConversation.zep_session_id,
          button_action: buttonId
        }
      });
      if (error) throw error;

      // Messages are automatically saved by the edge function, so just refresh
      await refetchMessages();
    } catch (error) {
      console.error('Button action error:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive"
      });
    }
    setIsTyping(false);
  };
  return <div className="h-screen flex bg-background">
      <ChatSidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} onNewChat={() => {
      setShouldAutoScroll(true);
    }} onConversationSelect={conversation => {
      setCurrentConversation(conversation);
      setShouldAutoScroll(true);
    }} />
      
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <div className="border-b px-6 py-2">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="chat" className="flex-1 flex flex-col m-0 min-h-0">
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full p-6" onScrollCapture={handleScroll} ref={scrollAreaRef}>
                  <div className="max-w-4xl mx-auto">
                    {loading && messages.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-12">
                        <h2 className="text-2xl font-semibold mb-4">Contract Analysis Assistant</h2>
                        <p className="text-muted-foreground mb-6">
                          Upload a contract document or ask questions to get started
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
                        <div className="bg-chat-ai text-chat-ai-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-soft border border-border">
                          <div className="flex space-x-1">
                            <div className="h-2 w-2 bg-current rounded-full animate-bounce"></div>
                            <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>
              
              <div className="border-t bg-background">
                <ChatInput 
                  onSendMessage={handleSendMessage} 
                  onFileUpload={handleFileUpload} 
                  disabled={isProcessing || loading} 
                  uploadProgress={uploadProgress} 
                  isUploading={isUploading} 
                />
              </div>
            </TabsContent>
            
            <TabsContent value="contracts" className="flex-1 m-0">
              <ScrollArea className="h-full">
                <ContractsPanel conversationId={currentConversation.id} />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">Welcome to Venquis</h2>
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