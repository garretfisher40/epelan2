// src/db/users.ts
import { db as sqlDb } from './index.ts';
import { users } from './schema.ts';
import { db as firestoreDb } from '../lib/firebase.ts';
import { doc, setDoc } from 'firebase/firestore';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  const userData = {
    uid,
    email,
    displayName: displayName || email.split('@')[0],
    updatedAt: new Date().toISOString(),
  };

  try {
    if (firestoreDb) {
      await setDoc(doc(firestoreDb, 'users', uid), userData, { merge: true });
    }
  } catch (error) {
    console.warn('Firestore user sync failed:', error);
  }

  try {
    const result = await sqlDb
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || email.split('@')[0],
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    return {
      id: 1,
      uid,
      email,
      displayName: displayName || email.split('@')[0],
      createdAt: new Date(),
    };
  }
}


