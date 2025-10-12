<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15FPnpECp6G1ENImCKFUVJkjIv4bMYriF

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Start the realtime backend (in a new terminal if you also want the UI):
   `npm run server`
3. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
4. Run the app:
   `npm run dev`

The frontend expects the backend to be reachable at `http://localhost:4000` by default. You can override this by creating a `.env.local` file with:

```
VITE_API_BASE_URL=http://localhost:4000/api
VITE_EVENTS_URL=http://localhost:4000/api/events
```
