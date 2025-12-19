import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityAlertRequest {
  email: string;
  failed_attempts: number;
  ip_address: string;
  city: string | null;
  country: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const { email, failed_attempts, ip_address, city, country }: SecurityAlertRequest = await req.json();

    console.log(`Security alert triggered for ${email}: ${failed_attempts} failed attempts`);

    // Get all master users
    const { data: masterRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'master');

    if (rolesError) {
      console.error('Error fetching master roles:', rolesError);
      throw rolesError;
    }

    if (!masterRoles || masterRoles.length === 0) {
      console.log('No master users found to notify');
      return new Response(
        JSON.stringify({ success: true, message: 'No masters to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get master user emails from auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      throw authError;
    }

    const masterUserIds = masterRoles.map(r => r.user_id);
    const masterEmails = authUsers.users
      .filter(u => masterUserIds.includes(u.id))
      .map(u => u.email)
      .filter((e): e is string => !!e);

    if (masterEmails.length === 0) {
      console.log('No master emails found');
      return new Response(
        JSON.stringify({ success: true, message: 'No master emails found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const location = [city, country].filter(Boolean).join(', ') || 'Desconhecida';
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Send email to all masters
    const emailResult = await resend.emails.send({
      from: 'Segurança <onboarding@resend.dev>',
      to: masterEmails,
      subject: '🚨 Alerta de Segurança: Tentativas de Login Falhadas',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .alert-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
            .details { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; }
            .details li { margin: 8px 0; }
            .recommendations { margin-top: 20px; }
            .recommendations li { margin: 8px 0; color: #4b5563; }
            .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🚨 Alerta de Segurança</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Sistema de Monitoramento</p>
            </div>
            <div class="content">
              <div class="alert-box">
                <strong>⚠️ Atenção:</strong> Detectamos <strong>${failed_attempts} tentativas de login falhadas</strong> 
                para o email <strong>${email}</strong> nos últimos 15 minutos.
              </div>
              
              <div class="details">
                <h3 style="margin-top: 0;">📋 Detalhes do Evento</h3>
                <ul style="padding-left: 20px; margin: 0;">
                  <li><strong>Email:</strong> ${email}</li>
                  <li><strong>Tentativas falhadas:</strong> ${failed_attempts}</li>
                  <li><strong>Endereço IP:</strong> ${ip_address}</li>
                  <li><strong>Localização:</strong> ${location}</li>
                  <li><strong>Horário:</strong> ${timestamp}</li>
                </ul>
              </div>
              
              <div class="recommendations">
                <h3>🔐 Recomendações</h3>
                <ul style="padding-left: 20px;">
                  <li>Verifique se o usuário reconhece a atividade</li>
                  <li>Considere desconectar o usuário se a atividade for suspeita</li>
                  <li>Verifique se a conta pode ter sido comprometida</li>
                  <li>Considere solicitar alteração de senha</li>
                </ul>
              </div>
              
              <div class="footer">
                <p>Este é um email automático do sistema de segurança. Não responda a este email.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Security alert email sent:', emailResult);

    return new Response(
      JSON.stringify({ success: true, emailsSent: masterEmails.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in security-alert function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
