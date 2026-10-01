// src/db/settings.ts
import fs from 'fs';
import path from 'path';
import { db as sqlDb } from './index.ts';
import { settings } from './schema.ts';
import { eq } from 'drizzle-orm';
import { db as firestoreDb } from '../lib/firebase.ts';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface SchoolSettings {
  schoolName: string;
  place: string;
  gb?: string;
  pk?: string;
  kp?: string;
  motto?: string;
  logoUrl?: string;
}

const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'SEKOLAH KEBANGSAAN ROMPIN',
  place: 'NEGERI SEMBILAN',
  gb: '',
  pk: '',
  kp: '',
  motto: 'USAHA JAYA',
  logoUrl: 'https://i.postimg.cc/vxcg6FgY/LOGO-SEKOLAH-VECTOR.png',
};

// Local storage backup file path for seamless offline persistence
const SETTINGS_FILE_PATH = path.resolve(process.cwd(), 'school_settings.json');

function loadPersistedSettings(): SchoolSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const content = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

function savePersistedSettings(data: SchoolSettings) {
  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

let inMemorySettings: SchoolSettings = loadPersistedSettings();

export async function getSchoolSettings(): Promise<SchoolSettings> {
  try {
    if (firestoreDb) {
      const docSnap = await getDoc(doc(firestoreDb, 'settings', 'school_settings'));
      if (docSnap.exists()) {
        const data = docSnap.data() as SchoolSettings;
        inMemorySettings = {
          schoolName: data.schoolName || DEFAULT_SETTINGS.schoolName,
          place: data.place || DEFAULT_SETTINGS.place,
          gb: data.gb || '',
          pk: data.pk || '',
          kp: data.kp || '',
          motto: data.motto || '',
          logoUrl: data.logoUrl || DEFAULT_SETTINGS.logoUrl,
        };
        savePersistedSettings(inMemorySettings);
        return inMemorySettings;
      } else {
        await setDoc(doc(firestoreDb, 'settings', 'school_settings'), DEFAULT_SETTINGS);
      }
    }
  } catch (error) {
    console.warn('Firestore getSchoolSettings failed, checking fallback:', error);
  }

  try {
    const res = await sqlDb.select().from(settings).where(eq(settings.key, 'school_settings')).limit(1);
    if (res.length > 0) {
      inMemorySettings = {
        schoolName: res[0].schoolName,
        place: res[0].place,
        gb: res[0].gb || '',
        pk: res[0].pk || '',
        kp: res[0].kp || '',
        motto: res[0].motto || '',
        logoUrl: res[0].logoUrl || '',
      };
      savePersistedSettings(inMemorySettings);
      return inMemorySettings;
    }
  } catch {
    // ignore
  }

  return inMemorySettings;
}

export async function saveSchoolSettings(data: SchoolSettings): Promise<SchoolSettings> {
  inMemorySettings = {
    ...inMemorySettings,
    ...data,
  };
  savePersistedSettings(inMemorySettings);

  try {
    if (firestoreDb) {
      await setDoc(doc(firestoreDb, 'settings', 'school_settings'), {
        ...inMemorySettings,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (error) {
    console.warn('Firestore saveSchoolSettings failed:', error);
  }

  try {
    await sqlDb
      .insert(settings)
      .values({
        key: 'school_settings',
        schoolName: inMemorySettings.schoolName,
        place: inMemorySettings.place,
        gb: inMemorySettings.gb || '',
        pk: inMemorySettings.pk || '',
        kp: inMemorySettings.kp || '',
        motto: inMemorySettings.motto || '',
        logoUrl: inMemorySettings.logoUrl || '',
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          schoolName: inMemorySettings.schoolName,
          place: inMemorySettings.place,
          gb: inMemorySettings.gb || '',
          pk: inMemorySettings.pk || '',
          kp: inMemorySettings.kp || '',
          motto: inMemorySettings.motto || '',
          logoUrl: inMemorySettings.logoUrl || '',
          updatedAt: new Date(),
        },
      });
  } catch {
    // ignore
  }

  return inMemorySettings;
}
