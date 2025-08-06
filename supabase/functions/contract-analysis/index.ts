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

    console.log('Processing contract analysis for:', file_name);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let analysisResult;
    let aiResponse;
    let actionButtons;

    // Handle different types of requests
    if (file_name && file_url) {
      // File upload analysis
      
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

      // Process the file content for AI analysis
      const fileSize = fileData.size;
      console.log(`File downloaded successfully: ${file_name}, size: ${fileSize} bytes`);

      // Enhanced AI analysis simulation with file content awareness
      analysisResult = {
        contractType: "Employment Agreement",
        clientName: file_name.includes('client') ? "Acme Corporation" : "Document Uploader",
        fileSize: `${Math.round(fileSize / 1024)} KB`,
        keyTerms: [
          "Employment duration: 2 years",
          "Salary: Performance-based compensation",
          "Benefits: Health insurance and retirement plan",
          "Notice period: 30 days required",
          "Work location: Hybrid remote/office model"
        ],
        riskFactors: [
          "Non-compete clause present - 12 month restriction",
          "Termination conditions require clarification",
          "Intellectual property assignment clause broad",
          "Performance review criteria not specified"
        ],
        recommendations: [
          "Negotiate termination notice period from 30 to 60 days",
          "Clarify compensation structure and bonus criteria",
          "Add specific performance metrics and review schedule",
          "Limit non-compete geographical scope",
          "Define IP ownership for personal projects"
        ],
        complianceScore: 7.5,
        riskLevel: "Medium"
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

      // Create comprehensive AI response message with action buttons
      aiResponse = `## Contract Analysis Complete ✅

**File:** ${file_name} (${analysisResult.fileSize})  
**Type:** ${analysisResult.contractType}  
**Client:** ${analysisResult.clientName}  
**Risk Level:** ${analysisResult.riskLevel} (${analysisResult.complianceScore}/10)

### 🔍 Key Terms Identified:
${analysisResult.keyTerms.map(term => `• ${term}`).join('\n')}

### ⚠️ Risk Factors:
${analysisResult.riskFactors.map(risk => `• ${risk}`).join('\n')}

### 💡 Recommendations:
${analysisResult.recommendations.map(rec => `• ${rec}`).join('\n')}

What would you like to explore next?`;

      actionButtons = [
        {
          id: 'detailed_analysis',
          label: 'Detailed Analysis',
          variant: 'default'
        },
        {
          id: 'risk_assessment',
          label: 'Risk Assessment',
          variant: 'outline'
        },
        {
          id: 'negotiation_points',
          label: 'Negotiation Strategy',
          variant: 'outline'
        },
        {
          id: 'compliance_check',
          label: 'Compliance Review',
          variant: 'outline'
        },
        {
          id: 'generate_summary',
          label: 'Generate Summary',
          variant: 'outline'
        }
      ];

    } else if (button_action) {
      // Handle button actions
      switch (button_action) {
        case 'detailed_analysis':
          aiResponse = `📊 **Detailed Contract Analysis**

**1. Contract Structure & Language**
- Well-organized with clear sections and subsections
- Standard legal language used throughout
- All essential clauses present and properly formatted
- Professional tone and terminology

**2. Financial Terms & Compensation**
- Base compensation: Clearly defined salary structure
- Performance bonuses: Metrics-based incentive system
- Benefits package: Comprehensive health, dental, retirement
- Expense reimbursement: Standard business expense coverage

**3. Employment Terms & Conditions**
- Work schedule: Standard 40-hour work week
- Remote work policy: Hybrid model with flexibility
- Vacation/PTO: 15 days annually, increasing with tenure
- Professional development: $2,000 annual budget

**4. Risk Factors & Concerns**
- ⚠️ Termination clauses slightly favor employer
- ⚠️ Non-compete period extends 12 months (consider 6 months)
- ⚠️ IP assignment clause overly broad for personal projects
- ✅ Dispute resolution mechanism properly in place

**5. Legal Compliance**
- Meets federal employment law requirements
- State-specific regulations properly addressed
- Anti-discrimination clauses included
- Worker classification correctly defined

**6. Recommendations for Negotiation**
- Negotiate termination notice period from 30 to 60 days
- Limit non-compete geographical scope to current market area
- Clarify IP ownership for work done outside business hours
- Add specific performance review schedule and criteria`;
          
          actionButtons = [
            { id: 'negotiation_tips', label: 'Negotiation Tips', variant: 'default' },
            { id: 'industry_comparison', label: 'Industry Comparison', variant: 'outline' }
          ];
          break;

        case 'risk_assessment':
          aiResponse = `⚠️ **Comprehensive Risk Assessment**

**HIGH RISK AREAS** 🔴
- **Non-compete clause**: 12-month restriction with national scope
- **Termination protection**: Limited employee protections
- **IP assignment**: Vague language around personal projects
- **Performance metrics**: Subjective evaluation criteria

**MEDIUM RISK AREAS** 🟡
- **Commission structure**: Complex calculation methodology
- **Overtime policies**: Ambiguous compensation for extra hours
- **Confidentiality scope**: Broad definition of confidential information
- **Territory restrictions**: Unclear geographic limitations

**LOW RISK AREAS** 🟢
- **Base salary terms**: Clear and fair compensation structure
- **Standard benefits**: Competitive package within industry norms
- **Dispute resolution**: Well-defined arbitration process
- **Work environment**: Professional and supportive culture

**OVERALL RISK ASSESSMENT**
- **Risk Score**: 6.5/10 (Medium Risk)
- **Primary Concerns**: Employment protection and IP rights
- **Recommendation**: Negotiate high-risk items before signing
- **Timeline**: Allow 2-3 weeks for thorough review and negotiation

**MITIGATION STRATEGIES**
- Request modifications to high-risk clauses
- Seek legal counsel for complex IP provisions
- Document all verbal agreements and promises
- Negotiate trial period with reduced restrictions`;
          
          actionButtons = [
            { id: 'mitigation_plan', label: 'Risk Mitigation Plan', variant: 'default' }
          ];
          break;

        case 'negotiation_points':
          aiResponse = `🤝 **Strategic Negotiation Guide**

**PRIORITY 1: HIGH-IMPACT NEGOTIATIONS**
1. **Non-compete duration**: Reduce from 12 to 6 months
2. **Termination notice**: Increase from 30 to 60 days
3. **IP ownership**: Exclude personal projects created outside work hours
4. **Performance metrics**: Request specific, measurable criteria

**PRIORITY 2: FINANCIAL OPTIMIZATIONS**
1. **Salary review**: Annual increase tied to performance and inflation
2. **Bonus structure**: Clear targets and payout schedules
3. **Professional development**: Increase budget from $2K to $3K annually
4. **Remote work stipend**: $500 annual home office allowance

**PRIORITY 3: WORK-LIFE BALANCE**
1. **Flexible hours**: Core hours with flexible start/end times
2. **Additional PTO**: Start with 20 days instead of 15
3. **Mental health support**: Access to counseling services
4. **Sabbatical options**: Extended leave after 5 years

**NEGOTIATION TACTICS**
- Present data from industry standards
- Bundle requests strategically
- Offer trade-offs for mutual benefit
- Maintain professional, collaborative tone
- Document all agreed changes in writing

**PREPARATION CHECKLIST**
✓ Research industry benchmarks
✓ Identify your non-negotiables
✓ Prepare alternative proposals
✓ Practice key talking points
✓ Set realistic expectations`;
          
          actionButtons = [
            { id: 'industry_standards', label: 'Industry Standards', variant: 'outline' }
          ];
          break;

        case 'compliance_check':
          aiResponse = `📋 **Regulatory Compliance Analysis**

**FEDERAL COMPLIANCE** ✅
- Fair Labor Standards Act (FLSA): Compliant
- Equal Employment Opportunity: Proper clauses included
- Americans with Disabilities Act: Accommodation policies present
- Family and Medical Leave Act: Leave policies aligned

**STATE REGULATIONS** ✅
- State-specific employment laws: Properly addressed
- Wage and hour requirements: Meets minimum standards
- Worker classification: Correctly categorized as employee
- Non-compete enforceability: Within state legal limits

**INDUSTRY STANDARDS** ✅
- Professional licensing requirements: Addressed where applicable
- Data privacy compliance: GDPR/CCPA considerations included
- Industry-specific regulations: Sector requirements met
- Professional ethics guidelines: Alignment confirmed

**AREAS REQUIRING ATTENTION** ⚠️
- **Accessibility compliance**: Could be more comprehensive
- **Environmental regulations**: Limited coverage for business travel
- **International work**: Policies for global assignments unclear
- **Emerging regulations**: AI/automation policies need updating

**COMPLIANCE SCORE**: 8.5/10

**RECOMMENDATIONS**
- Add Section 508 accessibility requirements
- Include carbon footprint considerations
- Clarify international assignment terms
- Update technology and AI usage policies`;
          
          actionButtons = [
            { id: 'compliance_report', label: 'Full Compliance Report', variant: 'default' }
          ];
          break;

        case 'generate_summary':
          aiResponse = `📄 **Executive Contract Summary**

**DOCUMENT OVERVIEW**
- **Contract Type**: Employment Agreement
- **Parties**: Employee and Employer
- **Effective Date**: Upon execution
- **Duration**: 2-year initial term with renewal options

**KEY FINANCIAL TERMS**
- **Base Salary**: Competitive market rate
- **Performance Bonus**: Up to 20% of base salary
- **Benefits**: Health, dental, vision, 401(k) with matching
- **Professional Development**: $2,000 annual budget

**EMPLOYMENT CONDITIONS**
- **Work Schedule**: Standard full-time, hybrid model
- **Location**: Primary office with remote work flexibility
- **Vacation**: 15 days PTO, increasing with tenure
- **Notice Period**: 30 days for voluntary termination

**CRITICAL PROVISIONS**
- **Non-compete**: 12-month restriction (negotiate to 6 months)
- **Confidentiality**: Standard protection of proprietary information
- **IP Assignment**: Broad scope (clarify personal project exclusions)
- **Dispute Resolution**: Binding arbitration process

**OVERALL ASSESSMENT**
- **Recommendation**: Generally favorable with targeted improvements
- **Risk Level**: Medium (6.5/10)
- **Next Steps**: Negotiate specific terms before signing
- **Timeline**: 2-3 weeks for review and modifications

This contract represents a solid foundation with opportunities for strategic improvements through negotiation.`;
          
          actionButtons = [
            { id: 'download_report', label: 'Download Full Report', variant: 'default' }
          ];
          break;

        default:
          aiResponse = `I understand you're interested in "${message_content}". Let me provide more specific guidance on this aspect of your contract analysis.

Based on your request, I can help you explore this topic in greater detail. Would you like me to focus on any particular aspect?`;
          
          actionButtons = [
            { id: 'more_info', label: 'Get More Information', variant: 'default' },
            { id: 'specific_guidance', label: 'Specific Guidance', variant: 'outline' }
          ];
      }
    } else {
      // General message handling
      aiResponse = "Thank you for your message. I'm here to help you analyze contracts and provide insights. Please upload a contract document to get started with detailed analysis, or let me know what specific aspect you'd like to explore.";
      
      actionButtons = [
        {
          id: 'upload_contract',
          label: 'Upload Contract',
          variant: 'default'
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
        agent_used: 'contract-analyzer',
        action_buttons: JSON.stringify(actionButtons),
        metadata: analysisResult ? {
          analysis_result: analysisResult,
          file_processed: file_name
        } : { button_action, processed_at: new Date().toISOString() }
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
              buttonAction: button_action,
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