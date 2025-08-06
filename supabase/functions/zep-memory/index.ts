import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZepMemoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

interface ZepContractContext {
  contractData?: Record<string, any>;
  analysisData?: Record<string, any>;
  fileName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, session_id, message, context, query, limit = 50 } = await req.json();
    
    const ZEP_API_KEY = Deno.env.get('ZEP_API_KEY');
    const ZEP_API_URL = Deno.env.get('ZEP_API_URL');

    if (!ZEP_API_KEY || !ZEP_API_URL) {
      throw new Error('Zep API credentials not configured');
    }

    const zepHeaders = {
      'Authorization': `Bearer ${ZEP_API_KEY}`,
      'Content-Type': 'application/json',
    };

    let response;

    switch (action) {
      case 'initialize-session':
        // Create or initialize a Zep session
        response = await fetch(`${ZEP_API_URL}/sessions/${session_id}`, {
          method: 'POST',
          headers: zepHeaders,
          body: JSON.stringify({
            session_id,
            metadata: {
              created_at: new Date().toISOString(),
              user_type: 'contract_analysis'
            }
          })
        });
        
        if (!response.ok && response.status !== 409) { // 409 = session already exists
          throw new Error(`Failed to initialize Zep session: ${response.statusText}`);
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'add-memory':
        // Add a message to Zep memory
        response = await fetch(`${ZEP_API_URL}/sessions/${session_id}/memory`, {
          method: 'POST',
          headers: zepHeaders,
          body: JSON.stringify({
            messages: [message],
            metadata: message.metadata || {}
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to add memory: ${response.statusText}`);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get-memory':
        // Retrieve memory for a session
        response = await fetch(`${ZEP_API_URL}/sessions/${session_id}/memory?limit=${limit}`, {
          method: 'GET',
          headers: zepHeaders,
        });

        if (!response.ok) {
          throw new Error(`Failed to get memory: ${response.statusText}`);
        }

        const memoryData = await response.json();
        
        return new Response(JSON.stringify({ 
          messages: memoryData.messages || [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'search-memory':
        // Search memory with a query
        response = await fetch(`${ZEP_API_URL}/sessions/${session_id}/search`, {
          method: 'POST',
          headers: zepHeaders,
          body: JSON.stringify({
            text: query,
            limit: limit || 10
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to search memory: ${response.statusText}`);
        }

        const searchData = await response.json();
        
        return new Response(JSON.stringify({ 
          messages: searchData.results || [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'store-context':
        // Store contract context as metadata
        response = await fetch(`${ZEP_API_URL}/sessions/${session_id}/memory`, {
          method: 'POST',
          headers: zepHeaders,
          body: JSON.stringify({
            messages: [{
              role: 'system',
              content: 'Contract context stored',
              metadata: context
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to store context: ${response.statusText}`);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Zep Memory Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
})