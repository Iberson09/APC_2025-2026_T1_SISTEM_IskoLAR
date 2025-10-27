# ISKAi Testing Guide

This document provides test cases and expected behaviors for the ISKAi chatbot.

## Test Categories

### 1. General FAQ Questions ✅

#### Test Case 1.1: Application Submission
**Input:** "how do i apply for a scholarship?"  
**Expected Output:** Step-by-step instructions with **bold** formatting for clickable elements  
**Verification:** Response should reference **Scholarship → A.Y. 2025-2026 → 1st Semester → Application**

#### Test Case 1.2: File Upload Issues
**Input:** "my upload fails, what do i do?"  
**Expected Output:** File size and format requirements (pdf/jpg/png, ≤10mb)  
**Verification:** Response should be concise and actionable

#### Test Case 1.3: Login Problems
**Input:** "i can't log in"  
**Expected Output:** Troubleshooting steps including password reset link  
**Verification:** Should mention '**forgot password**' link

#### Test Case 1.4: Mobile Access
**Input:** "can i use my phone to apply?"  
**Expected Output:** Confirmation that the interface is mobile-responsive  
**Verification:** Friendly, lowercase tone

---

### 2. Personal Data Queries 🔐

#### Test Case 2.1: Profile Information
**Input:** "show me my profile"  
**Expected Behavior:** 
- System should call `FETCH_USER_DATA` tool
- Retrieve user data from Supabase
- Display formatted profile with name, email, contact, year level, GPA

#### Test Case 2.2: Application Status
**Input:** "what's my application status?"  
**Expected Behavior:**
- Trigger `FETCH_USER_DATA`
- Query applications table
- Show latest status (pending/approved/denied) with submission date

#### Test Case 2.3: Announcements
**Input:** "what are the latest announcements?"  
**Expected Behavior:**
- Fetch recent announcements from database
- Display top 3 with titles, dates, and previews
- Suggest visiting **Announcements** page

#### Test Case 2.4: Disbursement Schedule
**Input:** "when is my disbursement?"  
**Expected Behavior:**
- Search announcements for disbursement-related content
- Display relevant information
- If not found, suggest checking **Announcements** section

---

### 3. Out-of-Scope Queries 🚫

#### Test Case 3.1: General Trivia
**Input:** "who's the president of the philippines?"  
**Expected Output:** "that's outside ISKAi's scope, but i can help you with your scholarship or account information if you'd like."

#### Test Case 3.2: Unrelated Topics
**Input:** "what's the weather like?"  
**Expected Output:** Polite redirection to IskoLAR-related topics

#### Test Case 3.3: Personal Advice
**Input:** "should i take computer science or engineering?"  
**Expected Output:** Scope boundary response

---

### 4. Tone and Formatting 🎨

#### Test Case 4.1: Lowercase Tone
**Verification Criteria:**
- Responses use lowercase for main text
- Maintains grammatical correctness
- Professional yet casual

#### Test Case 4.2: Bold Formatting
**Verification Criteria:**
- Important keywords are **bolded**
- Clickable UI elements are **bolded**
- Key actions are **bolded**
- Examples: **Profile**, **Save Changes**, **Announcements**

#### Test Case 4.3: Step-by-Step Guidance
**Input:** "how do i update my profile?"  
**Expected Output:** Numbered list with clear instructions
```
to update your profile:
1. click '**Profile**' in the sidebar.
2. edit your details in the form.
3. click '**Save Changes**'.
4. a success message will confirm your update.
```

---

### 5. Edge Cases ⚠️

#### Test Case 5.1: Unknown Question
**Input:** "what's the exact GPA requirement for renewal?"  
**Expected Output:** "that's a great question! i don't have that information right now, but the scholarship office would be the best place to ask."

#### Test Case 5.2: Ambiguous Query
**Input:** "tell me more"  
**Expected Behavior:** Ask clarifying questions

#### Test Case 5.3: No User Session
**Input:** [Personal data query when not logged in]  
**Expected Output:** "i need you to be logged in to fetch your personal information. please make sure you're logged in!"

#### Test Case 5.4: Empty Database Result
**Input:** "show my applications"  
**Expected Output:** "you don't have any applications yet. to apply, go to **Scholarship → A.Y. 2025-2026 → 1st Semester → Application**."

---

### 6. API and Technical Tests 🔧

#### Test Case 6.1: Gemini API Timeout
**Expected Behavior:** Graceful error message: "i'm taking a bit longer than usual to respond. please try asking your question again!"

#### Test Case 6.2: Gemini API Failure
**Expected Behavior:** User-friendly error: "sorry, i'm having trouble connecting right now. please try again in a moment!"

#### Test Case 6.3: Supabase Connection Error
**Expected Behavior:** Inform user about temporary issue and suggest trying again

#### Test Case 6.4: Invalid Auth Token
**Expected Behavior:** "i'm having trouble verifying your identity. please try logging out and back in."

---

## Testing Checklist

### Pre-Testing Setup
- [ ] Ensure `GEMINI_API_KEY` is set in `.env`
- [ ] Verify Supabase credentials are configured
- [ ] Confirm chatbot widget appears on scholar pages
- [ ] Test with both logged-in and logged-out states

### Functional Tests
- [ ] All FAQ questions return accurate responses
- [ ] Personal data queries trigger database fetch
- [ ] Out-of-scope queries are handled gracefully
- [ ] Markdown formatting renders correctly
- [ ] Tone matches specifications (lowercase, friendly)

### User Experience Tests
- [ ] Responses are concise and easy to read
- [ ] Step-by-step instructions are clear
- [ ] Loading state shows "ISKAi is typing..."
- [ ] Messages auto-scroll to bottom
- [ ] Chat widget can be opened/closed smoothly

### Error Handling Tests
- [ ] API timeouts are handled
- [ ] Missing data is communicated clearly
- [ ] Auth errors provide helpful guidance
- [ ] Unexpected errors don't crash the app

### Performance Tests
- [ ] Initial response time < 3 seconds
- [ ] Database queries complete in < 2 seconds
- [ ] Chat widget doesn't lag the UI
- [ ] Multiple rapid messages are handled

---

## Common Issues and Solutions

### Issue: ISKAi not responding
**Possible Causes:**
- Missing `GEMINI_API_KEY`
- API rate limit reached
- Network connectivity issues

**Solution:** Check environment variables and API quota

### Issue: Personal data not fetching
**Possible Causes:**
- User not authenticated
- Supabase RLS policies blocking access
- Incorrect table/column names

**Solution:** Verify auth token and database schema

### Issue: Responses are too formal
**Possible Causes:**
- System prompt not updated
- Gemini temperature too low

**Solution:** Verify system prompt in `route.ts`

### Issue: Out-of-scope questions answered
**Possible Causes:**
- System prompt scope boundaries unclear
- Gemini model creativity too high

**Solution:** Strengthen scope instructions in prompt

---

## Continuous Improvement

### Monitoring Metrics
- Response accuracy rate
- Query resolution rate
- Out-of-scope detection rate
- Average response time
- User satisfaction feedback

### Feedback Collection
- Track common unanswered questions
- Identify gaps in FAQ knowledge base
- Monitor personal data fetch patterns
- Log technical errors for debugging

### Update Schedule
- Review FAQ knowledge base monthly
- Update system prompt as features change
- Expand personal data capabilities quarterly
- Audit tone and formatting regularly

---

## Contact
For testing issues or to report bugs, contact the IskoLAR development team.

**Last Updated:** October 27, 2025
