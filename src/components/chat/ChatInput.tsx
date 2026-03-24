import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizontal, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading: boolean;
  isStreaming: boolean;
}

export function ChatInput({ onSend, onStop, isLoading, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!value.trim() || isLoading) return;
    onSend(value);
    setValue('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 items-end p-3 border-t">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Pergunte sobre seus dados..."
        className="min-h-[40px] max-h-[120px] resize-none text-sm"
        rows={1}
        disabled={isLoading && !isStreaming}
      />
      {isStreaming ? (
        <Button size="icon" variant="destructive" onClick={onStop} className="flex-shrink-0">
          <Square className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!value.trim() || isLoading}
          className="flex-shrink-0"
        >
          <SendHorizontal className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
