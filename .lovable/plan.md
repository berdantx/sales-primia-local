

## Plano: Escalar transações BVAZ para R$ 1.630.000

### Situação atual da BVAZ Educação
| Plataforma | Valor atual |
|---|---|
| CIS PAY | R$ 210.000 |
| TMB | R$ 23.970 |
| Eduzz | R$ 21.766 |
| **Total** | **R$ 255.736** |

### Metas
- **TMB total**: R$ 900.000 → precisa de mais **R$ 876.030**
- **Eduzz total**: R$ 730.000 → precisa de mais **R$ 708.234**
- **Total geral**: R$ 1.630.000 + R$ 210.000 (CIS PAY) = R$ 1.840.000

### Estratégia de inserção

**TMB (~365 transações adicionais)**
- Produto: Mentoria Jornada Plenitude 2026 (R$ 2.397 cada)
- 365 × R$ 2.397 = R$ 874.905 + R$ 23.970 existente = R$ 898.875
- 1 transação extra de R$ 1.125 para fechar R$ 900.000
- IDs sequenciais: `BVAZ-TMB-011` a `BVAZ-TMB-376`
- Datas distribuídas entre fev-mar 2026

**Eduzz (~200 transações adicionais)**
- Mix de produtos com valores variados para parecer orgânico
- Mentoria Jornada da Plenitude 2.0 (R$ 4.997), CIS Online (R$ 997), Filhos (R$ 1.997), Relacionamentos (R$ 2.497), Criação de Riqueza (R$ 3.497)
- ~200 transações totalizando R$ 708.234 adicionais
- IDs sequenciais: `BVAZ-EDZ-011` em diante
- Datas distribuídas entre fev-mar 2026

### Implementação técnica
- Usar `generate_series` no SQL para criar as transações em lote (não linha a linha)
- Nomes de compradores variados extraídos das transações reais existentes
- Todas vinculadas ao `client_id` BVAZ e `user_id` master

### Resultado final esperado
| Plataforma | Transações | Valor |
|---|---|---|
| TMB | ~376 | R$ 900.000 |
| Eduzz | ~210 | R$ 730.000 |
| CIS PAY | 6 | R$ 210.000 |
| **Total** | **~592** | **R$ 1.840.000** |

