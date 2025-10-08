# **Gruve Hackathon — Smarter Scheduling Assistant**

---

## **1. Project Overview**

**Project Name:** Gruve Smarter Scheduling Assistant
**Goal:** Reduce time spent on scheduling meetings across teams and time zones using AI.

**Problem Statement:**
Employees at Gruve spend significant time coordinating meetings across multiple teams, time zones, and schedules, resulting in lost productivity. Current tools require manual back-and-forth emails or chat messages.

**Solution:**
An AI-powered scheduling assistant that:

1. Parses meeting requests from natural language (e.g., “Schedule 30-min sync with Ravi and Alice next week regarding Security update”).
2. Checks availability across participants’ **Outlook calendars**.
3. Suggests optimal time slots and allows one-click booking.
4. Integrates as a **chat interface initially**, then extended to **Microsoft Teams bot** with @ mentions.

**Impact:**

* Reduces scheduling time by 50–70%.
* Provides seamless experience for global teams.
* Improves cross-team productivity and reduces email/chat overload.

---

## **2. Target Users & Scope**

* **Users:** All Gruve employees who need to schedule meetings.
* **Scope (MVP):**

  * Chat interface prototype for scheduling.
  * AI parses request → proposes meeting times → outputs suggested slots.
  * Teams bot with @ mentions (Phase 2).
* **Optional Enhancements:**

  * Auto-create **Outlook calendar invites**.
  * AI learns user preferences for meeting times.
  * Adaptive notifications for conflicts.

---

## **3. Tech Stack & Tools**

| Layer      | Tool                               | Purpose                                       |
| ---------- | ---------------------------------- | --------------------------------------------- |
| Input      | Chat interface (web-based)         | Collect meeting requests                      |
| Processing | **Make.com** or **n8n.io**         | Workflow automation                           |
| AI         | **OpenAI API** or **Glean**        | Parse natural language, suggest meeting slots |
| Calendar   | **Microsoft Outlook Calendar API** | Check availability, create events             |
| Bot        | **Microsoft Teams Bot Framework**  | Extend chat to Teams, support @ mentions      |
| Output     | Microsoft Teams                    | Send suggested meeting slots                  |
| Design/UI  | Figma AI / Canva / Runway          | Generate chat UI & landing page               |
| Demo       | Loom / Gamma.app                   | Video walkthrough of chat & bot functionality |

---

## **4. Workflow Diagram (High-Level)**

1. **User Request:** User types natural language request in chat or @mentions bot in Teams.
2. **AI Parsing:** LLM extracts:

   * Participants
   * Duration
   * Topic
   * Time window
3. **Calendar Check:** Workflow checks **Outlook calendars** for availability of all participants.
4. **Suggested Slots:** AI returns 2–3 best options.
5. **Booking:** Optional one-click creation of Outlook calendar invite.

---

## **5. Phase-wise Implementation Plan**

### **Phase 0 — Preparation (Day 1)**

* Define MVP and mock datasets.
* Gather **Outlook calendar & Teams API credentials**.
* Set up OpenAI API / Glean access.
* Set up project repo / folder structure.

### **Phase 1 — Chat MVP (Days 2–5)**

**Day 2–3: AI Parsing**

* Create LLM prompts to parse meeting requests into JSON.
* Test multiple phrasings.
* Validate extraction of participants, duration, topic, time window.

**Day 4: Calendar Integration**

* Check participant availability using **Outlook Calendar API**.
* Generate 2–3 suggested time slots.
* Optional: generate Outlook calendar invite link.

**Day 5: Chat Interface**

* Simple web-based chat (Replit or static web app).
* Input → AI → output suggestions.
* Test end-to-end with 5–10 mock requests.

### **Phase 2 — Teams Bot (Days 6–9)**

**Day 6:** Teams bot registration & permissions.

**Day 7:** Integrate chat logic → bot receives messages.

**Day 8:** Implement @mentions & adaptive cards.

* Post suggested slots.
* Optional: click to confirm → auto-create Outlook event.

**Day 9:** Testing & edge cases.

* Multi-timezone participants.
* Conflicting schedules.
* Missing participant info.

### **Phase 3 — Demo & Submission (Day 10)**

* Record Loom demo: chat version → Teams bot version.
* Prepare 200-word submission.
* Test live demo.

---

## **6. UI/UX Design Prompts**

### **6.1 Chat Screen UI Prompt**

> “Design a modern, professional chat interface for an AI-powered meeting scheduler named **Gruve Scheduler**.
> Include:
>
> * **Gruve’s logo** top-left (green color scheme, interlocking ‘G’ and ‘C’).
> * Header with app name/logo.
> * Chat bubbles for user vs AI messages (distinct colors).
> * Text input box at bottom with **send button**.
> * Optional quick-reply buttons: “Schedule Meeting”, “Check Availability”.
> * Clean, minimal, corporate-friendly style for desktop/web.
> * Gruve brand colors: primary green (#00B140), white, neutral tones.
> * Layout intuitive, visually appealing, easy to read.”

### **6.2 Landing Page / Teams Sign-in Prompt**

> “Design a modern landing page for **Gruve Scheduler**.
> Include:
>
> * **Gruve’s logo** prominently top-left.
> * Central **Sign in with Microsoft Teams** button (SAML/SSO).
> * Short tagline under logo: “Smart scheduling made easy with AI.”
> * Clean, minimal, corporate style.
> * Gruve brand colors: green (#00B140), white, neutral tones.
> * Subtle AI/productivity icons/graphics without clutter.
> * Intuitive layout guiding user to click Teams login button.”

---

## **7. AI Prompt for Meeting Request Parsing**

> “Extract structured meeting information from natural language text. Output JSON with fields:
>
> ```json
> {  
>   "participants": ["Name1", "Name2"],  
>   "duration": 30,  
>   "topic": "string",  
>   "time_window": "next week / next Monday / specific date range"  
> }  
> ```
>
> Ensure accuracy even with ambiguous phrasing. Provide fallback for missing info.”

---

## **8. 200-Word Submission Draft**

**Project Name:** Gruve Smarter Scheduling Assistant
**Team:** [Your Team Name]

**Purpose:**
We built an AI-powered assistant that simplifies scheduling meetings across teams and time zones. Users submit natural language requests, and the assistant suggests optimal meeting slots based on participants’ availability in **Outlook calendars**.

**How it Works:**
The assistant parses requests using AI, checks availability via **Outlook Calendar API**, and returns 2–3 proposed slots. The workflow is first implemented as a chat interface, then extended to a **Microsoft Teams bot** with @mentions.

**Tools Used:**
OpenAI API / Glean, Make.com / n8n.io, Microsoft Outlook Calendar API, Microsoft Teams, Figma AI / Canva, Loom.

**Impact:**

* Reduces scheduling time by 50–70%.
* Enhances cross-team productivity.
* Easy adoption with minimal setup.

Our solution demonstrates how AI can streamline everyday work, reduce repetitive tasks, and improve efficiency for employees across all teams at Gruve.

---

## **9. Judging Alignment**

| Criterion        | How This Project Excels                                   |
| ---------------- | --------------------------------------------------------- |
| Internal Impact  | Reduces time wasted in scheduling, universally applicable |
| Market Potential | Can scale to any organization or client scenario          |
| Usability        | One-click workflow, chat interface, Teams integration     |
| Not judged       | Code complexity irrelevant → focus on workflow & impact   |

---

This document is now **fully aligned with Microsoft Teams & Outlook only**.

---

