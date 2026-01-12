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

    U->>UI: Stop session
    UI->>API: POST /api/interviews/{id}/score (transcript)
    API->>TXT: generate_content(score prompt)
    TXT-->>API: overall_score + summary
    API->>S: Store transcript + score
    API-->>UI: Score payload
    UI->>API: GET /api/interviews/{id}/study-guide
    API->>S: Load interview record
    API->>API: Build PDF study guide
    API-->>UI: PDF download

    Note over S: Target keeps asked_question_index + transcript history
```

## Numbered Explanation
1. User uploads resume and job description; the UI sends them to the backend.
2. Backend sends the extracted content to Gemini Text for question generation.
3. Gemini Text returns the question list and focus areas.
4. Backend stores the interview record with resume/job excerpts and the question list.
5. Backend returns the interview id and questions to the UI.
6. User starts the interview from the UI.
7. UI requests a live session.
8. Backend returns the live session id and mode.
9. UI opens the live WebSocket and sends the start message.
10. Backend loads the interview record from session storage.
11. Backend connects to Gemini Live with the full system prompt (role + resume + job + questions).
12. Gemini Live emits audio and transcript events during streaming.
13. UI appends each transcript event to the session store.
14. Target behavior: Gemini Live emits question progression updates.
15. Backend updates asked_question_index in the session store.
16. User stops the session from the UI.
17. UI posts the transcript to the scoring endpoint.
18. Backend calls Gemini Text to score the transcript.
19. Gemini Text returns the overall score and summary.
20. Backend stores the transcript and score in the session store.
21. Backend returns the score payload to the UI.
22. User requests the PDF study guide export.
23. Backend loads the interview record from session storage.
24. Backend renders the PDF study guide.
25. Backend returns the PDF to the UI.
26. UI triggers the PDF download.
