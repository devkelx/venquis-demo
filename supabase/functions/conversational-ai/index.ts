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
      message_content,
      zep_session_id
    } = await req.json();

    console.log('Processing conversational AI for message:', message_content);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate contextual AI response based on the message
    let aiResponse: string;
    let actionButtons: any[] = [];

    // Simple conversational AI responses
    const lowerMessage = message_content.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      aiResponse = `Hello! I'm your AI contract analysis assistant. I'm here to help you review, analyze, and understand employment contracts and legal documents.

**What I can help you with:**
• 📄 Contract analysis and risk assessment
• ⚖️ Legal clause interpretation and compliance
• 💼 Negotiation strategy and recommendations
• 🔍 Key terms extraction and review

To get started, simply upload a contract document or ask me any questions about contract law!`;

      actionButtons = [
        {
          id: 'upload_contract',
          label: 'Upload Contract',
          variant: 'default'
        },
        {
          id: 'contract_tips',
          label: 'Contract Review Tips',
          variant: 'outline'
        }
      ];
    } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      aiResponse = `I'm specialized in contract analysis and legal document review. Here's how I can assist you:

**📋 Contract Analysis Services:**
• Risk assessment and compliance review
• Key terms and clause interpretation
• Industry standard comparisons
• Negotiation recommendations

**🔍 Document Processing:**
• Employment agreements
• Non-disclosure agreements (NDAs)
• Service contracts
• Consulting agreements

**💡 Advisory Services:**
• Legal compliance guidance
• Contract negotiation strategies
• Risk mitigation recommendations
• Industry benchmarking

Would you like to upload a contract for analysis, or do you have specific questions about contract law?`;

      actionButtons = [
        {
          id: 'upload_contract',
          label: 'Upload Document',
          variant: 'default'
        },
        {
          id: 'ask_legal_question',
          label: 'Ask Legal Question',
          variant: 'outline'
        }
      ];
    } else if (lowerMessage.includes('contract') || lowerMessage.includes('legal') || lowerMessage.includes('agreement')) {
      aiResponse = `I'd be happy to help you with contract-related questions! 

For the most accurate and detailed analysis, I recommend uploading your specific contract document. However, I can also provide general guidance on:

• **Contract terms** - Understanding complex legal language
• **Risk factors** - Identifying potential issues or red flags
• **Negotiation points** - Areas where you might have leverage
• **Industry standards** - How your contract compares to typical agreements

What specific aspect of contract law would you like to explore, or would you prefer to upload a document for detailed analysis?`;

      actionButtons = [
        {
          id: 'upload_contract',
          label: 'Upload for Analysis',
          variant: 'default'
        },
        {
          id: 'general_advice',
          label: 'General Contract Advice',
          variant: 'outline'
        },
        {
          id: 'negotiation_tips',
          label: 'Negotiation Strategies',
          variant: 'outline'
        }
      ];
    } else {
      aiResponse = `Thank you for your message! I'm your contract analysis specialist, and I'm here to help you navigate legal documents and employment agreements.

While I understand your question, I can provide the most value by analyzing specific contract documents. For general inquiries, I can offer guidance on:

• Contract review best practices
• Common legal terms and clauses
• Risk assessment strategies
• Negotiation approaches

Would you like to upload a contract for detailed analysis, or shall I provide general information on a specific contract-related topic?`;

      actionButtons = [
        {
          id: 'upload_contract',
          label: 'Upload Contract',
          variant: 'default'
        },
        {
          id: 'general_guidance',
          label: 'General Guidance',
          variant: 'outline'
        }
      ];
    }

    // Save AI message to database
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        content: aiResponse,
        sender_type: 'assistant',
        agent_used: 'conversational-ai',
        action_buttons: JSON.stringify(actionButtons),
        metadata: { 
          message_type: 'conversational_response',
          processed_at: new Date().toISOString() 
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
                message_type: 'conversational_response',
                conversation_id
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
        message: 'Conversational AI response generated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Conversational AI Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Conversational AI failed' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
})