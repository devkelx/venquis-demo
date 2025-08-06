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
      zep_session_id,
      button_action
    } = await req.json();

    console.log('Processing request:', {
      type: file_name ? 'file_upload' : button_action ? 'button_action' : 'text_message',
      file_name,
      message_content,
      button_action
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let analysisResult;
    let aiResponse;
    let actionButtons;

    // **ALWAYS CALL N8N WEBHOOK FOR ALL REQUESTS**
    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');
    
    if (N8N_WEBHOOK_URL) {
      console.log('Calling n8n webhook:', N8N_WEBHOOK_URL);
      
      try {
        // Prepare payload for n8n webhook
        const webhookPayload = {
          conversation_id,
          zep_session_id,
          timestamp: new Date().toISOString(),
          user_context: {
            action: file_name ? 'contract_analysis' : button_action ? 'button_action' : 'chat_message',
            source: 'venquis_platform'
          }
        };

        // Add file-specific data if it's a file upload
        if (file_name && file_url) {
          // Extract the storage path from the public URL
          let storagePath = file_url;
          if (file_url.includes('/storage/v1/object/public/contracts/')) {
            storagePath = file_url.split('/storage/v1/object/public/contracts/')[1];
          }

          // Get file from storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('contracts')
            .download(storagePath);

          if (downloadError) {
            console.error('Download error:', downloadError);
            throw new Error(`Failed to download file: ${downloadError.message}`);
          }

          const fileSize = fileData.size;
          console.log(`File downloaded successfully: ${file_name}, size: ${fileSize} bytes`);

          // Add file data to payload
          Object.assign(webhookPayload, {
            file_name,
            file_url,
            file_size: fileSize,
            message_type: 'file_upload'
          });
        } else {
          // Add text message data to payload
          Object.assign(webhookPayload, {
            message_content,
            button_action,
            message_type: button_action ? 'button_action' : 'text_message'
          });
        }

        console.log('Sending to n8n:', JSON.stringify(webhookPayload, null, 2));

        // Call n8n webhook
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload)
        });

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
              
              // Use the response from n8n (prioritize 'content' field as shown in n8n config)
              aiResponse = n8nResult.content || n8nResult.response || n8nResult.message || n8nResult.text;
              actionButtons = n8nResult.action_buttons || n8nResult.actions || [];
              analysisResult = n8nResult.analysis || n8nResult;
              
              if (!aiResponse) {
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
    } else {
      throw new Error('N8N_WEBHOOK_URL is not configured - please add it to your secrets');
    }

    // If we get here, we have a response from n8n
    console.log('Final response:', { aiResponse, actionButtons, analysisResult });

    // Store contract data if it's a file upload
    if (file_name && file_url) {
      const { error: contractError } = await supabase
        .from('contracts')
        .insert({
          conversation_id,
          file_name,
          file_url,
          client_name: analysisResult?.clientName || 'Unknown Client',
          extracted_terms: analysisResult,
          fees: "Standard rate applies",
          payment_terms: "Net 30 days"
        });

      if (contractError) {
        console.error('Error storing contract:', contractError);
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

    // Store context in Zep if session provided
    if (zep_session_id) {
      try {
        await supabase.functions.invoke('zep-memory', {
          body: {
            action: 'add-memory',
            session_id: zep_session_id,
            message: {
              role: 'assistant',
              content: aiResponse,
              metadata: {
                message_type: file_name ? 'file_analysis' : button_action ? 'button_response' : 'text_response',
                conversation_id,
                n8n_processed: true
              }
            }
          }
        });
      } catch (zepError) {
        console.error('Zep memory storage failed:', zepError);
        // Continue execution even if Zep fails
      }
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