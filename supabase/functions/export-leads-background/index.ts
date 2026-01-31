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

// Configuration
const BATCH_SIZE = 5000
const TIMEOUT_MS = 110_000 // 110 seconds safety margin (Edge Functions have ~150s limit)

// CSV generation helpers
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

const CSV_HEADERS = 'Data,Nome,Email,Telefone,Fonte,UTM Source,UTM Medium,UTM Campaign,UTM Content,Tags,Página,País,Cidade,Tipo Tráfego'

function leadToCSVRow(l: any): string {
  return [
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
}

async function updateProgress(supabaseAdmin: any, jobId: string, progress: number) {
  await supabaseAdmin
    .from('export_jobs')
    .update({ progress: Math.min(progress, 100) })
    .eq('id', jobId)
}

async function processExport(
  supabaseAdmin: any,
  jobId: string,
  userId: string,
  filters: ExportFilters
) {
  const startTime = Date.now()
  console.log(`[Export ${jobId}] Starting background processing...`)
  
  try {
    // Update status to processing
    await supabaseAdmin
      .from('export_jobs')
      .update({ status: 'processing', progress: 0 })
      .eq('id', jobId)

    // Select only needed fields for export - minimal set to reduce memory
    const selectFields = 'created_at,first_name,last_name,email,phone,source,utm_source,utm_medium,utm_campaign,utm_content,tags,page_url,country,city,traffic_type'

    // First, count total leads (quick query)
    let countQuery = supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })

    if (filters.clientId) {
      countQuery = countQuery.eq('client_id', filters.clientId)
    }
    if (filters.startDate) {
      countQuery = countQuery.gte('created_at', filters.startDate)
    }
    if (filters.endDate) {
      countQuery = countQuery.lte('created_at', filters.endDate)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      throw new Error(`Count error: ${countError.message}`)
    }

    console.log(`[Export ${jobId}] Total leads to process: ${totalCount}`)

    if (totalCount === 0) {
      // No leads to export
      await supabaseAdmin
        .from('export_jobs')
        .update({
          status: 'error',
          error_message: 'Nenhum lead encontrado para o período selecionado',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
      return
    }

    // Process in batches
    const csvParts: string[] = ['\uFEFF' + CSV_HEADERS]
    let processedCount = 0
    let page = 0
    let hasMore = true
    let filteredCount = 0

    while (hasMore) {
      // Check timeout
      if (Date.now() - startTime > TIMEOUT_MS) {
        throw new Error('Timeout: exportação interrompida por limite de tempo. Tente exportar um período menor.')
      }

      let query = supabaseAdmin
        .from('leads')
        .select(selectFields, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1)
        .limit(BATCH_SIZE)

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
        // Filter and convert to CSV rows
        for (const lead of data) {
          // Skip test leads if requested
          if (filters.excludeTests && lead.tags) {
            if (lead.tags.includes('[TESTE]') || lead.tags.toLowerCase().includes('teste')) {
              continue
            }
          }
          csvParts.push(leadToCSVRow(lead))
          filteredCount++
        }

        processedCount += data.length
        page++
        hasMore = data.length === BATCH_SIZE

        // Update progress
        const progress = Math.round((processedCount / totalCount) * 100)
        await updateProgress(supabaseAdmin, jobId, progress)

        // Log progress every 20 pages
        if (page % 20 === 0) {
          console.log(`[Export ${jobId}] Progress: ${processedCount}/${totalCount} (${progress}%)`)
        }
      } else {
        hasMore = false
      }
    }

    console.log(`[Export ${jobId}] Processing complete: ${filteredCount} leads after filtering`)

    // Generate final CSV
    const csv = csvParts.join('\n')
    console.log(`[Export ${jobId}] CSV generated, size: ${(csv.length / 1024 / 1024).toFixed(2)} MB`)

    // Check timeout before upload
    if (Date.now() - startTime > TIMEOUT_MS) {
      throw new Error('Timeout: exportação interrompida antes do upload. Tente exportar um período menor.')
    }

    // Generate file name
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '-')
    const suffix = filters.excludeTests ? '-sem-testes' : ''
    const fileName = `leads${suffix}-${dateStr}-${timeStr}.csv`
    const filePath = `${userId}/${fileName}`

    console.log(`[Export ${jobId}] Uploading file: ${filePath}`)

    // Upload to storage
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
        total_records: filteredCount,
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[Export ${jobId}] Completed successfully! ${filteredCount} records exported in ${duration}s.`)

  } catch (error: any) {
    console.error(`[Export ${jobId}] Error:`, error)
    
    // Update job status to error
    await supabaseAdmin
      .from('export_jobs')
      .update({
        status: 'error',
        error_message: error.message || 'Erro desconhecido durante a exportação',
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
        progress: 0,
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
