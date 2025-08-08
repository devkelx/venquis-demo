import { useState } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversations } from "@/hooks/useConversations";
import { ContractsPanel } from "@/components/ContractsPanel";

const Contracts = () => {
  const { currentConversation, setCurrentConversation } = useConversations();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex bg-background">
      <ChatSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onConversationSelect={(conversation) => {
          setCurrentConversation(conversation);
        }}
      />

      <div className="flex-1 flex flex-col">
        <header className="h-12 flex items-center border-b px-6">
          <h1 className="text-sm font-medium">Contracts</h1>
        </header>
        <ScrollArea className="flex-1">
          {currentConversation ? (
            <div className="p-6 max-w-5xl mx-auto w-full">
              <ContractsPanel conversationId={currentConversation.id} />
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <h2 className="text-xl font-semibold mb-2">No conversation selected</h2>
                <p className="text-muted-foreground">Select a chat from the sidebar to view its contracts.</p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default Contracts;
