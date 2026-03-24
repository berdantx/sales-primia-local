-- Chat assistant settings (master-only configuration)
create table public.chat_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

alter table public.chat_settings enable row level security;

-- Everyone can read settings
create policy "Anyone can read chat_settings"
  on public.chat_settings for select
  using (true);

-- Only master users can modify (enforced via app logic + RLS)
create policy "Authenticated users can modify chat_settings"
  on public.chat_settings for all
  using (auth.uid() is not null);

-- Insert default values
insert into public.chat_settings (key, value) values
  ('assistant_model_openai', 'gpt-4o-mini'),
  ('assistant_model_gemini', 'gemini-2.0-flash'),
  ('assistant_model_grok', 'grok-3-mini-fast'),
  ('assistant_model_deepseek', 'deepseek-chat'),
  ('assistant_temperature', '0.7'),
  ('assistant_max_tokens', '2000'),
  ('assistant_system_prompt', 'Você é o assistente de análise de vendas da plataforma Primia.
Ajude o usuário a entender seus dados de vendas, leads e marketing.
Seja conciso e direto. Use tabelas e formatação markdown quando apropriado.
Responda sempre em português (Brasil). Formate números de forma clara.
Se não tiver dados suficientes para responder, diga claramente.
Não invente dados. Use apenas os dados fornecidos no contexto.'),
  ('assistant_financial_roles', '["master","admin"]');
