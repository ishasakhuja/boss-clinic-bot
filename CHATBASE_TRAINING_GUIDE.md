# Boss Clinic Chatbase Agent - Training Guide

## Overview
This guide explains how to train the Chatbase AI agent for Boss Clinic's chatbot. The agent ID is: **qaDvYRRCydCd26jRsiJ6H**

## Key Training Objectives

The chatbot should:
1. **Understand hair loss treatment** for men and women
2. **Route users by clinic preference** (Subiaco WA or Bondi NSW)
3. **Recommend treatments** (PRP, Laser, ARTAS, Transplant, Exosomes)
4. **Encourage consultations** and lead capture
5. **Support product/store inquiries**
6. **Cite official Boss Clinic content** only

---

## Part 1: Knowledge Base Content to Upload

### 1.1 Website Pages to Add
Log into Chatbase → Your Agent → Knowledge Base → Add Sources

#### Pages to prioritize:
1. **Home Page**
   - URL: https://bossclinic.com.au/
   - Captures: Brand overview, main services, call-to-action

2. **Men's Treatments** 
   - URL: https://bossclinic.com.au/men-hair-loss-treatment-australia
   - Captures: Male-specific hair loss solutions

3. **Women's Treatments**
   - URL: https://bossclinic.com.au/women-hair-loss-treatment-australia
   - Captures: Female-specific hair loss solutions

4. **Treatment Pages** (Individual service pages):
   - PRP Therapy
   - Laser Hair Therapy
   - ARTAS Hair Transplant
   - Hair Transplant Surgery
   - Exosomes & Microneedling
   - Any comparative content (PRP vs Laser, etc.)

5. **Before & After Gallery**
   - URL: https://bossclinic.com.au/real-results
   - Captures: Visual proof and success stories

6. **FAQs & Suitability**
   - URL: https://bossclinic.com.au/faq
   - Captures: Common questions, candidacy info

7. **Contact & Location Pages**
   - Subiaco WA clinic details
   - Bondi NSW clinic details
   - Contact forms and phone numbers

8. **Consultation Booking Page**
   - Booking process, what to expect
   - Free consultation offer

9. **Product/Store Pages**
   - https://bossclinic.com.au/store
   - Product categories, shipping info
   - Related policies (returns, refunds)

10. **Pricing & Costs Page**
    - General pricing ranges (if public)
    - What factors affect pricing
    - Financing/payment options

#### Steps in Chatbase to Add URLs:
1. Go to **Knowledge Base** tab
2. Click **+ Add Source**
3. Select **Website**
4. Enter URL
5. Click **Scrape Website**
6. Configure options:
   - Max depth: 3 (to capture subpages)
   - Include PDFs: Yes (if FAQ sheets exist)
   - Update frequency: Weekly
7. Click **Sync**
8. Repeat for all URLs above

### 1.2 Document Uploads (if available)

#### Recommended documents to upload:
- **FAQ Sheets** (PDF or Word)
- **Treatment Comparison Guide** (PRP vs Laser vs Transplant)
- **Suitability Questionnaire**
- **Price List** (if not on website)
- **Clinic Location/Hours** (backup)
- **Pre-Consultation Guide**

#### Steps in Chatbase:
1. **Knowledge Base** → **+ Add Source**
2. Select **File Upload**
3. Upload PDF/DOCX
4. Click **Upload & Process**

---

## Part 2: Conversation Flow Training

### 2.1 System Prompt / Instructions
Go to **Agent Settings** → **Instructions** and ensure these are configured:

```
You are Boss Clinic's AI assistant, specializing in hair loss treatment solutions.

### Your Role:
- Help visitors understand their hair loss treatment options
- Route enquiries to the correct clinic (Subiaco WA or Bondi NSW)
- Encourage consultation bookings
- Answer questions about treatments (PRP, Laser, ARTAS, Transplants, Exosomes)
- Support product/store inquiries

### Guidelines:
1. ALWAYS recommend a free consultation for diagnosis/suitability
2. Ask clarifying questions about:
   - Gender and age (if shared)
   - Duration of hair loss
   - Current concern level
   - Preferred treatment type (if expressed)
   - Clinic preference (location)
3. ONLY reference information from Boss Clinic's website/official materials
4. Be encouraging but honest - state limitations (final diagnosis requires clinic assessment)
5. Provide before/after references when discussing results
6. Always offer booking a consultation as next step
7. For pricing: Explain costs vary by treatment and personal plan → recommend consultation

### Topics You Handle:
✅ Men's hair loss treatments
✅ Women's hair loss treatments  
✅ Treatment types (PRP, Laser, ARTAS, Transplant, Exosomes)
✅ Clinic locations and availability
✅ Consultation booking
✅ General product information
✅ After-hours lead capture

### Tone:
- Professional, empathetic, non-judgmental
- Reassuring about hair loss being common and treatable
- Encouraging toward next steps (consultation)

### Do NOT:
❌ Make medical diagnoses
❌ Guarantee results
❌ Quote prices outside official channels
❌ Reference competitors
❌ Share information outside Boss Clinic materials
```

