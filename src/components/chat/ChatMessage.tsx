import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every(c => /^[\s:-]+$/.test(c));
}

function convertTablesToList(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  const flushTable = () => {
    if (tableRows.length > 0 && tableHeaders.length > 0) {
      for (const row of tableRows) {
        const parts: string[] = [];
        for (let i = 0; i < tableHeaders.length; i++) {
          const header = tableHeaders[i]?.trim();
          const value = row[i]?.trim();
          if (header && value && value !== '-' && value !== 'N/A' && value !== '') {
            parts.push(`*${header}:* ${value}`);
          }
        }
        if (parts.length > 0) result.push(parts.join('\n'));
        if (tableRows.length > 1) result.push('');
      }
    }
    tableHeaders = [];
    tableRows = [];
    inTable = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());

      if (isSeparatorRow(cells)) continue; // skip separator

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
    } else {
      if (inTable) flushTable();
      result.push(line);
    }
  }

  if (inTable) flushTable();
  return result.join('\n');
}

function renderMarkdown(text: string) {
  if (!text) return <span className="animate-pulse">...</span>;

  // Convert any markdown tables to list format
  const processed = convertTablesToList(text);
  const lines = processed.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="space-y-0.5 my-1 ml-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-muted-foreground">•</span>
              <span>{formatInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Bullet list items (but not italic *text*)
    if (trimmed.match(/^[-•]\s/)) {
      listItems.push(trimmed.replace(/^[-•]\s/, ''));
      continue;
    }

    flushList();

    if (!trimmed) {
      if (elements.length > 0) elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      continue;
    }

    // Headers
    const headerMatch = trimmed.match(/^#{1,3}\s+(.+)/);
    if (headerMatch) {
      elements.push(
        <p key={`h-${i}`} className="font-semibold mt-2 mb-0.5">{formatInline(headerMatch[1])}</p>
      );
      continue;
    }

    // Horizontal rule
    if (trimmed.match(/^[-_]{3,}$/)) {
      elements.push(<hr key={`hr-${i}`} className="my-2 border-border/50" />);
      continue;
    }

    // Regular paragraph
    elements.push(<p key={`p-${i}`} className="mb-0.5 leading-relaxed">{formatInline(trimmed)}</p>);
  }

  flushList();
  return <>{elements}</>;
}

function formatInline(text: string): React.ReactNode {
  // Process bold **text** and italic *text*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <span key={i} className="text-muted-foreground font-medium">{part.slice(1, -1)}</span>;
    }
    return part;
  });
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex gap-2 mb-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm break-words',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {isUser ? content : renderMarkdown(content)}
      </div>
    </div>
  );
}
