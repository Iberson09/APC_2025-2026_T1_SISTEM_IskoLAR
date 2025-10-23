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
2. Build conversation history
3. Call Google Gemini API with system instructions
4. Handle user-specific data requests
5. Return bot responses

## Features

- **FAQ-based responses** - Answers questions based on IskoLAR system FAQs
- **Personal data handling** - Detects when users ask for profile, status, or disbursement info
- **Markdown formatting** - Uses **bold** text to highlight important keywords
- **Persistent chat** - Messages remain in the widget until closed
- **Responsive design** - Fixed position widget that doesn't interfere with sidebar

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
