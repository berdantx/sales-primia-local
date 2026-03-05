-- =============================================
-- BVAZ Educação - Seed para ambiente LIVE
-- Execute em Cloud View > Run SQL > Live
-- =============================================

-- 1. Criar cliente
INSERT INTO clients (id, name, slug, is_active)
VALUES ('48b4bd48-a02b-4c5b-bc4f-1669328acb4c', 'BVAZ Educação', 'bvaz-educacao', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Vincular usuário master
INSERT INTO client_users (user_id, client_id, is_owner, can_view_financials)
VALUES ('23c1ff38-9996-4b70-a8bb-165b0ac18797', '48b4bd48-a02b-4c5b-bc4f-1669328acb4c', true, true)
ON CONFLICT DO NOTHING;

-- 3. CIS PAY transactions (6 registros)
INSERT INTO cispay_transactions (sale_id, product, product_code, buyer_name, buyer_email, sale_value, sale_date, status, currency, turma, enrollment_type, unit, source, client_id, user_id) VALUES
('006V200000gUDPS', 'MENBVAZ - Mentoria Bruno Vaz', 'MENBVAZ', 'Dulcineia Mariano Neto', 'financeirobahia@febracis.com.br', 35000, '2026-02-10T00:00:00Z', 'approved', 'BRL', '2026 - MENBVAZ01', 'Matrícula', 'CIS TREINAMENTO', 'cispay', '48b4bd48-a02b-4c5b-bc4f-1669328acb4c', '23c1ff38-9996-4b70-a8bb-165b0ac18797'),
('006V200000gFKHb', 'MENBVAZ - Mentoria Bruno Vaz', 'MENBVAZ', 'José Sidney Carvalho Costa Neto', 'josesidney@febracis.com.br', 35000, '2026-02-11T00:00:00Z', 'approved', 'BRL', '2026 - MENBVAZ01', 'Matrícula', 'CIS TREINAMENTO', 'cispay', '48b4bd48-a02b-4c5b-bc4f-1669328acb4c', '23c1ff38-9996-4b70-a8bb-165b0ac18797'),
('006V200000gFUH0', 'MENBVAZ - Mentoria Bruno Vaz', 'MENBVAZ', 'Vânia Stoco Tome', 'vaniatome@febracis.com.br', 35000, '2026-02-11T00:00:00Z', 'approved', 'BRL', '2026 - MENBVAZ01', 'Matrícula', 'CIS TREINAMENTO', 'cispay', '48b4bd48-a02b-4c5b-bc4f-1669328acb4c', '23c1ff38-9996-4b70-a8bb-165b0ac18797'),
('006V200000gFWnO', 'MENBVAZ - Mentoria Bruno Vaz', 'MENBVAZ', 'Priscila Cosentino Ferngren', 'priscila@pricosentino.com', 35000, '2026-02-11T00:00:00Z', 'approved', 'BRL', '2026 - MENBVAZ01', 'Matrícula', 'CIS TREINAMENTO', 'cispay', '48b4bd48-a02b-4c5b-bc4f-1669328acb4c', '23c1ff38-9996-4b70-a8bb-165b0ac18797'),
('006V200000gFYVp', 'MENBVAZ - Mentoria Bruno Vaz', 'MENBVAZ', 'Tiago Pacheco Zanini', 'tiagozanini@febracis.com.br', 35000, '2026-02-11T00:00:00Z', 'approved', 'BRL', '2026 - MENBVAZ01', 'Matrícula', 'CIS TREINAMENTO', 'cispay', '48b4bd48-a02b-4c5b-bc4f-1669328acb4c', '23c1ff38-9996-4b70-a8bb-165b0ac18797'),
('006V200000gFYXR', 'MENBVAZ - Mentoria Bruno Vaz', 'MENBVAZ', 'Emerson Cerbino Doblas', 'emersondoblas@gmail.com', 35000, '2026-02-11T00:00:00Z', 'approved', 'BRL', '2026 - MENBVAZ01', 'Matrícula', 'CIS TREINAMENTO', 'cispay', '48b4bd48-a02b-4c5b-bc4f-1669328acb4c', '23c1ff38-9996-4b70-a8bb-165b0ac18797');
