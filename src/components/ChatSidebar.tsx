import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreHorizontal, Plus, LogOut, FileText, PanelLeftClose, PanelLeftOpen, Moon, Sun } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useConversations } from "@/hooks/useConversations";
import { useState, useEffect } from "react";

const timeGroupLabels = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 Days',
  older: 'Older'
};

interface ChatSidebarProps {
  onConversationSelect?: (conversation: any) => void;
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
    updateCo