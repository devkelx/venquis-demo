import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface ActionButton {
  id: string;
  label: string;
  variant?: 'default' | 'outline' | 'destructive';
  icon?: React.ReactNode;
}

interface ChatMessageProps {
  type: 'user' | 'ai' | 'file';
  content: string;
  fileName?: string;
  actions?: ActionButton[];
  onButtonClick?: (buttonId: string, buttonLabel: string) => void;
}

const ChatMessage = ({ type, content, fileName, actions, onButtonClick }: ChatMessageProps) => {
  const handleButtonClick = (button: ActionButton) => {
    if (onButtonClick) {
      onButtonClick(button.id, button.label);
    }
  };

  if (type === 'file') {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[70%] animate-slide-in">
          <div className="bg-chat-user text-chat-user-foreground rounded-2xl rounded-tr-sm px-4 py-3 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-sm">{fileName}</p>
                <p className="text-xs opacity-90">Uploaded document</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'user') {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[70%] animate-slide-in">
          <div className="bg-chat-user text-chat-user-foreground rounded-2xl rounded-tr-sm px-4 py-3 shadow-soft">
            <p className="text-sm leading-relaxed">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[70%] animate-slide-in">
        <div className="bg-chat-ai text-chat-ai-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-soft border border-border">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
            
            {actions && actions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                {actions.map((button) => (
                  <Button
                    key={button.id}
                    variant={button.variant || "outline"}
                    size="sm"
                    onClick={() => handleButtonClick(button)}
                    className="h-8 text-xs"
                  >
                    {button.icon && <span className="mr-1">{button.icon}</span>}
                    {button.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;