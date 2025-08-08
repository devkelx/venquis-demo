import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({node, ...props}) => <p className="text-sm leading-relaxed text-chat-ai-foreground mb-2" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-chat-ai-foreground" {...props} />,
                em: ({node, ...props}) => <em className="italic text-chat-ai-foreground" {...props} />,
                h1: ({node, ...props}) => <h1 className="text-sm font-bold text-chat-ai-foreground mb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-sm font-bold text-chat-ai-foreground mb-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-sm font-bold text-chat-ai-foreground mb-1" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside text-chat-ai-foreground mb-2 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside text-chat-ai-foreground mb-2 space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="text-chat-ai-foreground" {...props} />,
                code: ({node, ...props}: any) => {
                  // Check if it's inline code by looking at the parent node
                  const isInline = node?.position?.start?.line === node?.position?.end?.line;
                  return isInline ? 
                    <code className="bg-muted text-chat-ai-foreground px-1 py-0.5 rounded text-xs" {...props} /> :
                    <code className="block bg-muted text-chat-ai-foreground p-2 rounded text-xs mb-2" {...props} />;
                },
                blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-border pl-3 text-chat-ai-foreground italic mb-2" {...props} />
              }}
            >
              {content}
            </ReactMarkdown>
            
            {actions && actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
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