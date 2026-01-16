# LiveKit two-way voice coach research plan (Gemini Live, Option A)

## Assumptions
- Platform: Web
- Client stack: React or vanilla TypeScript
- Server stack: Node/Next.js
- Transport: LiveKit Cloud
- Model live audio API: Gemini Live
- Interaction mode: push-to-talk for first POC
- Room model: one room per user session, one coach agent per room
- Constraints: standard privacy/compliance controls, no raw audio retention by default

## 1) Scope and success metrics
- Use case: live, two-way voice between human and coach
- Must-have metrics (targets):
  - Round trip latency target: < 400 ms mouth-to-ear (record actual)
  - Audio glitch rate: < 1 glitch per 5 minutes
  - Reconnect time: < 3 seconds after network drop
  - Cost per minute: track and estimate

## 2) Architecture options and decision
### Selected: Option A — LiveKit handles WebRTC, backend bridges to Gemini Live audio API
- Browser publishes mic track to LiveKit
- Backend agent worker subscribes to audio, sends PCM to Gemini Live
- Backend receives model PCM, publishes back as a LiveKit audio track

Pros
- One stable WebRTC stack in the browser
- Server controls auth, logging, model usage

Cons
- Extra hop adds latency
- Requires resampling and buffering

Decision criteria
- Latency
- Complexity
- Security and auditability
- Multi-user scaling
- Cost

## 3) Research questions
Transport and audio
- How do we extract PCM from a LiveKit audio track in the agent worker?
- What sample rate comes from the browser mic track, and what does Gemini Live accept? (Keep close to existing audio format.)
- How do we publish a generated audio track back into LiveKit with low jitter?

Live conversation behavior
- How do we detect turn boundaries?
  - Push-to-talk (baseline)
  - VAD on client
  - VAD on server
- Do we need interruption (barge-in)? If yes, where implemented?

LiveKit product choices
- LiveKit Cloud vs self-host SFU
- LiveKit Agents framework vs custom worker
- Token auth model (server-minted JWT) and room permission scopes

Security and privacy
- What is logged (audio, transcripts, tool calls)?
- Retention defaults and controls
- PII handling plan
- Threat model for token leakage

Scaling and cost
- Concurrent sessions target
- Per-session CPU usage on worker
- Egress cost on LiveKit and model cost per minute

## 4) Doc and code reading checklist
LiveKit
- Rooms, tracks, publishing/subscribing
- Token generation and permissions
- LiveKit Agents (if using)
- Audio handling details (PCM extraction, sample rates, buffering)

Gemini Live audio API
- Session setup (websocket)
- Audio input format requirements (PCM16, sample rate)
- Audio output format requirements (PCM16, sample rate)
- Tool calling and streaming events

Reference projects
- Official LiveKit Agents examples
- Voice assistant sample that publishes a generated audio track
- Gemini Live + LiveKit plugin examples (if available)

## 5) POC build steps (small, testable)
POC 0: LiveKit baseline voice room
- Browser joins room
- Publishes mic
- Plays remote audio
- Record baseline latency and audio stability

POC 1: Server subscribes to mic audio and writes PCM to disk
- Agent worker joins as participant
- Subscribes to user mic track
- Saves 10 seconds PCM, confirm it is clean and matches existing format

POC 2: Bridge mic audio to Gemini Live, play model audio locally on server
- Send PCM frames to Gemini Live
- Receive PCM frames from Gemini Live
- Validate audio content and timing

POC 3: Publish Gemini Live audio back into LiveKit as an audio track
- Agent worker publishes generated audio track
- Browser plays coach audio from LiveKit
- Measure mouth-to-ear latency and jitter

POC 4: Turn-taking
- Implement push-to-talk
- Stop sending mic frames when button up
- Trigger model response only after release
- Add "cancel response" button that stops model stream and clears buffers

## 6) Test plan
Latency tests
- Timestamp mic frame capture on client
- Timestamp audio playback on client
- Use a known audible click test to measure mouth-to-ear

