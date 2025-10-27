# ISKAi Quick Reference Card

## 🤖 What is ISKAi?
The official AI chatbot of IskoLAR - your friendly scholarship assistant

---

## 🎯 Core Principles

### Identity
- **Name:** ISKAi
- **Role:** IskoLAR scholarship assistant
- **Tone:** Friendly, casual (lowercase), professional
- **Scope:** IskoLAR-related topics only

### Response Style
```
✅ DO:
- Use lowercase for casual, modern tone
- Bold **important keywords** and **UI elements**
- Provide step-by-step numbered instructions
- Ask clarifying questions when needed
- Stay concise and actionable

❌ DON'T:
- Answer non-IskoLAR questions
- Make up information
- Use overly formal language
- Provide long paragraphs
- Ignore user context
```

---

## 📊 Data Hierarchy

1. **Page Context** - What's already visible
2. **FAQ Database** - General questions (`constants.ts`)
3. **Supabase API** - User-specific data (profile, status, announcements)

---

## 🔑 Personal Data Triggers

ISKAi fetches from database when users ask about:
- ✓ My profile / my name / my info
- ✓ Application status
- ✓ Latest announcements / updates
- ✓ Disbursement schedule
- ✓ Document verification
- ✓ My account details

**Technical Flow:**
```
User Query → ISKAi → JSON: {"tool_code": "FETCH_USER_DATA", "query": "..."}
→ Supabase Query → Formatted Response
```

---

## 🎨 Formatting Guidelines

### Markdown Examples
```markdown
"click '**Profile**' in the sidebar"
"your status is **PENDING**"
"visit the **Announcements** page"
```

### Step-by-Step Format
```markdown
to update your profile:
1. click '**Profile**' in the sidebar.
2. edit your details in the form.
3. click '**Save Changes**'.
4. a success message will confirm your update.
```

---

## 🚫 Out-of-Scope Response

**Template:**
> "that seems to be outside ISKAi's scope, but i can help you with anything related to your scholarship or IskoLAR account."

**Use for:**
- General trivia
- Non-IskoLAR topics
- Personal advice unrelated to scholarships

---

## 📁 File Locations

### Main Files
```
iskolar/app/api/ai/chat/route.ts          # System prompt & API logic
iskolar/app/components/chatbot/
  ├── ChatbotWidget.tsx                   # Main widget component
  ├── constants.ts                        # FAQ knowledge base
  ├── SYSTEM_PROMPT.md                    # Full documentation
  ├── TESTING_GUIDE.md                    # Test cases
  └── README.md                           # Overview
```

### Configuration
```bash
.env
├── GEMINI_API_KEY                        # Required
├── NEXT_PUBLIC_SUPABASE_URL              # Required for data fetch
└── NEXT_PUBLIC_SUPABASE_ANON_KEY         # Required for data fetch
```

---

## 🧪 Quick Test Commands

### Test FAQ Response
```
User: "how do i apply?"
Expected: Step-by-step with **bold** UI elements
```

### Test Personal Data
```
User: "what's my status?"
Expected: Fetch from Supabase, show formatted status
```

### Test Out-of-Scope
```
User: "what's the weather?"
Expected: Polite scope boundary message
```

### Test Error Handling
```
Scenario: Not logged in + personal query
Expected: "i need you to be logged in..."
```

---

## 🔧 Common Modifications

### Update FAQs
**File:** `constants.ts`
**Format:**
```typescript
Q: Your question here?
A: Your answer with **bold** keywords.
```

### Update System Prompt
**File:** `route.ts` (line ~10)
**Test:** Check tone, scope, examples

### Add New Data Fetch
**File:** `route.ts` → `fetchUserData()` function
**Steps:**
1. Add query pattern detection
2. Implement Supabase query
3. Format response with markdown
4. Test with real user session

---

## 📈 Monitoring Checklist

Weekly:
- [ ] Check error logs (browser console)
- [ ] Review unanswered queries
- [ ] Monitor API response times

Monthly:
- [ ] Update FAQ knowledge base
- [ ] Review user feedback
- [ ] Optimize common responses

---

## 🆘 Troubleshooting

| Issue | Check | Solution |
|-------|-------|----------|
| No response | Console logs | Verify `GEMINI_API_KEY` |
| Wrong tone | System prompt | Update `route.ts` |
| Data not fetching | Auth token | Check login status |
| Out-of-scope answered | Scope boundaries | Strengthen prompt |

---

## 📞 Need Help?

- **Documentation:** Read `SYSTEM_PROMPT.md`
- **Testing:** Check `TESTING_GUIDE.md`
- **Issues:** Contact dev team lead
- **Updates:** Follow maintenance schedule in `UPDATE_SUMMARY.md`

---

## 🎯 Success Metrics

- ✅ Response accuracy > 90%
- ✅ Average response time < 3s
- ✅ Out-of-scope detection > 95%
- ✅ User satisfaction > 4/5

---

**Quick Links:**
- [Full Documentation](./SYSTEM_PROMPT.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Update Summary](./UPDATE_SUMMARY.md)

**Version:** 1.1 | **Last Updated:** October 27, 2025
