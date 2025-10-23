import { NextRequest, NextResponse } from 'next/server';
import { FAQ_KNOWLEDGE_BASE } from '@/app/components/chatbot/constants';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set in environment variables');
}

const systemInstruction = `You are ISKAi, a remarkably friendly, polite, and helpful AI assistant for the IskoLAR scholarship system.
Your primary goal is to answer user questions based ONLY on the provided 'Frequently Asked Questions (FAQs)' section.

Always use markdown bold formatting (**text**) to highlight important keywords, clickable items, or key actions for the user. For example: "You can find this on your **Profile** page." or "Click **Save Changes** to continue."

If the user asks a question that requires personal data—like 'disbursement schedule', 'application status', 'my profile', 'my name', or anything specific to their account—you MUST respond with ONLY the following JSON object: {"tool_code": "FETCH_USER_DATA", "query": "[user's original query]"}. Do not add any other text or explanation.

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

    // Call Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
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
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to get response from Gemini API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "I'm sorry, I couldn't process that request.";

    // Check if response is asking for user data
    try {
      const parsedResponse = JSON.parse(botResponse);
      if (parsedResponse.tool_code === 'FETCH_USER_DATA') {
        // Fetch real user data from Supabase
        const userData = await fetchUserData(parsedResponse.query);
        return NextResponse.json({ message: userData });
      }
    } catch {
      // Not JSON, just a regular response
    }

    return NextResponse.json({ message: botResponse });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function fetchUserData(query: string): Promise<string> {
  try {
    // For future enhancement: Get user from session/auth and query Supabase
    // const { createClient } = await import('@supabase/supabase-js');
    // const supabase = createClient(
    //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    // );
    
    const lowerCaseQuery = query.toLowerCase();

    if (lowerCaseQuery.includes('profile') || lowerCaseQuery.includes('name')) {
      return "To view your profile information, please click on the **Profile** section in the sidebar. There you can see and update your personal details.";
    }

    if (lowerCaseQuery.includes('status')) {
      return "To check your application status, navigate to **Scholarship → A.Y. 2025-2026 → 1st Semester → Status**. Your application status will be displayed there.";
    }

    if (lowerCaseQuery.includes('disbursement') || lowerCaseQuery.includes('schedule')) {
      return "Disbursement schedules are posted in the **Announcements** section. Please check there for the latest updates on your scholarship disbursement.";
    }

    return "I can help you with information about your profile, application status, or disbursement schedule. Please check the relevant sections in your dashboard or ask me a more specific question!";
  } catch (error) {
    console.error('Error fetching user data:', error);
    return "I'm having trouble accessing your data right now. Please try again later or contact support if the issue persists.";
  }
}
