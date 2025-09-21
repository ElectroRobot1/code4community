# Development Setup Guide

## For New Developers

### 1. Clone the Repository
```bash
git clone <your-github-repo-url>
cd brhs
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp .env.example .env.local
```

Then edit `.env.local` with your Firebase project details:

```env
# Firebase Configuration (get these from your Firebase project)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Admin Configuration
ADMIN_EMAIL=your_admin_email@domain.com
```

### 4. Set Up Your Own Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password + Google)
4. Create Firestore database
5. Copy the config values to your `.env.local`

### 5. Set Up Firestore Rules

Copy the rules from `firestore.rules` to your Firebase project:
1. Go to Firestore Database → Rules
2. Replace the default rules with the contents of `firestore.rules`
3. Update the admin email in the rules to match your admin email

### 6. Run the Development Server

```bash
npm run dev
```

## For Production (Vercel)

### 1. Set Environment Variables in Vercel

Go to your Vercel project dashboard → Settings → Environment Variables and add:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `ADMIN_EMAIL`

### 2. Deploy

Vercel will automatically deploy when you push to GitHub.

## Important Notes

- **Never commit `.env.local`** - it's in `.gitignore`
- **Each developer needs their own Firebase project** for development
- **Production uses the main Firebase project** with Vercel environment variables
- **Update `firestore.rules`** with the correct admin email for each environment
