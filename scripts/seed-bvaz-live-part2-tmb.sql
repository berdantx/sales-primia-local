-- =============================================
-- BVAZ Educação - TMB Transactions para LIVE
-- Execute em Cloud View > Run SQL > Live
-- =============================================

DO $$
DECLARE
  v_client_id uuid := '48b4bd48-a02b-4c5b-bc4f-1669328acb4c';
  v_user_id uuid := '23c1ff38-9996-4b70-a8bb-165b0ac18797';
  first_names text[] := ARRAY['Carlos','Maria','João','Patrícia','Fernando','Juliana','Ricardo','Camila','Pedro','Luciana','Marcos','Tatiana','Eduardo','Fernanda','Rafael','Isabela','Gustavo','Larissa','Bruno','Ana'];
  last_names text[] := ARRAY['Souza','Oliveira','Santos','Costa','Lima','Pereira','Almeida','Rocha','Mendes','Barbosa','Ribeiro','Gomes','Martins','Carvalho','Nascimento','Araújo','Dias','Ferreira','Correia','Silva'];
  v_idx int;
  v_fn text;
  v_ln text;
  v_date timestamptz;
  v_product text;
  v_value numeric;
  v_base_date timestamptz := '2026-02-01 01:12:00+00';
  v_global_idx int := 0;
BEGIN
  -- Product 1: Mentoria Jornada Plenitude 2026 (280 rows, R$2397)
  FOR i IN 0..279 LOOP
    v_idx := 11 + v_global_idx;
    v_fn := first_names[1 + (v_global_idx % 20)];
    v_ln := last_names[1 + (v_global_idx % 20)];
    v_date := v_base_date + (v_global_idx * interval '72 minutes');
    INSERT INTO tmb_transactions (order_id, product, buyer_name, buyer_email, ticket_value, effective_date, status, currency, source, client_id, user_id)
    VALUES (
      'BVAZ-TMB-' || lpad(v_idx::text, 3, '0'),
      'Mentoria Jornada Plenitude 2026',
      v_fn || ' ' || v_ln,
      lower(v_fn) || '.' || lower(v_ln) || v_idx || '@email.com',
      2397,
      v_date,
      'efetivado', 'BRL', 'import', v_client_id, v_user_id
    );
    v_global_idx := v_global_idx + 1;
  END LOOP;

  -- Product 2: Formação Master 2026 (60 rows, R$1997)
  FOR i IN 0..59 LOOP
    v_idx := 11 + v_global_idx;
    v_fn := first_names[1 + (v_global_idx % 20)];
    v_ln := last_names[1 + (v_global_idx % 20)];
    v_date := v_base_date + (v_global_idx * interval '72 minutes');
    INSERT INTO tmb_transactions (order_id, product, buyer_name, buyer_email, ticket_value, effective_date, status, currency, source, client_id, user_id)
    VALUES (
      'BVAZ-TMB-' || lpad(v_idx::text, 3, '0'),
      'Formação Master 2026',
      v_fn || ' ' || v_ln,
      lower(v_fn) || '.' || lower(v_ln) || v_idx || '@email.com',
      1997,
      v_date,
      'efetivado', 'BRL', 'import', v_client_id, v_user_id
    );
    v_global_idx := v_global_idx + 1;
  END LOOP;

  -- Product 3: Workshop Intensivo (39 rows, R$997)
  FOR i IN 0..38 LOOP
    v_idx := 11 + v_global_idx;
    v_fn := first_names[1 + (v_global_idx % 20)];
    v_ln := last_names[1 + (v_global_idx % 20)];
    v_date := v_base_date + (v_global_idx * interval '72 minutes');
    INSERT INTO tmb_transactions (order_id, product, buyer_name, buyer_email, ticket_value, effective_date, status, currency, source, client_id, user_id)
    VALUES (
      'BVAZ-TMB-' || lpad(v_idx::text, 3, '0'),
      'Workshop Intensivo',
      v_fn || ' ' || v_ln,
      lower(v_fn) || '.' || lower(v_ln) || v_idx || '@email.com',
      997,
      v_date,
      'efetivado', 'BRL', 'import', v_client_id, v_user_id
    );
    v_global_idx := v_global_idx + 1;
  END LOOP;

  RAISE NOTICE 'TMB: % rows inserted', v_global_idx;
END $$;
