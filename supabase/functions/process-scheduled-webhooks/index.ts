import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get current time in Brasília timezone (GMT-3)
function nowBrasilia(): Date {
  const now = new Date();
  const utcOffset = now.getTimezoneOffset() * 60000;
  const brasiliaOffset = -3 * 60 * 60 * 1000;
  return new Date(now.getTime() + utcOffset + brasiliaOffset);
}

// Parse cron expression and check if it matches current time
function shouldTriggerNow(cronExpression: string): boolean {
  const brasilia = nowBrasilia();
  const currentMinute = brasilia.getMinutes();
  const currentHour = brasilia.getHours();
  const currentDayOfMonth = brasilia.getDate();
  const currentMonth = brasilia.getMonth() + 1; // 1-12
  const currentDayOfWeek = brasilia.getDay(); // 0=Sunday, 1=Monday, etc.

  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    console.error(`Invalid cron expression: ${cronExpression}`);
    return false;
  }

  const [minuteExpr, hourExpr, dayOfMonthExpr, monthExpr, dayOfWeekExpr] = parts;

  // Check minute
  if (!matchesCronField(minuteExpr, currentMinute)) return false;
  
  // Check hour
  if (!matchesCronField(hourExpr, currentHour)) return false;
  
  // Check day of month
  if (!matchesCronField(dayOfMonthExpr, currentDayOfMonth)) return false;
  
  // Check month
  if (!matchesCronField(monthExpr, currentMonth)) return false;
  
  // Check day of week
  if (!matchesCronField(dayOfWeekExpr, currentDayOfWeek)) return false;

  return true;
}

// Match a cron field against a value
function matchesCronField(expr: string, value: number): boolean {
  if (expr === '*') return true;
  
  // Handle comma-separated values
  if (expr.includes(',')) {
    return expr.split(',').some(part => matchesCronField(part.trim(), value));
  }
  
  // Handle ranges (e.g., 1-5)
  if (expr.includes('-')) {
    const [start, end] = expr.split('-').map(Number);
    return value >= start && value <= end;
  }
  
  // Handle step values (e.g., */5)
  if (expr.includes('/')) {
    const [base, step] = expr.split('/');
    const stepNum = parseInt(step, 10);
    if (base === '*') {
      return value % stepNum === 0;
    }
    const baseNum = parseInt(base, 10);
    return value >= baseNum && (value - baseNum) % stepNum === 0;
  }
  
  // Direct number comparison
  return parseInt(expr, 10) === value;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const brasilia = nowBrasilia();
    console.log(`Processing scheduled webhooks at Brasília time: ${brasilia.toISOString()}`);

    // Fetch all active webhooks with a schedule
    const { data: webhooks, error: fetchError } = await supabase
      .from('external_webhooks')
      .select('*')
      .eq('is_active', true)
      .not('schedule', 'is', null);

    if (fetchError) {
      console.error('Error fetching webhooks:', fetchError);
      throw fetchError;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log('No active scheduled webhooks found');
      return new Response(
        JSON.stringify({ message: 'No active scheduled webhooks', triggered: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${webhooks.length} active webhooks with schedules`);

    const triggeredWebhooks: string[] = [];

    for (const webhook of webhooks) {
      const { id, name, schedule, user_id } = webhook;
      
      console.log(`Checking webhook "${name}" with schedule: ${schedule}`);
      
      if (shouldTriggerNow(schedule)) {
        console.log(`✅ Webhook "${name}" matches current time, triggering...`);
        
        try {
          // Call send-sales-summary edge function
          const response = await fetch(`${supabaseUrl}/functions/v1/send-sales-summary`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              webhook_id: id,
              user_id: user_id,
              manual: false,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to trigger webhook "${name}": ${errorText}`);
          } else {
            console.log(`✅ Successfully triggered webhook "${name}"`);
            triggeredWebhooks.push(name);
          }
        } catch (triggerError) {
          console.error(`Error triggering webhook "${name}":`, triggerError);
        }
      } else {
        console.log(`⏭️ Webhook "${name}" does not match current time, skipping`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${webhooks.length} webhooks, triggered ${triggeredWebhooks.length}`,
        triggered: triggeredWebhooks.length,
        webhooks: triggeredWebhooks,
        brasilia_time: brasilia.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing scheduled webhooks:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
