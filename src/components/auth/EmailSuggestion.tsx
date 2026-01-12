import { motion } from 'framer-motion';
import { AlertCircle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmailSuggestion as EmailSuggestionType } from '@/lib/emailValidator';

interface EmailSuggestionProps {
  suggestion: EmailSuggestionType;
  onAccept: () => void;
  onDismiss: () => void;
}

export function EmailSuggestion({ suggestion, onAccept, onDismiss }: EmailSuggestionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Você quis dizer{' '}
            <span className="font-semibold break-all">
              {suggestion.suggestedEmail.split('@')[0]}@
              <span className="text-amber-600 dark:text-amber-400">
                {suggestion.suggestedDomain}
              </span>
            </span>
            ?
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Detectamos "{suggestion.originalDomain}" que pode ser um erro de digitação.
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900"
              onClick={onAccept}
            >
              <Check className="h-3 w-3 mr-1" />
              Sim, corrigir
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              onClick={onDismiss}
            >
              <X className="h-3 w-3 mr-1" />
              Não, manter
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