### 2.2 Define Conversation Flows

In Chatbase → **Actions** or **Workflows**, set up these trigger patterns:

#### Flow 1: Hair Loss Discovery
**Trigger:** User mentions balding, thinning, hair loss, losing hair

**Bot Response Path:**
1. Empathize and ask gender
2. Ask duration of concern
3. Ask impact (cosmetic vs severe)
4. Ask if they prefer clinic treatment or at-home options
5. Recommend relevant treatment tier
6. Offer consultation booking

**Example:**
```
User: "I'm losing my hair"
Bot: "Hair loss is common and very treatable. First, are you experiencing this as a man or woman? Also, how long has this been happening?"
User: "I'm a man, about 2 years"
Bot: "Male pattern baldness can be addressed with several options: minoxidil, PRP therapy, laser therapy, or if significant, hair transplants. What sounds most appealing to you - a non-invasive treatment or considering transplantation?"
```

#### Flow 2: Treatment Comparison
**Trigger:** User asks "What's the difference between PRP and transplant", "Which treatment is best", etc.

**Bot Response Path:**
1. Acknowledge both treatments
2. Explain each briefly with pros/cons
3. Ask about their concern level
4. Route to relevant treatment page
5. Offer consultation for recommendation

**Example:**
```
User: "Is PRP or laser better?"
Bot: "Both are effective depending on your situation:
- Laser therapy is ideal for stimulating follicles and can be done regularly
- PRP uses your own blood cells to regenerate hair and requires fewer sessions
Which appeals more to you? Also, how soon do you want results? That helps determine the best path."
```

#### Flow 3: Clinic Routing
**Trigger:** User mentions location, clinic choice, or asks where you're located

**Bot Response Path:**
1. Explain two clinic locations
2. Ask which is closer or preferred
3. Provide clinic details
4. Offer booking at that location

**Example:**
```
User: "Where are you located?"
Bot: "Boss Clinic has two locations:
- **Subiaco, Western Australia**
- **Bondi, New South Wales**

Which location works best for you?"
```

#### Flow 4: Consultation Booking
**Trigger:** User shows interest or asks to book

**Bot Response Path:**
1. Explain free consultation
2. Offer booking options (online/phone/in-person)
3. Collect essential: name, email, phone, preferred time
4. Confirm and direct to booking system
5. Set follow-up reminder

**Example:**
```
User: "I'd like to book a consultation"
Bot: "Great! I'd love to help you get started. A free consultation lets our specialists discuss your specific situation and recommend the best treatment.

What's your preferred way to book?
- Online booking: [link]
- Call us directly: [phone]
- I can take your details now

Please share your name, email, and phone number."
```

#### Flow 5: Product/Store Questions
**Trigger:** User asks about at-home products, store, shipping, etc.

**Bot Response Path:**
1. Ask what they're looking for (prevention/support/regrowth)
2. Explain product categories
3. Direct to store pages
4. Offer clinic consultation if condition seems advanced

**Example:**
```
User: "Do you sell products?"
Bot: "Yes! Boss Clinic offers at-home products for hair maintenance and support. We have products for:
- Prevention and maintenance
- Regrowth support
- Post-treatment care

Are you looking for something specific? Visit our store: [link]

For advanced concerns, our clinic treatments might be more effective - would you like to explore options?"
```

---

## Part 3: Testing & Refinement

### 3.1 Test Conversations
Before going live, test these scenarios in Chatbase chat interface:

1. **New prospect with male hair loss**
   ```
   "Hi, I'm losing my hair desperately. I'm 40 years old"
   ```
   ✓ Bot should ask duration, offer treatments, recommend consultation

2. **Female hair loss inquiry**
   ```
   "I'm a woman with thinning hair. Is PRP good?"
   ```
   ✓ Bot should explain PRP for women, ask details, offer consultation

3. **Treatment comparison**
   ```
   "What's the difference between ARTAS and regular transplant?"
   ```
   ✓ Bot should explain both clearly with pros/cons

4. **Location-specific**
   ```
   "I'm in Sydney, can I visit your clinic?"
   ```
   ✓ Bot should route to Bondi NSW clinic

5. **Product inquiry**
   ```
   "What's the cheapest thing you have?"
   ```
   ✓ Bot should explain products, direct to store

6. **Pricing question**
   ```
   "How much does a hair transplant cost?"
   ```
   ✓ Bot should explain variables, recommend consultation

