# Live Context Flow (Target Design)

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant UI as Web UI
    participant API as FastAPI
    participant TXT as Gemini Text
    participant S as Session Store
    participant LIVE as Gemini Live

    U->>UI: Upload resume + job description
    UI->>API: POST /api/interviews (files, role_title)
    API->>TXT: generate_content(prompt with resume + job)
    TXT-->>API: questions + focus_areas
    API->>S: Persist interview_id, resume_text, job_text, questions, focus_areas
    API-->>UI: interview_id + questions

    U->>UI: Start interview (voice)
    activate U
    UI->>API: POST /api/live/session
    API-->>UI: session_id + mode
    UI->>API: WebSocket /ws/live (start)
    API->>S: Load interview record by interview_id
    API->>LIVE: Connect with system prompt (role + resume + job + questions)
    loop Live audio streaming
        LIVE-->>UI: Audio + transcript events
        UI->>S: Append transcript entries
    end
    LIVE-->>API: Question progression updates (target)
    API->>S: Update asked_question_index (target)
    deactivate U

    Note over S: Target keeps asked_question_index + transcript history
```

## Numbered Explanation
1. User uploads resume and job description; the UI sends them to the backend.
2. Backend extracts text and calls Gemini Text to generate questions and focus areas.
3. Backend stores the interview record with resume/job excerpts and the question list.
4. User starts a live session; the UI opens the live WebSocket.
5. Backend loads the interview record and builds the Gemini Live system prompt with context.
6. Gemini Live streams audio and transcript events; the UI renders them and appends to the session store.
7. Target behavior: Gemini Live reports question progression, and the backend tracks asked questions.
