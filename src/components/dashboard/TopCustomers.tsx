import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/calculations/goalCalculations';

interface Customer {
  email: string;
  name: string;
  totalValue: number;
  totalPurchases: number;
  currency: string;
}

interface TopCustomersProps {
  customers: Customer[];
}

export function TopCustomers({ customers }: TopCustomersProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customers.slice(0, 10).map((customer, index) => (
              <motion.div
                key={customer.email}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-4"
              >
                <span className="text-sm font-medium text-muted-foreground w-6">
                  #{index + 1}
                </span>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{customer.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {customer.email}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(customer.totalValue, customer.currency)}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {customer.totalPurchases} compra{customer.totalPurchases !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </motion.div>
            ))}
            {customers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum cliente encontrado
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
