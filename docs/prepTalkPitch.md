## What it does
**PrepTalk** is a voice-first interview simulator.
1.  **Contextual Setup**: Users upload their Resume and target Job Description.
2.  **Live Simulation**: The user enters a voice-only session with an AI interviewer. The AI asks questions based on the uploaded documents, listens to the user's spoken answers, and asks adaptive follow-up questions in real-time.
3.  **Comprehensive Feedback**: Once the session ends, the app generates a downloadable PDF Study Guide. This includes a full transcript, scores on key metrics (like clarity and relevance), and specific "tough love" coaching tips to improve performance.
## How we built it
PrepTalk is a full-duplex voice application powered by **Gemini 3**.
*   **The Backend**: We used **FastAPI** to handle the high-concurrency requirements of real-time audio streaming.
*   **The AI Core**:
    *   **Gemini Pro (Text)**: Analyzes the initial documents to generate a structured interview plan $P = \{q_1, q_2, ..., q_n\}$ and a scoring rubric.
    *   **Gemini Live (Multimodal)**: We establish a persistent WebSocket connection to stream raw PCM audio from the browser directly to the model. This allows for true "interruptibility"—if the user starts talking, the model stops listening, just like a human would.
*   **The Frontend**: A lightweight interface using vanilla audio APIs captures microphone input at 16kHz, ensuring high-fidelity audio transmission.
*   **Output**: Post-session, we pipe the conversation transcript $\mathcal{T}$ back into Gemini to grade the performance against the rubric, generating a PDF via `WeasyPrint`.
## Challenges we ran into
*   **The "Silence" Problem**: Detecting when a user has finished speaking versus when they are just pausing to think was our biggest hurdle. Traditional Voice Activity Detection (VAD) was too aggressive. We had to tune our audio frame handling to allow for natural "thinking pauses" without the AI awkwardly jumping in.
*   **Prompting for "Tough Love"**: By default, LLMs are helpful and agreeable. An interviewer needs to be skeptical. We spent significant time refining system prompts to force the model to challenge weak answers (e.g., "But *how* exactly did you handle that conflict?") rather than just accepting them.
*   **Audio Encoding Hell**: Browser audio APIs (WebM/Opus) and real-time processing (PCM) don't always play nice. Handling the transcoding efficiently in real-time without introducing lag required deep dives into binary stream manipulation.
## Accomplishments that we're proud of
*   **Zero-Latency Feel**: Achieving a conversation flow that feels almost instantaneous. The "turn-taking" between the user and the AI feels natural, not robotic.
*   **Personalization Depth**: The AI doesn't just ask generic questions. It references specific bullet points from the user's uploaded resume ("I see here you led a team of 5 in 2022..."), creating a startlingly real experience.
*   **Actionable Output**: Moving beyond a chatbot to a tool that produces a tangible asset (the PDF Study Guide) that users can actually study from.
## What we learned
*   **Latency is the new UX**: In text chat, a 2-second delay is fine. In voice, a 500ms delay breaks the immersive illusion.
*   **Contextual Endurance**: Maintaining a coherent "interviewer persona" over a 10-minute session—remembering earlier answers and connecting them to new questions—requires careful state management.
*   **Voice Vulnerability**: We learned that users feel more vulnerable regular voice than text. The application design had to be encouraging enough to keep them going, even while the AI was grilling them.
## What's next for PrepTalk
*   **Multimodal Interviews**: Using the camera to analyze non-verbal cues (eye contact, posture) during the interview.
*   **Company-Specific Personas**: Adding presets (e.g., "The Google Scrutinizer" vs. "The Startup Founder") to mimic different interviewing styles.
*   **Mock verify**: Allowing users to verify their employment history via blockchain credentials to create a "verified candidate" profile tailored for recruiters.