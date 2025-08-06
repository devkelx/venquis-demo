import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Chat = () => {
  const { user, signOut } = useAuth();
  const [messages, setMessages] = useState<Array<{ id: string; content: string; role: 'user' | 'assistant' }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Venquis Chat</h1>
            <p className="text-sm text-muted-foreground">Contract Analysis Assistant</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.name || user?.email}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold mb-4">Welcome to Venquis</h2>
                  <p className="text-muted-foreground mb-6">
                    Upload a contract document to get started with AI-powered analysis
                  </p>
                  <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-auto">
                    <p className="text-sm text-muted-foreground">
                      This chat interface will be fully implemented with document upload, 
                      AI analysis, and conversation features in the next phase.
                    </p>
                  </div>
                </div>
              )}
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted text-muted-foreground px-4 py-2 rounded-lg">
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
          
          {/* Input Area Placeholder */}
          <div className="border-t border-border p-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Chat input and file upload functionality will be implemented in the next phase
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;