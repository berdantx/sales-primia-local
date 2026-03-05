-- =============================================
-- BVAZ Educação - Eduzz Transactions para LIVE
-- Execute em Cloud View > Run SQL > Live
-- =============================================

DO $$
DECLARE
  v_client_id uuid := '48b4bd48-a02b-4c5b-bc4f-1669328acb4c';
  v_user_id uuid := '23c1ff38-9996-4b70-a8bb-165b0ac18797';
  first_names text[] := ARRAY['Marcos','Renata','Felipe','Luciana','Bruno','Camila','Rafael','Isabela','Pedro','Tatiana','Eduardo','Fernanda','Gustavo','Larissa','Carlos','Juliana','Ricardo','Patrícia','João','Ana'];
  last_names text[] := ARRAY['Vieira','Lima','Costa','Santos','Ferreira','Dias','Souza','Rocha','Almeida','Mendes','Barbosa','Ribeiro','Gomes','Martins','Carvalho','Nascimento','Araújo','Correia','Pereira','Paula'];
  v_idx int;
  v_fn text;
  v_ln text;
  v_date timestamptz;
  v_base_date timestamptz := '2026-02-01 01:30:00+00';
  v_global_idx int := 0;
BEGIN
  -- Product 1: Mentoria Jornada da Plenitude 2.0. (100 rows, R$4997)
  FOR i IN 0..99 LOOP
    v_idx := 11 + v_global_idx;
    v_fn := first_names[1 + (v_global_idx % 20)];
    v_ln := last_names[1 + (v_global_idx % 20)];
    v_date := v_base_date + (v_global_idx * interval '90 minutes');
    INSERT INTO eduzz_transactions (sale_id, product, buyer_name, buyer_email, sale_value, sale_date, status, currency, source, client_id, user_id)
    VALUES (
      'BVAZ-EDZ-' || lpad(v_idx::text, 4, '0'),
      'Mentoria Jornada da Plenitude 2.0.',
      v_fn || ' ' || v_ln,
      lower(v_fn) || '.' || lower(v_ln) || v_idx || '@email.com',
      4997,
      v_date,
      'paid', 'BRL', 'import', v_client_id, v_user_id
    );
    v_global_idx := v_global_idx + 1;
  END LOOP;

  -- Product 2: Relacionamentos (60 rows, R$2497)
  FOR i IN 0..59 LOOP
    v_idx := 11 + v_global_idx;
    v_fn := first_names[1 + (v_global_idx % 20)];
    v_ln := last_names[1 + (v_global_idx % 20)];
    v_date := v_base_date + (v_global_idx * interval '90 minutes');
    INSERT INTO eduzz_transactions (sale_id, product, buyer_name, buyer_email, sale_value, sale_date, status, currency, source, client_id, user_id)
    VALUES (
      'BVAZ-EDZ-' || lpad(v_idx::text, 4, '0'),
      'Relacionamentos',
      v_fn || ' ' || v_ln,
      lower(v_fn) || '.' || lower(v_ln) || v_idx || '@email.com',
      2497,
      v_date,
      'paid', 'BRL', 'import', v_client_id, v_user_id
    );
    v_global_idx := v_global_idx + 1;
  END LOOP;

  -- Product 3: Filhos (82 rows, R$1997)
  FOR i IN 0..81 LOOP
    v_idx := 11 + v_global_idx;
    v_fn := first_names[1 + (v_global_idx % 20)];
    v_ln := last_names[1 + (v_global_idx % 20)];
    v_date := v_base_date + (v_global_idx * interval '90 minutes');
    INSERT INTO eduzz_transactions (sale_id, product, buyer_name, buyer_email, sale_value, sale_date, status, currency, source, client_id, user_id)
    VALUES (
      'BVAZ-EDZ-' || lpad(v_idx::text, 4, '0'),
      'Filhos',
      v_fn || ' ' || v_ln,
      lower(v_fn) || '.' || lower(v_ln) || v_idx || '@email.com',
      1997,
      v_date,
      'paid', 'BRL', 'import', v_client_id, v_user_id
    );
    v_global_idx := v_global_idx + 1;
  END LOOP;

  -- Product 4: Carreira & Finanças (60 rows, R$1497)
  FOR i IN 0..59 LOOP
    v_idx := 11 + v_global_idx;
    v_fn := first_names[1 + (v_global_idx % 20)];
    v_ln := last_names[1 + (v_global_idx % 20)];
    v_date := v_base_date + (v_global_idx * interval '90 minutes');
    INSERT INTO eduzz_transactions (sale_id, product, buyer_name, buyer_email, sale_value, sale_date, status, currency, source, client_id, user_id)
    VALUES (
      'BVAZ-EDZ-' || lpad(v_idx::text, 4, '0'),
      'Carreira & Finanças',
      v_fn || ' ' || v_ln,
      lower(v_fn) || '.' || lower(v_ln) || v_idx || '@email.com',
      1497,
      v_date,
      'paid', 'BRL', 'import', v_client_id, v_user_id
    );
    v_global_idx := v_global_idx + 1;
  END LOOP;

  RAISE NOTICE 'Eduzz: % rows inserted', v_global_idx;
END $$;
