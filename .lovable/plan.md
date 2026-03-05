

## Plano: Importar 6 transações CIS PAY para BVAZ Educação

A planilha contém 6 vendas do programa MENBVAZ (Mentoria Bruno Vaz), todas aprovadas, cada uma com valor de BRL 35.000,00, totalizando BRL 210.000,00.

### Dados a inserir

| ID Venda | Cliente | Email | Valor | Data Aprovação |
|---|---|---|---|---|
| 006V200000gUDPS | Dulcineia Mariano Neto | financeirobahia@febracis.com.br | 35.000 | 10/02/2026 |
| 006V200000gFKHb | José Sidney Carvalho Costa Neto | josesidney@febracis.com.br | 35.000 | 11/02/2026 |
| 006V200000gFUH0 | Vânia Stoco Tome | vaniatome@febracis.com.br | 35.000 | 11/02/2026 |
| 006V200000gFWnO | Priscila Cosentino Ferngren | priscila@pricosentino.com | 35.000 | 11/02/2026 |
| 006V200000gFYVp | Tiago Pacheco Zanini | tiagozanini@febracis.com.br | 35.000 | 11/02/2026 |
| 006V200000gFYXR | Emerson Cerbino Doblas | emersondoblas@gmail.com | 35.000 | 11/02/2026 |

### Ação

Inserir diretamente na tabela `cispay_transactions` via migração SQL, associando ao cliente BVAZ Educação (`48b4bd48-a02b-4c5b-bc4f-1669328acb4c`) e ao usuário `23c1ff38-9996-4b70-a8bb-165b0ac18797`.

Campos: sale_id, buyer_name, buyer_email, buyer_phone, sale_value (35000), currency (BRL), sale_date, product, product_code (MENBVAZ), turma (2026 - MENBVAZ01), promotion, unit (CIS TREINAMENTO), enrollment_type (Matrícula), status (approved), source (cispay).

Também corrigir o erro TS1381 persistente em Upload.tsx (se necessário, fazer um rebuild trigger mínimo).

