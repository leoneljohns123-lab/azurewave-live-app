# Azurewave - Firebase Studio

This is a modern, real-time social chat application built with Next.js, Tailwind CSS, and Firebase.

## How to Get Your Code

If the IDE's "Zip and Download" button is not working correctly, you can always download your code directly from the synced GitHub repository:

1.  **Go to your GitHub repository** linked to this project.
2.  Click the green **"<> Code"** button.
3.  Select **"Download ZIP"**.
4.  Extract the ZIP file to a folder on your computer.

## Troubleshooting Downloads
- **Browser Blockers**: Sometimes pop-up blockers or aggressive security extensions can stop the automatic download trigger. Check the address bar for any "blocked" icons.
- **Download History**: Press `Ctrl+J` (Windows) or `Cmd+Shift+J` (Mac) to see if the browser actually caught the file but didn't show the animation.
- **Incognito Mode**: Try downloading in an Incognito/Private window to rule out extension interference.

## Getting Started Locally

Once you have the code on your machine:

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Set up environment variables**:
    Create a `.env.local` file in the root directory and add your Firebase configuration and Gemini API key.

3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Deployment

This app is designed to be hosted on **Firebase App Hosting**. 

1.  Push your code to a **GitHub repository**.
2.  Connect the repository to a new **App Hosting** backend in the Firebase Console.
3.  Firebase will automatically build and deploy your Next.js app on every push to your main branch.

## Tech Stack

-   **Framework**: Next.js (App Router)
-   **Styling**: Tailwind CSS & Shadcn UI
-   **Backend**: Firebase (Auth, Firestore, Cloud Functions)
-   **AI**: Google Genkit (Gemini 2.5 Flash)
