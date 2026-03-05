

## Plano: Criar conta de demonstração "BVAZ Educação"

O usuário `bvazeua@gmail.com` já existe no sistema com role `master`. O cliente "BVAZ Educação" ainda não existe.

### Ações necessárias (todas via inserção de dados, sem migração)

1. **Criar o cliente** na tabela `clients`:
   - name: "BVAZ Educação"
   - slug: "bvaz-educacao"

2. **Associar o usuário ao cliente** na tabela `client_users`:
   - user_id: `23c1ff38-9996-4b70-a8bb-165b0ac18797`
   - is_owner: true
   - can_view_financials: true

3. **Criar registro de coprodução** na tabela `client_coproducers`:
   - user_id: `23c1ff38-9996-4b70-a8bb-165b0ac18797`
   - client_id: (o novo cliente)

Nenhuma alteração de código é necessária -- apenas inserção de dados nas tabelas existentes.

