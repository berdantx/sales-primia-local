import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SourceBadge } from '@/components/transactions/SourceBadge';

interface Buyer {
  id: string;
  buyer_name: string | null;
  buyer_email: string | null;
  country: string;
  product: string | null;
  value: number;
  currency: string;
  date: string | null;
  platform: 'hotmart' | 'tmb' | 'eduzz' | 'cispay';
}

const PAGE_SIZE = 15;

export function InternationalBuyersTable({ buyers }: { buyers: Buyer[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search) return buyers;
    const q = search.toLowerCase();
    return buyers.filter(
      (b) =>
        (b.buyer_name?.toLowerCase().includes(q)) ||
        (b.buyer_email?.toLowerCase().includes(q)) ||
        b.country.toLowerCase().includes(q) ||
        (b.product?.toLowerCase().includes(q))
    );
  }, [buyers, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <CardTitle className="text-base">Compradores Internacionais ({filtered.length})</CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, email, país..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Plataforma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum comprador encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.buyer_name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{b.buyer_email || '-'}</TableCell>
                    <TableCell>{b.country}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{b.product || '-'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {b.currency} {b.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{b.date ? format(new Date(b.date), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell><SourceBadge source={b.platform} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
