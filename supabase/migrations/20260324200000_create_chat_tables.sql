-- Chat conversations table
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chat_conversations enable row level security;

create policy "Users see own conversations"
  on public.chat_conversations for all
  using (auth.uid() = user_id);

create index idx_chat_conversations_user
  on public.chat_conversations(user_id, updated_at desc);

-- Chat messages table
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;

create policy "Users see own messages"
  on public.chat_messages for all
  using (
    conversation_id in (
      select id from public.chat_conversations where user_id = auth.uid()
    )
  );

create index idx_chat_messages_conversation
  on public.chat_messages(conversation_id, created_at);
