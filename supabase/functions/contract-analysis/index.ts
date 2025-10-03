import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to get current user ID from auth
async function getCurrentUserId(req: Request, supabase: any): Promise<string | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;
    
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (error || !user) return null;
    
    return user.id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// Helper function to send enriched payload to n8n
async function sendToN8n(payload: any, userId: string) {
  const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');
  
  if (!N8N_WEBHOOK_URL) {
    throw new Error('N8N_WEBHOOK_URL is not configured');
  }

  // Ensure user_id is always provided
  const enrichedPayload = {
    ...payload,
    conversation_id: payload.conversation_id || crypto.randomUUID(),
    session_id: payload.session_id || payload.conversation_id,
    user_id: userId || 'c3d7a5b9-8e2f-4a6d-9c1b-3e5f7a9b2d4e',
    timestamp: new Date().toISOString()
  };
  
  console.log('Sending enriched payload to n8n:', JSON.stringify(enrichedPayload, null, 2));
  
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enrichedPayload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('n8n webhook failed:', response.status, errorText);
    throw new Error(`n8n webhook failed: ${response.status}`);
  }
  
  return response;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      conversation_id,
      session_id,
      message_content,
      message_type,
      file_url,
      file_name,
      button_action
    } = await req.json();

    console.log('Processing request:', {
      message_type,
      file_name,
      message_content,
      button_action
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user ID
    const userId = await getCurrentUserId(req, supabase);
    console.log('Processing request for user:', userId);

    let analysisResult;
    let aiResponse;
    let actionButtons;

    // **ALWAYS CALL N8N WEBHOOK FOR ALL REQUESTS**
    try {
      // Prepare payload for n8n webhook
      const webhookPayload = {
        conversation_id,
        session_id,
        message_content: message_content || '',
        message_type,
        file_url: file_url || null,
        file_name: file_name || null,
        button_action: button_action || null
      };

      // Call n8n webhook with enriched payload
      const n8nResponse = await sendToN8n(webhookPayload, userId || 'c3d7a5b9-8e2f-4a6d-9c1b-3e5f7a9b2d4e');

      const responseText = await n8nResponse.text();
      console.log('n8n response status:', n8nResponse.status);
      console.log('n8n response body:', responseText);

      if (n8nResponse.ok) {
        try {
          // Handle empty response body
          if (!responseText || responseText.trim() === '') {
            console.log('Empty response from n8n, using fallback');
            aiResponse = "I received your message but got an empty response from the processing system. Please try again.";
            actionButtons = [];
            analysisResult = undefined;
          } else {
            const n8nResult = JSON.parse(responseText);
            console.log('n8n parsed result:', n8nResult);
            
            // Handle array response format from n8n (e.g., [{"output": "response text"}])
            if (Array.isArray(n8nResult) && n8nResult.length > 0) {
              const firstItem = n8nResult[0];
              console.log('Processing array response, first item:', firstItem);
              
              // Extract content from various possible fields in the array item
              aiResponse = firstItem.output || firstItem.content || firstItem.response || firstItem.message || firstItem.text;
              actionButtons = firstItem.action_buttons || firstItem.actions || [];
              analysisResult = firstItem.analysis || firstItem;
            } else {
              // Handle object response format
              aiResponse = n8nResult.content || n8nResult.response || n8nResult.message || n8nResult.text;
              actionButtons = n8nResult.action_buttons || n8nResult.actions || [];
              analysisResult = n8nResult.analysis || n8nResult;
            }
            
            if (!aiResponse) {
              console.error('No valid response content found in:', n8nResult);
              throw new Error('No response content from n8n webhook');
            }
          }
        } catch (parseError) {
          console.error('Failed to parse n8n response:', parseError);
          console.log('Raw response that failed to parse:', responseText);
          // Use the raw text as response if JSON parsing fails
          aiResponse = responseText || 'I received your message but the response format was invalid. Please check your n8n workflow configuration.';
          actionButtons = [];
        }
      } else {
        console.error('n8n webhook failed with status:', n8nResponse.status);
        console.error('n8n error response:', responseText);
        throw new Error(`n8n webhook failed with status: ${n8nResponse.status}`);
      }
    } catch (n8nError) {
      console.error('n8n webhook error:', n8nError);
      throw new Error(`n8n webhook failed: ${n8nError.message}`);
    }

    // If we get here, we have a response from n8n
    console.log('Final response:', { aiResponse, actionButtons, analysisResult });

    // Store contract data if it's a file upload
    if (file_name && file_url) {
      console.log('Creating contract record for file upload');
      const { error: contractError } = await supabase
        .from('contracts')
        .insert({
          conversation_id,
          file_name,
          file_url,
          full_text: analysisResult?.full_text || null,
          overview: analysisResult?.content || aiResponse || null
        });

      if (contractError) {
        console.error('Error storing contract:', contractError);
        // Don't throw error, just log it - we don't want to break the flow
      } else {
        console.log('Contract record created successfully');
      }
    }

    // Save AI message to database
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        content: aiResponse,
        sender_type: 'assistant',
        agent_used: 'n8n-workflow',
        action_buttons: actionButtons.length > 0 ? JSON.stringify(actionButtons) : null,
        metadata: { 
          message_type: file_name ? 'file_analysis' : button_action ? 'button_response' : 'text_response',
          n8n_processed: true,
          processed_at: new Date().toISOString(),
          ...(analysisResult && { analysis_result: analysisResult }),
          ...(file_name && { file_processed: file_name })
        }
      });

    if (messageError) {
      throw new Error(`Failed to save AI message: ${messageError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: analysisResult,
        message: 'n8n workflow completed successfully'
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