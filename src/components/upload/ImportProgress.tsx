import { motion } from 'framer-motion';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ImportProgressProps {
  current: number;
  total: number;
  status: 'importing' | 'success' | 'error';
}

export function ImportProgress({ current, total, status }: ImportProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-6 py-12"
    >
      {status === 'importing' ? (
        <>
          <div className="relative">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">Importando transações...</p>
            <p className="text-muted-foreground">
              {current} de {total} ({percent}%)
            </p>
          </div>
          <div className="w-full max-w-md">
            <Progress value={percent} className="h-2" />
          </div>
        </>
      ) : status === 'success' ? (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="p-4 bg-success/10 rounded-full"
          >
            <CheckCircle2 className="h-16 w-16 text-success" />
          </motion.div>
          <div className="text-center">
            <p className="text-lg font-medium">Importação concluída!</p>
            <p className="text-muted-foreground">
              {total} transações importadas com sucesso
            </p>
          </div>
        </>
      ) : null}
    </motion.div>
  );
}
