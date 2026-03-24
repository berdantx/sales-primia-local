import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatConversation {
  id: string;
  title: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useChatHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['chat-conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as ChatConversation[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
  };

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (!error) invalidate();
    return !error;
  };

  return { conversations, isLoading, invalidate, deleteConversation };
}
