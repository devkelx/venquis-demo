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
    const file = e.target.files?.[0];
    if (file && !disabled) {
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file only",
          variant: "destructive"
        });
        e.target.value = '';
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive"
        });
        e.target.value = '';
        return;
      }
      onFileUpload(file);
      e.target.value = ""; // Reset the input
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="sticky bottom-0 inset-x-0 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur border-t border-border">
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
              <Input 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                placeholder={disabled ? "Processing..." : "Type your message..."} 
                disabled={disabled || isUploading} 
                className="pr-12 min-h-[48px] resize-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 border-border bg-background text-foreground placeholder:text-muted-foreground rounded-xl shadow-sm" 
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }} 
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleFileButtonClick} 
                disabled={disabled || isUploading} 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50 rounded-lg"
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            size="sm" 
            disabled={!message.trim() || disabled || isUploading} 
            className="h-12 px-6 bg-black hover:bg-gray-800 text-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <Send className="h-4 w-4" />
          </Button>
          
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
        </form>
      </div>
    </div>
  );
};

export default ChatInput;