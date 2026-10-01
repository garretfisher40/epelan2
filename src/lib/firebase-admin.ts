// src/lib/firebase-admin.ts
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length 
  ? initializeApp({ projectId: firebaseConfig.projectId })
  : getApps()[0];

export const adminAuth = getAuth(app);


