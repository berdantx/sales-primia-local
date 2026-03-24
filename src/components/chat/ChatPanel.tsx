import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus, History, ArrowLeft } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';
import { useChatHistory, ChatConversation } from '@/hooks/useChatHistory';

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const {
    messages,
    isLoading,
    isStreaming,
    sendMessage,
    loadConversation,
    startNewConversation,
    stopStreaming,
  } = useChat();

  const { conversations, isLoading: historyLoading } = useChatHistory();
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSelectConversation = (conv: ChatConversation) => {
    loadConversation(conv.id);
    setShowHistory(false);
  };

  const handleNewConversation = () => {
    startNewConversation();
    setShowHistory(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[380px] h-[520px] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden sm:w-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          {showHistory && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowHistory(false)}
              className="h-7 w-7 text-primary-foreground hover:bg-primary/80"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <span className="font-semibold text-sm">
            {showHistory ? 'Conversas' : 'Assistente Primia'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowHistory(!showHistory)}
            className="h-7 w-7 text-primary-foreground hover:bg-primary/80"
            title="Histórico"
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleNewConversation}
            className="h-7 w-7 text-primary-foreground hover:bg-primary/80"
            title="Nova conversa"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 text-primary-foreground hover:bg-primary/80"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showHistory ? (
        /* Conversation list */
        <ScrollArea className="flex-1">
          <div className="p-2">
            {historyLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma conversa ainda
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors mb-1"
                >
                  <p className="text-sm font-medium truncate">
                    {conv.title || 'Conversa sem título'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.updated_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      ) : (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="p-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Olá! Sou o assistente da Primia.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pergunte sobre vendas, leads, conversões, anúncios e mais.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <ChatInput
            onSend={sendMessage}
            onStop={stopStreaming}
            isLoading={isLoading}
            isStreaming={isStreaming}
          />
        </>
      )}
    </div>
  );
}
