import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvitationHistoryItem {
  id: string;
  invitation_id: string;
  action: string;
  performed_by: string | null;
  old_token: string | null;
  new_token: string | null;
  old_expires_at: string | null;
  new_expires_at: string | null;
  email_sent: boolean | null;
  created_at: string;
  notes: string | null;
}

export function useInvitationHistory(invitationId: string | null) {
  return useQuery({
    queryKey: ["invitation-history", invitationId],
    queryFn: async () => {
      if (!invitationId) return [];
      
      const { data, error } = await supabase
        .from("invitation_history")
        .select("*")
        .eq("invitation_id", invitationId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as InvitationHistoryItem[];
    },
    enabled: !!invitationId,
  });
}
