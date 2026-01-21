import { Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface RestrictedFinancialSectionProps {
  title?: string;
  className?: string;
}

export function RestrictedFinancialSection({ 
  title = "Dados Financeiros",
  className 
}: RestrictedFinancialSectionProps) {
  return (
    <Card className={`p-8 text-center bg-muted/30 border-dashed ${className}`}>
      <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Acesso Restrito</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        Você não tem permissão para visualizar {title.toLowerCase()}.
        Entre em contato com o administrador para solicitar acesso.
      </p>
    </Card>
  );
}
