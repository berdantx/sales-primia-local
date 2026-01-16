-- Tabela para histórico de convites
CREATE TABLE public.invitation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID,
  old_token TEXT,
  new_token TEXT,
  old_expires_at TIMESTAMPTZ,
  new_expires_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Índices para performance
CREATE INDEX idx_invitation_history_invitation_id ON invitation_history(invitation_id);
CREATE INDEX idx_invitation_history_created_at ON invitation_history(created_at DESC);

-- RLS
ALTER TABLE invitation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters can view invitation history"
  ON invitation_history FOR SELECT
  USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "System can insert history"
  ON invitation_history FOR INSERT
  WITH CHECK (true);