import { initializeApp, getApps } from '@react-native-firebase/app';

// У браузері немає нативного google-services.json, тож застосунок Firebase створюємо вручну.
// Значення беруться зі змінних оточення EXPO_PUBLIC_FIREBASE_* (див. .env.example).
// Expo вбудовує EXPO_PUBLIC_* у бандл на етапі збірки, тому звертатися до них треба напряму.
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

const missing = Object.entries(config)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseReady: Promise<unknown> = getApps().length
  ? Promise.resolve()
  : missing.length
    ? Promise.reject(
        new Error(
          `Firebase web config is incomplete (missing: ${missing.join(', ')}). ` +
            'Copy .env.example to .env.local and fill in EXPO_PUBLIC_FIREBASE_* values.',
        ),
      )
    : initializeApp({
        ...(config as Record<keyof typeof config, string>),
        databaseURL: `https://${config.projectId}.firebaseio.com`,
      });
