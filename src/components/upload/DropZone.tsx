import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  isProcessing?: boolean;
  acceptedFile?: File | null;
  onClear?: () => void;
}

export function DropZone({ onFileAccepted, isProcessing, acceptedFile, onClear }: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      setError('Arquivo inválido. Use apenas arquivos CSV ou XLSX.');
      return;
    }
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const maxSize = 20 * 1024 * 1024; // 20MB
      
      if (file.size > maxSize) {
        setError('Arquivo muito grande. Tamanho máximo: 20MB.');
        return;
      }
      
      onFileAccepted(file);
    }
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {acceptedFile ? (
          <motion.div
            key="file-accepted"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border-2 border-success/50 bg-success/5 rounded-lg p-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <FileSpreadsheet className="h-8 w-8 text-success" />
                </div>
                <div>
                  <p className="font-medium">{acceptedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(acceptedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              {!isProcessing && onClear && (
                <button
                  onClick={onClear}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 cursor-pointer transition-all duration-200",
                "hover:border-primary/50 hover:bg-primary/5",
                isDragActive && "border-primary bg-primary/5 scale-[1.02]",
                isDragAccept && "border-success bg-success/5",
                isDragReject && "border-destructive bg-destructive/5",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4 text-center">
              <motion.div
                animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
                className={cn(
                  "p-4 rounded-full",
                  isDragActive ? "bg-primary/10" : "bg-muted"
                )}
              >
                <Upload className={cn(
                  "h-10 w-10",
                  isDragActive ? "text-primary" : "text-muted-foreground"
                )} />
              </motion.div>
              
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? 'Solte o arquivo aqui' : 'Arraste e solte sua planilha'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou clique para selecionar
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>CSV ou XLSX (máx. 20MB)</span>
              </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex items-center gap-2 text-destructive"
          >
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
