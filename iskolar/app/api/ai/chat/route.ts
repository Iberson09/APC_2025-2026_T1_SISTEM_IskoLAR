import { NextRequest, NextResponse } from 'next/server';
import { FAQ_KNOWLEDGE_BASE } from '@/app/components/chatbot/constants';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set in environment variables');
}

const systemInstruction = `You are ISKAi, a remarkably friendly, polite, and helpful AI assistant for the IskoLAR scholarship system.
Your primary goal is to answer user questions based ONLY on the provided 'Frequently Asked Questions (FAQs)' section.

Always use markdown bold formatting (**text**) to highlight important keywords, clickable items, or key actions for the user. For example: "You can find this on your **Profile** page." or "Click **Save Changes** to continue."

If the user asks a question that requires personal data—like 'disbursement schedule', 'application status', 'my profile', 'my name', 'my information', 'my application', 'announcements', 'latest news', 'my account', 'my details', or anything specific to their personal account—you MUST respond with ONLY the following JSON object: {"tool_code": "FETCH_USER_DATA", "query": "[user's original query]"}. Do not add any other text or explanation.

Examples of personal queries that need FETCH_USER_DATA:
- "What is my application status?"
- "Show me my profile"
- "What are the latest announcements?"
- "When is my disbursement?"
- "What's my name?"
- "Tell me about my account"
- "Do I have any updates?"

If you cannot answer a question from the provided FAQs, politely say something like, "That's a great question! I don't have that information right now, but the scholarship office would be the best place to ask."

Keep your answers concise, exceptionally friendly, and clear. Do not make up information.
Base all your general knowledge answers on the following text:
${FAQ_KNOWLEDGE_BASE}
`;

export async function POST(request: NextRequest) {
  try {
    const { messages, query } = await request.json();

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Build conversation history for context
    const conversationHistory = messages
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join('\n');

    const fullPrompt = `${systemInstruction}\n\n--- Conversation History ---\n${conversationHistory}\n\nuser: ${query}`;

    // Call Google Gemini API with timeout
    console.log('[ISKAi] Calling Gemini API...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Use gemini-2.5-flash which is the stable version available with this API key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[ISKAi] Gemini API error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to get response from Gemini API', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[ISKAi] Gemini response received');
    
    const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "I'm sorry, I couldn't process that request.";

    console.log('[ISKAi] Bot response:', botResponse.substring(0, 100));

    // Check if response is asking for user data
    try {
      const parsedResponse = JSON.parse(botResponse);
      if (parsedResponse.tool_code === 'FETCH_USER_DATA') {
        console.log('[ISKAi] Fetching user data for query:', parsedResponse.query);
        // Fetch real user data from Supabase
        const userData = await fetchUserData(parsedResponse.query, request);
        return NextResponse.json({ message: userData });
      }
    } catch {
      // Not JSON, just a regular response
    }

    return NextResponse.json({ message: botResponse });
  } catch (error) {
    console.error('[ISKAi] Error in chat API:', error);
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { message: "I'm taking a bit longer than usual to respond. Please try asking your question again!" },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { message: "Sorry, I'm having trouble connecting right now. Please try again in a moment!" },
      { status: 200 }
    );
  }
}

