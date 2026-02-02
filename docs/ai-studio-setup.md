# AI Studio setup (Gemini API key)

Use Google AI Studio to create a Gemini API key and configure PrepTalk to use it.

## 1) Create/select a project in AI Studio
1. Open AI Studio (`https://aistudio.google.com/`) and pick **Create project** or **Select project**.
2. Ensure billing is enabled on that Google Cloud project if required for your usage.

## 2) Create a Gemini API key
1. In AI Studio, open **Get API key**.
2. Create an API key for the selected project.

## 3) Configure the app
Set the key in your environment (server-side only):

```bash
GEMINI_API_KEY=your-ai-studio-key
# Optional fallback name:
# GOOGLE_API_KEY=your-ai-studio-key
```

Restart the app:
```bash
./run.sh ui
```

## 4) Shared endpoint for hackathon demos
PrepTalk’s backend is the shared endpoint. When you deploy the FastAPI backend, share its base URL and point the UI to it:

```bash
APP_API_BASE=https://your-shared-endpoint.example/api
```

If you host UI and backend together, you can leave `APP_API_BASE=/api`.
