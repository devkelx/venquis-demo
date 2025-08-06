import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      conversation_id, 
      file_name, 
      file_url, 
      message_content,
      zep_session_id 
    } = await req.json();

    console.log('Processing contract analysis for:', file_name);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('contracts')
      .download(file_url.replace('/storage/v1/object/public/contracts/', ''));

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Simulate AI analysis (in production, this would call your n8n webhook or AI service)
    const analysisResult = {
      contractType: "Employment Agreement",
      clientName: file_name.includes('client') ? "Acme Corporation" : "Unknown Client",
      keyTerms: [
        "Employment duration: 2 years",
        "Salary: Negotiable",
        "Benefits: Health insurance included",
        "Notice period: 30 days"
      ],
      riskFactors: [
        "Non-compete clause present",
        "Termination conditions unclear"
      ],
      recommendations: [
        "Review termination clauses",
        "Clarify compensation structure",
        "Add performance metrics"
      ]
    };

    // Store contract data
    const { error: contractError } = await supabase
      .from('contracts')
      .insert({
        conversation_id,
        file_name,
        file_url,
        client_name: analysisResult.clientName,
        extracted_terms: analysisResult,
        fees: "Standard rate applies",
        payment_terms: "Net 30 days"
      });

    if (contractError) {
      console.error('Error storing contract:', contractError);
    }

    // Create AI response message with action buttons
    const aiResponse = `## Contract Analysis Complete ✅

**File:** ${file_name}  
**Type:** ${analysisResult.contractType}  
**Client:** ${analysisResult.clientName}

### 🔍 Key Terms Identified:
${analysisResult.keyTerms.map(term => `• ${term}`).join('\n')}

### ⚠️ Risk Factors:
${analysisResult.riskFactors.map(risk => `• ${risk}`).join('\n')}

### 💡 Recommendations:
${analysisResult.recommendations.map(rec => `• ${rec}`).join('\n')}

What would you like to do next?`;

    const actionButtons = [
      {
        id: 'detailed_analysis',
        label: 'Get Detailed Analysis',
        variant: 'default'
      },
      {
        id: 'risk_assessment',
        label: 'Risk Assessment',
        variant: 'outline'
      },
      {
        id: 'generate_summary',
        label: 'Generate Summary',
        variant: 'outline'
      },
      {
        id: 'compare_contract',
        label: 'Compare with Standards',
        variant: 'outline'
      }
    ];

    // Save AI message to database
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        content: aiResponse,
        sender_type: 'assistant',
        agent_used: 'contract-analyzer',
        action_buttons: JSON.stringify(actionButtons),
        metadata: {
          analysis_result: analysisResult,
          file_processed: file_name
        }
      });

    if (messageError) {
      throw new Error(`Failed to save AI message: ${messageError.message}`);
    }

    // Store context in Zep if session provided
    if (zep_session_id) {
      try {
        await supabase.functions.invoke('zep-memory', {
          body: {
            action: 'store-context',
            session_id: zep_session_id,
            context: {
              contractData: analysisResult,
              fileName: file_name,
              analysisTimestamp: new Date().toISOString()
            }
          }
        });
      } catch (zepError) {
        console.error('Zep context storage failed:', zepError);
        // Continue execution even if Zep fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: analysisResult,
        message: 'Contract analysis completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Contract Analysis Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Analysis failed' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
})