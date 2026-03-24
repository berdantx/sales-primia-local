import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { ChatPanel } from './ChatPanel';

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}

      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
      )}
    </>
  );
}
