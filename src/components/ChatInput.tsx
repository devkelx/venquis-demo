import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Paperclip, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload: (file: File) => void;
  disabled?: boolean;
  uploadProgress?: number;
  isUploading?: boolean;
}

const ChatInput = ({
  onSendMessage,
  onFileUpload,
  disabled = false,
  uploadProgress,
  isUploading
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled && !isUploading) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && !disabled) {
      // Process each file
      Array.from(files).forEach(file => {
        // Validate file type
        if (file.type !== 'application/pdf') {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a PDF file. Please upload PDF files only.`,
            variant: "destructive"
          });
          return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is too large. Please upload files smaller than 10MB.`,
            variant: "destructive"
          });
          return;
        }

        onFileUpload(file);
      });
      
      e.target.value = ""; // Reset the input
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="sticky bottom-0 inset-x-0 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur">
      {isUploading && uploadProgress !== undefined && (
        <div className="px-6 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">Uploading file...</span>
            <span className="text-sm text-muted-foreground font-medium">{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}
      
      <div className="px-6 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1">
            <div className="relative">
              <input 
                type="text"
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                placeholder={disabled ? "Processing..." : "Type your message..."} 
                disabled={disabled || isUploading} 
                className="flex h-12 w-full rounded-xl border border-border bg-muted px-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-muted-foreground/30 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50" 
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }} 
              />
              
              {/* Attachment button on the left */}
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleFileButtonClick} 
                disabled={disabled || isUploading} 
                className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50 rounded-lg"
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </Button>
              
              {/* Send button on the right */}
              <button 
                type="submit" 
                disabled={!message.trim() || disabled || isUploading} 
                className="absolute right-4 top-1/2 -translate-y-1/2 p-0 hover:bg-transparent"
              >
                <Send className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" multiple className="hidden" />
        </form>
      </div>
    </div>
  );
};

export default ChatInput;