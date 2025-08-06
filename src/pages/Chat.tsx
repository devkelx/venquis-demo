import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { Download, AlertTriangle, CheckCircle } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useZepMemory } from "@/hooks/useZepMemory";
import { createMemoryMessage, createContractContext } from "@/integrations/zep/client";

const Chat = () => {
  const { user } = useAuth();
  const { currentConversation, setCurrentConversation } = useConversations();
  const { messages, loading, saveUserMessage, saveAIMessage, saveFileMessage } = useMessages(currentConversation?.id || null);
  const { addMemoryMessage, storeContractContext } = useZepMemory();
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll functionality
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
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
      await addMemoryMessage(
        currentConversation.zep_session_id,
        createMemoryMessage('user', message, {
          message_type: 'text',
          conversation_id: currentConversation.id
        })
      );

      setIsTyping(true);

      // Simulate AI processing (in real app, this would call your AI service)
      setTimeout(async () => {
        const aiResponse = "Thank you for your message. I'm here to help you analyze contracts and provide insights. Please upload a contract document to get started with detailed analysis.";
        
        const aiMessage = await saveAIMessage(aiResponse, [
          {
            id: 'upload_contract',
            label: 'Upload Contract',
            variant: 'default' as const,
            icon: <Download className="w-4 h-4" />
          }
        ]);

        if (aiMessage) {
          await addMemoryMessage(
            currentConversation.zep_session_id,
            createMemoryMessage('assistant', aiResponse, {
              message_type: 'text',
              conversation_id: currentConversation.id
            })
          );
        }

        setIsTyping(false);
        setIsProcessing(false);
      }, 2000);

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
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file to Supabase storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('contracts')
        .upload(fileName, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      // Save file message
      await saveFileMessage(file.name, urlData.publicUrl);

      // Store contract context in Zep
      await storeContractContext(
        currentConversation.zep_session_id,
        createContractContext(
          fileName,
          file.name,
          urlData.publicUrl
        )
      );

      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded and is ready for analysis`,
      });

      // Simulate AI analysis
      setIsTyping(true);
      setTimeout(async () => {
        const analysisResponse = `I've successfully received your contract "${file.name}". Here's a preliminary analysis:

🔍 **Document Overview**
- Contract type: Recruitment/Employment Agreement
- Pages analyzed: Processing...
- Key sections identified: Terms, Compensation, Obligations

📋 **Initial Findings**
- Standard recruitment terms detected
- Compensation structure requires review
- Compliance clauses present

Would you like me to provide a detailed analysis of any specific section?`;

        await saveAIMessage(analysisResponse, [
          {
            id: 'detailed_analysis',
            label: 'Detailed Analysis',
            variant: 'default' as const,
            icon: <CheckCircle className="w-4 h-4" />
          },
          {
            id: 'risk_assessment',
            label: 'Risk Assessment',
            variant: 'outline' as const,
            icon: <AlertTriangle className="w-4 h-4" />
          },
          {
            id: 'download_report',
            label: 'Download Report',
            variant: 'outline' as const,
            icon: <Download className="w-4 h-4" />
          }
        ]);

        setIsTyping(false);
      }, 3000);

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
    await addMemoryMessage(
      currentConversation.zep_session_id,
      createMemoryMessage('user', `User clicked: ${buttonLabel}`, {
        message_type: 'button_click',
        button_action: buttonId,
        conversation_id: currentConversation.id
      })
    );

    setIsTyping(true);
    
    // Simulate different responses based on button
    setTimeout(async () => {
      let response = "";
      let actions = undefined;

      switch (buttonId) {
        case 'detailed_analysis':
          response = `📊 **Detailed Contract Analysis**

**1. Contract Structure**
- Well-organized with clear sections
- Standard legal language used
- All essential clauses present

**2. Financial Terms**
- Base compensation: Clearly defined
- Commission structure: Performance-based
- Benefits package: Comprehensive

**3. Risk Factors**
- ⚠️ Termination clauses favor employer
- ⚠️ Non-compete period extends 12 months
- ✅ Dispute resolution mechanism in place

**4. Recommendations**
- Negotiate termination notice period
- Review non-compete geographical scope
- Clarify intellectual property ownership`;
          
          actions = [
            {
              id: 'negotiate_terms',
              label: 'Negotiation Tips',
              variant: 'default' as const
            },
            {
              id: 'compare_standards',
              label: 'Industry Standards',
              variant: 'outline' as const
            }
          ];
          break;

        case 'risk_assessment':
          response = `⚠️ **Risk Assessment Report**

**HIGH RISK**
- Broad non-compete clause (12 months, national scope)
- Limited termination protection for employee
- Vague intellectual property assignment

**MEDIUM RISK**
- Commission calculation methodology
- Overtime compensation structure
- Confidentiality scope definitions

**LOW RISK**
- Base salary terms
- Standard benefit provisions
- Dispute resolution process

**Overall Risk Score: 6.5/10**
Recommendation: Negotiate high-risk items before signing.`;
          
          actions = [
            {
              id: 'mitigation_strategies',
              label: 'Risk Mitigation',
              variant: 'default' as const
            }
          ];
          break;

        case 'download_report':
          response = "📄 **Report Generation**\n\nI'm preparing a comprehensive analysis report for download. This will include:\n\n• Executive summary\n• Detailed clause analysis\n• Risk assessment\n• Negotiation recommendations\n• Industry benchmarks\n\nThe report will be ready shortly and sent to your email.";
          break;

        default:
          response = `I've noted your interest in "${buttonLabel}". How can I help you further with your contract analysis?`;
      }

      await saveAIMessage(response, actions);
      setIsTyping(false);
    }, 2000);
  };

  return (
    <div className="h-screen flex bg-background">
      <ChatSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onNewChat={() => {
          setShouldAutoScroll(true);
        }}
      />
      
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            <ScrollArea 
              className="flex-1 p-6"
              onScrollCapture={handleScroll}
              ref={scrollAreaRef}
            >
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
                    <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-auto">
                      <p className="text-sm text-muted-foreground">
                        💡 <strong>Tip:</strong> I can analyze recruitment contracts, employment agreements, 
                        and provide insights on terms, risks, and negotiation strategies.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
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
            
            <ChatInput
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
              disabled={isProcessing || loading}
              uploadProgress={uploadProgress}
              isUploading={isUploading}
            />
          </>
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
    </div>
  );
};

export default Chat;