7. **After-hours**
   ```
   "I want to book but it's 10 PM"
   ```
   ✓ Bot should capture lead details for follow-up

### 3.2 Chatbase Analytics
Monitor these metrics in Chatbase dashboard:

- **Conversation count** - Daily/weekly trends
- **Average session length** - Engagement depth
- **Conversion to consultation** - % of conversations leading to booking
- **Top questions** - Identify content gaps
- **Drop-off points** - Where users leave
- **User satisfaction** - If enabled, feedback ratings

### 3.3 Refinement Cycle
1. **Week 1:** Track conversations, note unhandled questions
2. **Week 2:** Add missing content to knowledge base
3. **Week 3:** Update system prompt based on common issues
4. **Ongoing:** Review monthly, adjust as needed

---

## Part 4: Integration & Deployment

### 4.1 Chatbase to Website Widget
The chatbot widget is embedded on the website using the Chatbase embed code:

```html
<!-- In your website footer or before </body> -->
<script>
  window.embeddedChatbotConfig = {
    chatbotId: "qaDvYRRCydCd26jRsiJ6H",
    domain: "www.chatbase.co"
  }
</script>
<script src="https://www.chatbase.co/embed.min.js"></script>
```

### 4.2 Backend Webhook (Conversation to RDS)
The backend listens for Chatbase webhook events and syncs conversations to MySQL.

File: `backend/scripts/lambda/chatbot-conv-to-rds-ingest.js`

Configure webhook in Chatbase:
1. Settings → Webhooks
2. URL: `http://your-backend.api/webhook/chatbase-ingest`
3. Events: conversation_updated, message_created
4. Headers: Add auth token if needed

### 4.3 Monitor Backend Logs
```bash
# From backend folder
npm start

# Look for logs like:
# [2024-03-26] Ingesting conversation from Chatbase...
# [2024-03-26] Lead captured: john@example.com
```

---

## Part 5: Content Maintenance

### Regular Updates
- **Monthly:** Review new FAQs, add to knowledge base
- **Quarterly:** Update treatment pages if procedures change
- **As-needed:** Add new before/after examples, update pricing
- **Weekly:** Check analytics for emerging questions

### Content Gaps to Monitor
- Questions about lesser-known treatments
- Regional-specific queries
- Seasonal concerns (e.g., pre-summer hair loss inquiries)
- Competitor comparisons (never endorse, just clarify)

---

## Part 6: Compliance & Branding

### Medical Disclaimer
Ensure this is visible to users:
```
"This chatbot provides general information only. 
Final suitability for treatment must be assessed by our specialist doctors. 
Always consult with a healthcare professional."
```

### Brand Voice Examples

**DO:** 
- "Male pattern baldness is very treatable with modern methods like PRP and transplants."
- "Our laser therapy stimulates healthy hair regrowth - many clients see results in 3-4 months."
- "Book a free consultation so our specialists can assess your unique situation."

**DON'T:**
- "We guarantee hair regrowth" (medical liability)
- "We're better than [competitor]" (unprofessional)
- "Just use [product], you'll be fine" (oversimplification)

---

## Support & Troubleshooting

### Common Issues

**Issue 1:** Bot gives unrelated answers
- Solution: Verify knowledge base has all Boss Clinic pages
- Solution: Update system prompt instructions
- Solution: Check for content conflicts in uploaded docs

**Issue 2:** Bot doesn't route to specific clinic
- Solution: Ensure clinic location pages are in knowledge base
- Solution: Update instructions with explicit routing rules

**Issue 3:** Low conversion to consultations
- Solution: Strengthen call-to-action in prompt
- Solution: Add booking link prominently after treatment explanations
- Solution: Track which points users drop off and address

**Issue 4:** Conversations not syncing to database
- Solution: Verify webhook URL is correct in Chatbase
- Solution: Check backend RDS connection in logs
- Solution: Ensure boss_clinic_db database exists

---

## Checklist: Pre-Launch

- [ ] All 10 website pages added to knowledge base
- [ ] System prompt updated with Boss Clinic specifics
- [ ] 7 test conversation flows completed successfully
- [ ] Clinic routing tested and working
- [ ] Consultation booking flow tested
- [ ] Product/store flow tested
- [ ] Analytics dashboard accessible
- [ ] Webhook configured to backend
- [ ] Medical disclaimers added
- [ ] Team trained on bot capabilities
- [ ] Monitor first 48 hours closely
- [ ] Export initial conversations for review

---

## Next Steps
1. Start uploading content to knowledge base today
2. Test system prompt improvements daily
3. Deploy to website after 5 successful test conversations
4. Monitor analytics hourly for first 24 hours
5. Gather team feedback and iterate
