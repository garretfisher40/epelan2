// src/db/files.ts
import { db as sqlDb } from './index.ts';
import { files } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { db as firestoreDb } from '../lib/firebase.ts';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

export interface FileRecord {
  id?: number;
  fileId: string;
  planId?: string | null;
  name: string;
  size: number;
  type: string;
  data: string;
  category?: string | null;
  uploadedBy?: string | null;
  createdAt?: Date | null;
}

let inMemoryFiles: FileRecord[] = [];

export async function getFiles(category?: string, planId?: string): Promise<FileRecord[]> {
  try {
    if (firestoreDb) {
      const snapshot = await getDocs(collection(firestoreDb, 'files'));
      if (!snapshot.empty) {
        const list: FileRecord[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as FileRecord);
        });
        inMemoryFiles = list;
        return list.filter((f) => {
          if (category && f.category !== category) return false;
          if (planId && f.planId !== planId) return false;
          return true;
        });
      }
    }
  } catch (error) {
    console.warn('Firestore getFiles failed, checking fallback:', error);
  }

  try {
    let query = sqlDb.select().from(files).orderBy(desc(files.createdAt));
    const all = await query;
    return all.filter((f) => {
      if (category && f.category !== category) return false;
      if (planId && f.planId !== planId) return false;
      return true;
    });
  } catch (error) {
    return inMemoryFiles.filter((f) => {
      if (category && f.category !== category) return false;
      if (planId && f.planId !== planId) return false;
      return true;
    });
  }
}

export async function saveFile(fileData: FileRecord): Promise<FileRecord> {
  const recordToSave: FileRecord = {
    ...fileData,
    planId: fileData.planId || null,
    category: fileData.category || 'dashboard',
    uploadedBy: fileData.uploadedBy || 'Pengguna',
    createdAt: new Date(),
  };

  try {
    if (firestoreDb) {
      await setDoc(doc(firestoreDb, 'files', recordToSave.fileId), recordToSave);
    }
  } catch (error) {
    console.warn('Firestore saveFile failed:', error);
  }

  try {
    await sqlDb.insert(files).values({
      fileId: recordToSave.fileId,
      planId: recordToSave.planId,
      name: recordToSave.name,
      size: recordToSave.size,
      type: recordToSave.type,
      data: recordToSave.data,
      category: recordToSave.category,
      uploadedBy: recordToSave.uploadedBy,
    });
  } catch {
    // ignore
  }

  inMemoryFiles.unshift(recordToSave);
  return recordToSave;
}

export async function deleteFileById(fileId: string): Promise<FileRecord | null> {
  try {
    if (firestoreDb) {
      await deleteDoc(doc(firestoreDb, 'files', fileId));
    }
  } catch (error) {
    console.warn(`Firestore deleteFileById failed for ${fileId}:`, error);
  }

  try {
    await sqlDb.delete(files).where(eq(files.fileId, fileId));
  } catch {
    // ignore
  }

  const idx = inMemoryFiles.findIndex((f) => f.fileId === fileId);
  if (idx >= 0) {
    return inMemoryFiles.splice(idx, 1)[0];
  }
  return null;
}