Network tests
- Throttle bandwidth
- Add packet loss
- Drop connection, measure reconnect

Audio quality tests
- Clipping, echo, background noise
- Sample rate mismatch artifacts
- Buffer underflow/overflow

Behavior tests
- Interrupt coach mid-sentence
- Long user monologue
- Rapid back-and-forth

## 7) Security and compliance checklist
- LiveKit JWT minted server-side only
- Short TTL for room tokens
- Separate permissions for user vs agent worker
- No long-lived Gemini Live keys in the browser
- Logging plan:
  - Default: no raw audio logs
  - Optional: store transcripts only, with redaction

## 8) Risks and mitigations
- Risk: latency too high
  - Mitigation: reduce hops, minimize resampling, use Opus in WebRTC, tune buffer sizes
- Risk: echo feedback loop
  - Mitigation: enable echo cancellation on client, avoid routing coach audio into mic capture
- Risk: choppy audio from buffer underflow
  - Mitigation: jitter buffer, fixed frame sizes, backpressure handling
- Risk: token leakage
  - Mitigation: TTL, audience claims, strict room grants

## 9) Decision log template
- Decision:
- Options considered:
- Data collected:
- Chosen option:
- Why:
- Follow-ups:

## 10) Milestones with time boxes
- M1: Baseline LiveKit room stable, metrics captured
- M2: Agent worker can capture clean PCM from mic
- M3: Gemini Live audio responds end-to-end
- M4: Gemini Live audio published back to LiveKit, stable playback
- M5: Turn-taking works (push-to-talk)
- M6: VAD added (optional)
- M7: Hardening (reconnect, metrics, logs, costs)

---

# App compartmentalization plan (general chat + new agent teams)

## Goals
- Keep the current general chat feature stable while enabling new agent teams with their own parameter sets.
- Make features independently deployable and testable.
- Centralize agent configuration while avoiding cross-feature coupling.

## Proposed feature boundaries
- **Feature: General Chat**
  - UI: chat message list, composer, context panel
  - Agent policy: default model, tools, prompt, temperature
- **Feature: Agent Team Profiles**
  - Config schema defining a team and parameter set
  - Versioned configs (team_id, schema_version)
- **Feature: Voice Coach**
  - LiveKit + Gemini Live streaming, isolated from chat feature
  - No direct dependency on chat UI components

## Config and routing design
- Central Agent Registry config
  - JSON schema for allowed parameters
  - Policy validation layer per team
- Feature flags or routing layer
  - team_id routes to a specific agent set
  - Support new parameters without touching general chat UI

## Example API shape
```json
{
  "team_id": "coach-team",
  "session_id": "abc123",
  "message": "Help me practice a pitch",
  "params": {
    "tone": "friendly",
    "verbosity": "short"
  }
}
```

## Observability and operational boundaries
- Team-level metrics: latency, error rate, cost per minute
- Config version included in logs
- Feature-level dashboards (general chat vs voice coach)

---

# Code review checklist: adding another team of agents

## Functionality
- New team config added in registry with schema validation
- Parameter set scoped to team only (no global default changes)
- Backward compatibility for general chat
- All new parameters documented with examples

## Security
- Model keys remain server-side
- Token scopes correct per team
- Logging and retention remain per policy

## Performance
- Parameter changes do not increase baseline latency
- Worker concurrency and CPU usage measured

## Observability
- team_id and schema_version included in logs
- Team metrics wired (latency, error rate, cost)

## Testing
- Unit tests for config schema validation
- End-to-end test: general chat + new team
- Load test for concurrent sessions (if applicable)

---

## Implementation notes (do not code yet)
- Use LiveKit room tokens minted by backend
- Run agent worker as a separate process/container
- Use fixed frame sizes for PCM (example: 20 ms frames)
- Add resampler in one place only (agent worker)
- Add metrics counters for:
  - audio frames in/out
  - buffer depth
  - reconnect count
  - model stream start/stop times
  - cost per session
