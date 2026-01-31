// @ts-nocheck - Table not yet in auto-generated types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportFilters {
  clientId?: string
  startDate?: string
  endDate?: string
  excludeTests?: boolean
}

async function processExport(
  supabaseAdmin: any,
  jobId: string,
  userId: string,
  filters: ExportFilters
) {
  console.log(`[Export ${jobId}] Starting background processing...`)
  
  try {
    // Update status to processing
    await supabaseAdmin
      .from('export_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId)

    // Use larger batch size for efficiency
    const PAGE_SIZE = 1000
    let allLeads: any[] = []
    let page = 0
    let hasMore = true

    // Select only needed fields for export - minimal set to reduce memory
    const selectFields = 'created_at,first_name,last_name,email,phone,source,utm_source,utm_medium,utm_campaign,utm_content,tags,page_url,country,city,traffic_type'

    // Fetch all leads in batches
    while (hasMore) {
      if (page > 0 && page % 20 === 0) {
        console.log(`[Export ${jobId}] Progress: ${allLeads.length} leads loaded...`)
      }
      
      let query = supabaseAdmin
        .from('leads')
        .select(selectFields)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId)
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      if (data && data.length > 0) {
        allLeads = allLeads.concat(data)
        page++
        hasMore = data.length === PAGE_SIZE
      } else {
        hasMore = false
      }
    }

    console.log(`[Export ${jobId}] Total leads fetched: ${allLeads.length}`)

    // Filter out test leads if requested
    if (filters.excludeTests) {
      allLeads = allLeads.filter(l => {
        if (!l.tags) return true
        return !l.tags.includes('[TESTE]') && !l.tags.toLowerCase().includes('teste')
      })
      console.log(`[Export ${jobId}] After filtering tests: ${allLeads.length} leads`)
    }

    // Generate CSV content efficiently using string concatenation
    const headers = 'Data,Nome,Email,Telefone,Fonte,UTM Source,UTM Medium,UTM Campaign,UTM Content,Tags,Página,País,Cidade,Tipo Tráfego'
    
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return date.toLocaleString('pt-BR', { 
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      })
    }

    const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`

    // Build CSV incrementally
    let csvParts: string[] = ['\uFEFF' + headers]
    
    for (const l of allLeads) {
      const row = [
        formatDate(l.created_at),
        `${l.first_name || ''} ${l.last_name || ''}`.trim(),
        l.email || '',
        l.phone || '',
        l.source || '',
        l.utm_source || '',
        l.utm_medium || '',
        l.utm_campaign || '',
        l.utm_content || '',
        l.tags || '',
        l.page_url || '',
        l.country || '',
        l.city || '',
        l.traffic_type || '',
      ].map(escapeCSV).join(',')
      
      csvParts.push(row)
    }

    const csv = csvParts.join('\n')
    console.log(`[Export ${jobId}] CSV generated, size: ${(csv.length / 1024 / 1024).toFixed(2)} MB`)

    // Generate file name
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-')
    const suffix = filters.excludeTests ? '-sem-testes' : ''
    const fileName = `leads${suffix}-${dateStr}-${timeStr}.csv`
    const filePath = `${userId}/${fileName}`

    console.log(`[Export ${jobId}] Uploading file: ${filePath}`)

    // Upload to storage - use text/csv without charset (Supabase doesn't support charset in MIME type)
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('exports')
      .upload(filePath, csv, {
        contentType: 'text/csv',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`)
    }

    // Update job status to ready
    await supabaseAdmin
      .from('export_jobs')
      .update({
        status: 'ready',
        file_path: filePath,
        file_name: fileName,
        total_records: allLeads.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log(`[Export ${jobId}] Completed successfully! ${allLeads.length} records exported.`)

  } catch (error: any) {
    console.error(`[Export ${jobId}] Error:`, error)
    
    // Update job status to error
    await supabaseAdmin
      .from('export_jobs')
      .update({
        status: 'error',
        error_message: error.message || 'Unknown error occurred',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Create admin client for background processing
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header to identify the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user client to get user info
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()
    const filters: ExportFilters = {
      clientId: body.clientId,
      startDate: body.startDate,
      endDate: body.endDate,
      excludeTests: body.excludeTests || false,
    }

    console.log(`[Export] Creating job for user ${user.id}`, filters)

    // Create export job in database
    const { data: job, error: jobError } = await supabaseAdmin
      .from('export_jobs')
      .insert({
        user_id: user.id,
        client_id: filters.clientId || null,
        export_type: 'leads',
        status: 'pending',
        filters: filters,
      })
      .select()
      .single()

    if (jobError || !job) {
      console.error('Failed to create job:', jobError)
      return new Response(
        JSON.stringify({ error: 'Failed to create export job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Export] Job created: ${job.id}`)

    // Start background processing using EdgeRuntime.waitUntil
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(processExport(supabaseAdmin, job.id, user.id, filters))

    // Return immediately with job info
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Exportação iniciada! Você será notificado quando estiver pronta.',
        jobId: job.id,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('Export function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
