import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Store, CreditCard } from 'lucide-react';

export type UploadPlatform = 'hotmart' | 'tmb' | 'eduzz' | null;

interface PlatformSelectorProps {
  onSelect: (platform: UploadPlatform) => void;
}

export function PlatformSelector({ onSelect }: PlatformSelectorProps) {
  const platforms = [
    {
      id: 'hotmart' as const,
      name: 'Hotmart',
      description: 'Planilha de vendas da plataforma Hotmart',
      icon: FileSpreadsheet,
      color: 'hsl(var(--primary))',
      bgColor: 'hsl(var(--primary) / 0.1)',
      formats: 'CSV, XLSX',
    },
    {
      id: 'tmb' as const,
      name: 'TMB',
      description: 'Planilha de vendas da plataforma TMB',
      icon: Store,
      color: 'hsl(var(--success))',
      bgColor: 'hsl(var(--success) / 0.1)',
      formats: 'CSV (;)',
    },
    {
      id: 'eduzz' as const,
      name: 'Eduzz',
      description: 'Planilha de vendas da plataforma Eduzz',
      icon: CreditCard,
      color: 'hsl(25 95% 53%)',
      bgColor: 'hsl(25 95% 53% / 0.1)',
      formats: 'CSV, XLSX',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {platforms.map((platform, index) => (
        <motion.div
          key={platform.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50"
            onClick={() => onSelect(platform.id)}
          >
            <CardHeader className="text-center pb-2">
              <div
                className="mx-auto p-4 rounded-full mb-3"
                style={{ backgroundColor: platform.bgColor }}
              >
                <platform.icon 
                  className="h-10 w-10" 
                  style={{ color: platform.color }}
                />
              </div>
              <CardTitle className="text-xl">{platform.name}</CardTitle>
              <CardDescription>{platform.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm text-muted-foreground">
                <span>Formatos:</span>
                <span className="font-medium text-foreground">{platform.formats}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
