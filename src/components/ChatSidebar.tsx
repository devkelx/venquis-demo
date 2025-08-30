import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreHorizontal, Plus, LogOut, FileText, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useConversations, type Conversation } from "@/hooks/useConversations";

const timeGroupLabels = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 Days',
  older: 'Older'
};

interface ChatSidebarProps {
  onConversationSelect?: (conversation: Conversation) => void;
  onNewChat?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ChatSidebar = ({
  onConversationSelect,
  onNewChat,
  isCollapsed = false,
  onToggleCollapse
}: ChatSidebarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    loading,
    createConversation,
    updateConversationTitle,
    deleteConversation
  } = useConversations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const groupedConversations = conversations.reduce((acc, conv) => {
    const timeGroup = conv.timeGroup || 'older';
    if (!acc[timeGroup]) {
      acc[timeGroup] = [];
    }
    acc[timeGroup].push(conv);
    return acc;
  }, {} as Record<string, typeof conversations>);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleNewChat = async () => {
    const newConv = await createConversation();
    if (newConv) {
      setCurrentConversation(newConv);
      if (onNewChat) {
        onNewChat();
      }
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    if (onConversationSelect) {
      onConversationSelect(conversation);
    }
  };

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleEditSubmit = async () => {
    if (editingId && editingTitle.trim()) {
      await updateConversationTitle(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleToggleView = () => {
    if (!currentConversation) {
      return;
    }
    if (location.pathname === '/chat') {
      navigate('/contracts');
    } else {
      navigate('/chat');
    }
  };

  const isOnContracts = location.pathname === '/contracts';

  if (isCollapsed) {
    return (
      <div className="w-16 border-r border-border bg-card flex flex-col items-center py-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="w-10 h-10 p-0 hover:bg-muted/50 rounded-lg">
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
        
        <div className="flex-1" />
        
        <Button variant="ghost" size="sm" onClick={handleLogout} className="w-10 h-10 p-0 hover:bg-muted/50 rounded-lg">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full sticky top-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-lg">Venquis</h2>
          </div>
          <div className="flex items-center gap-0.5">

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleToggleView} 
              className={`w-8 h-8 p-0 hover:bg-muted/50 rounded-lg ${isOnContracts ? 'bg-muted text-primary' : ''}`} 
              aria-label={isOnContracts ? "Back to chat" : "View contracts"} 
              title={isOnContracts ? "Back to Chat" : "View Contracts"} 
              disabled={!currentConversation}
            >
              <FileText className={`h-4 w-4 ${isOnContracts ? 'text-primary' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="w-8 h-8 p-0 hover:bg-muted/50 rounded-lg">
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Button 
          onClick={handleNewChat} 
          className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground border-primary rounded-xl shadow-sm transition-all duration-200 hover:shadow-md" 
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(timeGroupLabels).map(([key, label]) => {
              const groupConversations = groupedConversations[key] || [];
              if (groupConversations.length === 0) return null;
              return (
                <div key={key}>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">
                    {label}
                  </h3>
                  <div className="space-y-1">
                    {groupConversations.map(conversation => (
                      <div 
                        key={conversation.id} 
                        className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                          currentConversation?.id === conversation.id ? 'bg-muted' : ''
                        }`} 
                        onClick={() => handleConversationClick(conversation)}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        
                        {editingId === conversation.id ? (
                          <input 
                            value={editingTitle} 
                            onChange={e => setEditingTitle(e.target.value)} 
                            onBlur={handleEditSubmit} 
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleEditSubmit();
                              if (e.key === 'Escape') handleEditCancel();
                            }} 
                            className="flex-1 bg-transparent border-none outline-none text-sm" 
                            autoFocus 
                          />
                        ) : (
                          <span className="flex-1 text-sm truncate">
                            {conversation.title}
                          </span>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted/50 rounded">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEditing(conversation.id, conversation.title)}>
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteConversation(conversation.id)} className="text-destructive">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-primary-foreground">
                {user?.user_metadata?.name?.[0] || user?.email?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.user_metadata?.name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-8 h-8 p-0 hover:bg-muted/50 rounded-lg">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;