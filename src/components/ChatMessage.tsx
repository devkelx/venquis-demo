import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Check } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

  const handleButtonClick = (button: ActionButton) => {
    if (onButtonClick) {
      onButtonClick(button.id, button.label);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (type === 'file') {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[70%] animate-slide-in">
          <div className="bg-black text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm border border-border/10">
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
          <div className="bg-black text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm border border-border/10">
            <p className="text-sm leading-relaxed">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[70%] animate-slide-in">
        <div className="bg-white text-foreground rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-border">
          <div className="space-y-3">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({node, ...props}) => <p className="text-sm leading-relaxed text-foreground mb-2" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                em: ({node, ...props}) => <em className="italic text-foreground" {...props} />,
                h1: ({node, ...props}) => <h1 className="text-sm font-bold text-foreground mb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-sm font-bold text-foreground mb-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-sm font-bold text-foreground mb-1" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside text-sm text-foreground mb-2 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside text-sm text-foreground mb-2 space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="text-sm text-foreground" {...props} />,
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto mb-2">
                    <table className="min-w-full border border-border rounded-lg text-sm" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-muted" {...props} />,
                tbody: ({node, ...props}) => <tbody {...props} />,
                tr: ({node, ...props}) => <tr className="border-b border-border hover:bg-muted/50" {...props} />,
                th: ({node, ...props}) => <th className="border border-border px-3 py-2 text-left font-semibold text-sm text-foreground" {...props} />,
                td: ({node, ...props}) => <td className="border border-border px-3 py-2 text-sm text-foreground" {...props} />,
                code: ({node, ...props}: React.ComponentProps<'code'> & { node?: any }) => {
                  const isInline = node?.position?.start?.line === node?.position?.end?.line;
                  return isInline ? 
                    <code className="bg-muted text-foreground px-1 py-0.5 rounded text-sm font-mono" {...props} /> :
                    <code className="block bg-muted text-foreground p-2 rounded text-sm mb-2 font-mono" {...props} />;
                },
                blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-border pl-3 text-sm text-foreground italic mb-2" {...props} />
              }}
            >
              {content}
            </ReactMarkdown>
            
            {actions && actions.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {actions && actions.map((button) => (
                  <Button
                    key={button.id}
                    variant={button.variant === "outline" ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleButtonClick(button)}
                    className={`h-8 text-xs ${
                      button.variant === "default" || !button.variant 
                        ? "bg-black hover:bg-gray-800 text-white border-black" 
                        : ""
                    }`}
                  >
                    {button.icon && <span className="mr-1">{button.icon}</span>}
                    {button.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground ml-auto hover:bg-muted/50 rounded-lg"
                  title={copied ? "Copied!" : "Copy message"}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;