# ISKAi Chatbot Integration

This directory contains the ISKAi chatbot assistant integrated into the IskoLAR scholarship system.

## Components

- **ChatbotWidget.tsx** - Main widget component that renders the floating chat button and chat window
- **ChatWindow.tsx** - Displays the conversation messages with auto-scroll
- **InputForm.tsx** - Input field and send button for user messages
- **Message.tsx** - Individual message component with role-based styling
- **Icons.tsx** - SVG icons for bot, user, and send button
- **types.ts** - TypeScript types for Message and Role
- **constants.ts** - FAQ knowledge base for the chatbot

## API Route

The chatbot uses a Next.js API route at `/api/ai/chat` to:
1. Receive user messages
2. Build conversation history with context
3. Apply ISKAi system prompt and personality
4. Call Google Gemini API with enhanced instructions
5. Detect and handle user-specific data requests via Supabase
6. Return formatted bot responses

## Features

- **Context-aware responses** - Prioritizes page context before querying database
- **FAQ-based knowledge** - Answers questions based on IskoLAR system FAQs
- **Personal data integration** - Fetches real user data (profile, applications, announcements, disbursements) from Supabase
- **Scope management** - Politely redirects out-of-scope queries
- **Markdown formatting** - Uses **bold** text to highlight important keywords and actions
- **Friendly tone** - Casual, lowercase style while maintaining professionalism
- **Step-by-step guidance** - Provides clear, numbered instructions for system processes
- **Persistent chat** - Messages remain in the widget until closed
- **Responsive design** - Fixed position widget that doesn't interfere with sidebar

## ISKAi Personality

ISKAi is designed to be:
- **Friendly and approachable** - Uses casual, modern language
- **Reliable and accurate** - Only provides verified information
- **Context-aware** - Understands when to use FAQs vs. fetching live data
- **Helpful** - Guides users through the IskoLAR system step-by-step
- **Respectful of scope** - Stays within IskoLAR-related topics

See `SYSTEM_PROMPT.md` for detailed guidelines and examples.

## Configuration

The chatbot requires the following environment variable in `.env`:

```
GEMINI_API_KEY=your_google_gemini_api_key_here
```

## Usage

The chatbot widget is automatically rendered in the `ScholarSideBar.tsx` component and appears as a floating button in the bottom-right corner of the scholar pages.

Users can:
1. Click the ISKAi button to open the chat
2. Ask questions about the scholarship system
3. Get instant responses based on FAQs
4. Request personal data (which redirects to relevant pages)
5. Close the chat widget at any time

## Technical Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **AI Model**: Google Gemini 2.0 Flash
- **API**: Next.js API Routes
- **Database**: Supabase (for future user data integration)