async function fetchUserData(query: string, request: NextRequest): Promise<string> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    // Create Supabase client with the request context to get the authenticated user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || '',
          },
        },
      }
    );

    // Get the authenticated user from the session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return "I need you to be logged in to fetch your personal information. Please make sure you're logged in!";
    }

    // Extract token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return "I'm having trouble verifying your identity. Please try logging out and back in.";
    }

    const lowerCaseQuery = query.toLowerCase();

    // Fetch Profile Information
    if (lowerCaseQuery.includes('profile') || lowerCaseQuery.includes('name') || lowerCaseQuery.includes('my info')) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('first_name, last_name, email_address, contact_number, year_level, gpa')
        .eq('email_address', user.email)
        .single();

      if (userError || !userData) {
        return "I couldn't find your profile information. Please make sure your profile is set up correctly.";
      }

      return `Here's your profile information:

**Name:** ${userData.first_name} ${userData.last_name}
**Email:** ${userData.email_address}
**Contact:** ${userData.contact_number || 'Not provided'}
**Year Level:** ${userData.year_level || 'Not provided'}
**GPA:** ${userData.gpa || 'Not provided'}

You can update these details in the **Profile** section.`;
    }

    // Fetch Application Status
    if (lowerCaseQuery.includes('status') || lowerCaseQuery.includes('application')) {
      const { data: userData } = await supabase
        .from('users')
        .select('user_id')
        .eq('email_address', user.email)
        .single();

      if (!userData) {
        return "I couldn't find your user record.";
      }

      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('application_status, created_at, semester_id')
        .eq('user_id', userData.user_id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (appError) {
        console.error('Application error:', appError);
        return "I'm having trouble fetching your application status. Please try again later.";
      }

      if (!applications || applications.length === 0) {
        return "You don't have any applications yet. To apply, go to **Scholarship → A.Y. 2025-2026 → 1st Semester → Application**.";
      }

      const latestApp = applications[0];
      const statusDisplay = latestApp.application_status || 'pending';
      const date = new Date(latestApp.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      let response = `**Your Latest Application Status:**\n\n**Status:** ${statusDisplay.toUpperCase()}\n**Submitted:** ${date}`;

      if (applications.length > 1) {
        response += `\n\nYou have **${applications.length}** total applications. Visit **Scholarship → Status** to see all details.`;
      }

      return response;
    }

    // Fetch Announcements
    if (lowerCaseQuery.includes('announcement') || lowerCaseQuery.includes('news') || lowerCaseQuery.includes('update')) {
      const { data: announcements, error: announcementError } = await supabase
        .from('announcements')
        .select('title, content, publish_date')
        .order('publish_date', { ascending: false })
        .limit(3);

      if (announcementError) {
        return "I'm having trouble fetching announcements. Please check the **Announcements** section directly.";
      }

      if (!announcements || announcements.length === 0) {
        return "There are no announcements at the moment. Check back later or visit the **Announcements** page for updates!";
      }

      let response = "**Latest Announcements:**\n\n";
      announcements.forEach((ann, index) => {
        const date = ann.publish_date ? new Date(ann.publish_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent';
        response += `${index + 1}. **${ann.title}** (${date})\n`;
        if (ann.content) {
          const preview = ann.content.length > 100 ? ann.content.substring(0, 100) + '...' : ann.content;
          response += `   ${preview}\n\n`;
        }
      });

      response += "Visit the **Announcements** page to read more!";
      return response;
    }

    // Fetch Disbursement Schedule (if table exists)
    if (lowerCaseQuery.includes('disbursement') || lowerCaseQuery.includes('schedule') || lowerCaseQuery.includes('payment')) {
      // Check announcements for disbursement info
      const { data: announcements } = await supabase
        .from('announcements')
        .select('title, content, publish_date')
        .or('title.ilike.%disbursement%,content.ilike.%disbursement%')
        .order('publish_date', { ascending: false })
        .limit(2);

      if (announcements && announcements.length > 0) {
        let response = "**Disbursement Information:**\n\n";
        announcements.forEach((ann, index) => {
          const date = ann.publish_date ? new Date(ann.publish_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent';
          response += `${index + 1}. **${ann.title}** (${date})\n`;
          if (ann.content) {
            const preview = ann.content.length > 150 ? ann.content.substring(0, 150) + '...' : ann.content;
            response += `   ${preview}\n\n`;
          }
        });
        response += "Check the **Announcements** page for full details!";
        return response;
      }

      return "Disbursement schedules are typically posted in the **Announcements** section. Please check there for the latest updates!";
    }

    return "I can help you with your **profile**, **application status**, **announcements**, or **disbursement schedule**. What would you like to know?";
  } catch (error) {
    console.error('Error fetching user data:', error);
    return "I'm having trouble accessing your data right now. Please try again later or contact support if the issue persists.";
  }
}
