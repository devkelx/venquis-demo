import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, ArrowUp } from "lucide-react";
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
  return <div className="bg-background">
      {isUploading && uploadProgress !== undefined && (
        <div className="px-6 pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Uploading file...</span>
            <span className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      <div className="p-4 md:p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 rounded-2xl md:rounded-full border bg-muted/40 px-2 py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleFileButtonClick}
              disabled={disabled || isUploading}
              className="rounded-full h-10 w-10"
            >
              <Plus className="h-5 w-5" />
            </Button>

            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={disabled ? "Processing..." : "Type your message..."}
              disabled={disabled || isUploading}
              className="flex-1 bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />

            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || disabled || isUploading}
              className="rounded-full h-10 w-10"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
        </form>
      </div>
    </div>;
};
export default ChatInput;