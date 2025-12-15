import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= Formatting Functions =============

function formatDateBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatUSD(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' });
}

function formatPercent(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

// ============= Interfaces =============

interface RawSalesData {
  total_brl: number;
  total_usd: number;
  transactions_count: number;
}

interface RawPlatformData {
  hotmart: {
    total_brl: number;
    total_usd: number;
    transactions: number;
  };
  tmb: {
    total_brl: number;
    transactions: number;
  };
}

interface RawGoalData {
  active_goal: string | null;
  target_value: number;
  currency: string;
  current_progress: number;
  progress_percent: number;
  remaining: {
    total: number;
    per_day: number;
    per_week: number;
    per_month: number;
  };
  time_remaining: {
    days: number;
    weeks: number;
    months: number;
  };
}

interface VerbosePayload {
  date: string;
  timestamp: string;
  custom_text_start: string | null;
  custom_text_end: string | null;
  message: {
    custom_intro: string | null;
    title: string;
    hotmart: {
      header: string;
      transactions: string;
      total_brl: string;
      total_usd: string;
    };
    tmb: {
      header: string;
      transactions: string;
      total_brl: string;
    };
    combined: {
      header: string;
      transactions: string;
      total_brl: string;
      total_usd: string;
    };
    goals: {
      header: string;
      target: string;
      current: string;
      remaining: string;
      daily: string;
      weekly: string;
      monthly: string;
      time_remaining: string;
    } | null;
    custom_outro: string | null;
  };
  raw_data: {
    sales_today: RawSalesData;
    sales_by_platform: RawPlatformData;
    goals: RawGoalData | null;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { webhook_id, user_id, manual = false } = await req.json();

    console.log(`[send-sales-summary] Starting dispatch for webhook_id: ${webhook_id}, user_id: ${user_id}, manual: ${manual}`);

    if (!webhook_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'webhook_id and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get webhook configuration
    const { data: webhook, error: webhookError } = await supabase
      .from('external_webhooks')
      .select('*')
      .eq('id', webhook_id)
      .eq('user_id', user_id)
      .single();

    if (webhookError || !webhook) {
      console.error('[send-sales-summary] Webhook not found:', webhookError);
      return new Response(
        JSON.stringify({ error: 'Webhook not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!webhook.is_active) {
      return new Response(
        JSON.stringify({ error: 'Webhook is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Fetch Hotmart sales for today
    const { data: hotmartSales, error: hotmartError } = await supabase
      .from('transactions')
      .select('computed_value, currency')
      .eq('user_id', user_id)
      .gte('purchase_date', startOfDay.toISOString())
      .lte('purchase_date', endOfDay.toISOString());

    if (hotmartError) {
      console.error('[send-sales-summary] Error fetching Hotmart sales:', hotmartError);
    }

    // Fetch TMB sales for today
    const { data: tmbSales, error: tmbError } = await supabase
      .from('tmb_transactions')
      .select('ticket_value')
      .eq('user_id', user_id)
      .gte('effective_date', startOfDay.toISOString())
      .lte('effective_date', endOfDay.toISOString());

    if (tmbError) {
      console.error('[send-sales-summary] Error fetching TMB sales:', tmbError);
    }

    // Calculate Hotmart totals
    const hotmartBrl = (hotmartSales || [])
      .filter(s => s.currency === 'BRL')
      .reduce((sum, s) => sum + Number(s.computed_value), 0);
    const hotmartUsd = (hotmartSales || [])
      .filter(s => s.currency === 'USD')
      .reduce((sum, s) => sum + Number(s.computed_value), 0);
    const hotmartCount = hotmartSales?.length || 0;

    // Calculate TMB totals
    const tmbBrl = (tmbSales || []).reduce((sum, s) => sum + Number(s.ticket_value), 0);
    const tmbCount = tmbSales?.length || 0;

    // Combined totals
    const totalBrl = hotmartBrl + tmbBrl;
    const totalUsd = hotmartUsd;
    const totalTransactions = hotmartCount + tmbCount;

    // Fetch active goal
    const { data: activeGoal } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .lte('start_date', today.toISOString().split('T')[0])
      .gte('end_date', today.toISOString().split('T')[0])
      .maybeSingle();

    let goalsRawData: RawGoalData | null = null;

    if (activeGoal) {
      // Get all sales within goal period using RPC functions (with deduplication logic)
      const { data: hotmartStats, error: hotmartStatsError } = await supabase.rpc('get_transaction_stats', {
        p_start_date: activeGoal.start_date,
        p_end_date: activeGoal.end_date + 'T23:59:59Z',
      });

      if (hotmartStatsError) {
        console.error('[send-sales-summary] Error fetching Hotmart stats via RPC:', hotmartStatsError);
      }

      const { data: tmbStats, error: tmbStatsError } = await supabase.rpc('get_tmb_transaction_stats', {
        p_start_date: activeGoal.start_date,
        p_end_date: activeGoal.end_date + 'T23:59:59Z',
      });

      if (tmbStatsError) {
        console.error('[send-sales-summary] Error fetching TMB stats via RPC:', tmbStatsError);
      }

      // Calculate total based on goal currency using RPC results (with Recuperador Inteligente deduplication)
      let currentProgress = 0;
      if (activeGoal.currency === 'BRL') {
        const hotmartBrlProgress = hotmartStats?.total_by_currency?.BRL || 0;
        const tmbBrlProgress = tmbStats?.total_brl || 0;
        currentProgress = hotmartBrlProgress + tmbBrlProgress;
      } else if (activeGoal.currency === 'USD') {
        currentProgress = hotmartStats?.total_by_currency?.USD || 0;
      }

      // Calculate time remaining
      const endDate = new Date(activeGoal.end_date);
      const diffTime = endDate.getTime() - today.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const weeksRemaining = Math.max(0, Math.ceil(daysRemaining / 7));
      const monthsRemaining = Math.max(0, Math.ceil(daysRemaining / 30));

      const remaining = Math.max(0, activeGoal.target_value - currentProgress);
      const progressPercent = activeGoal.target_value > 0 
        ? Math.min(100, (currentProgress / activeGoal.target_value) * 100)
        : 0;

      goalsRawData = {
        active_goal: activeGoal.name,
        target_value: activeGoal.target_value,
        currency: activeGoal.currency,
        current_progress: currentProgress,
        progress_percent: Math.round(progressPercent * 100) / 100,
        remaining: {
          total: remaining,
          per_day: daysRemaining > 0 ? remaining / daysRemaining : remaining,
          per_week: weeksRemaining > 0 ? remaining / weeksRemaining : remaining,
          per_month: monthsRemaining > 0 ? remaining / monthsRemaining : remaining,
        },
        time_remaining: {
          days: daysRemaining,
          weeks: weeksRemaining,
          months: monthsRemaining,
        },
      };
    }

    // Build formatted date
    const formattedDate = formatDateBR(today);

    // Get custom text from webhook
    const customTextStart = webhook.custom_text_start || null;
    const customTextEnd = webhook.custom_text_end || null;

    // Build verbose message
    const message = {
      custom_intro: customTextStart,
      title: `📊 Resumo de Vendas - ${formattedDate}`,
      
      hotmart: {
        header: "🔥 HOTMART",
        transactions: `Vendas realizadas hoje: ${hotmartCount}`,
        total_brl: `Valor em Reais: ${formatBRL(hotmartBrl)}`,
        total_usd: `Valor em Dólares: ${formatUSD(hotmartUsd)}`,
      },
      
      tmb: {
        header: "💳 TMB",
        transactions: `Vendas realizadas hoje: ${tmbCount}`,
        total_brl: `Valor em Reais: ${formatBRL(tmbBrl)}`,
      },
      
      combined: {
        header: "📈 TOTAL CONSOLIDADO",
        transactions: `Total de vendas hoje: ${totalTransactions}`,
        total_brl: `Total em Reais: ${formatBRL(totalBrl)}`,
        total_usd: `Total em Dólares: ${formatUSD(totalUsd)}`,
      },
      
      goals: goalsRawData ? {
        header: `🎯 META: ${goalsRawData.active_goal}`,
        target: `Meta Global: ${goalsRawData.currency === 'BRL' ? formatBRL(goalsRawData.target_value) : formatUSD(goalsRawData.target_value)}`,
        current: `Faturamento Atual: ${goalsRawData.currency === 'BRL' ? formatBRL(goalsRawData.current_progress) : formatUSD(goalsRawData.current_progress)} (${formatPercent(goalsRawData.progress_percent)})`,
        remaining: `Falta: ${goalsRawData.currency === 'BRL' ? formatBRL(goalsRawData.remaining.total) : formatUSD(goalsRawData.remaining.total)}`,
        daily: `Meta Diária: ${goalsRawData.currency === 'BRL' ? formatBRL(goalsRawData.remaining.per_day) : formatUSD(goalsRawData.remaining.per_day)}`,
        weekly: `Meta Semanal: ${goalsRawData.currency === 'BRL' ? formatBRL(goalsRawData.remaining.per_week) : formatUSD(goalsRawData.remaining.per_week)}`,
        monthly: `Meta Mensal: ${goalsRawData.currency === 'BRL' ? formatBRL(goalsRawData.remaining.per_month) : formatUSD(goalsRawData.remaining.per_month)}`,
        time_remaining: `⏱️ Tempo restante: ${goalsRawData.time_remaining.days} dias`,
      } : null,
      custom_outro: customTextEnd,
    };

    // Build payload with both formatted message and raw data
    const payload: VerbosePayload = {
      date: formattedDate,
      timestamp: today.toISOString(),
      custom_text_start: customTextStart,
      custom_text_end: customTextEnd,
      message,
      raw_data: {
        sales_today: {
          total_brl: totalBrl,
          total_usd: totalUsd,
          transactions_count: totalTransactions,
        },
        sales_by_platform: {
          hotmart: {
            total_brl: hotmartBrl,
            total_usd: hotmartUsd,
            transactions: hotmartCount,
          },
          tmb: {
            total_brl: tmbBrl,
            transactions: tmbCount,
          },
        },
        goals: goalsRawData,
      },
    };

    console.log('[send-sales-summary] Payload built:', JSON.stringify(payload));

    // Send webhook
    let dispatchStatus = 'success';
    let responseCode: number | null = null;
    let errorMessage: string | null = null;

    try {
      const webhookResponse = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      responseCode = webhookResponse.status;

      if (!webhookResponse.ok) {
        dispatchStatus = 'error';
        errorMessage = `HTTP ${webhookResponse.status}: ${await webhookResponse.text()}`;
        console.error('[send-sales-summary] Webhook dispatch failed:', errorMessage);
      } else {
        console.log('[send-sales-summary] Webhook dispatched successfully');
      }
    } catch (fetchError) {
      dispatchStatus = 'error';
      errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
      console.error('[send-sales-summary] Fetch error:', errorMessage);
    }

    // Log dispatch
    await supabase.from('webhook_dispatch_logs').insert({
      webhook_id: webhook.id,
      user_id: user_id,
      status: dispatchStatus,
      response_code: responseCode,
      error_message: errorMessage,
      payload: payload,
    });

    // Update last_triggered_at
    await supabase
      .from('external_webhooks')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', webhook.id);

    return new Response(
      JSON.stringify({ 
        success: dispatchStatus === 'success',
        status: dispatchStatus,
        response_code: responseCode,
        error_message: errorMessage,
        payload: payload,
      }),
      { 
        status: dispatchStatus === 'success' ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[send-sales-summary] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
