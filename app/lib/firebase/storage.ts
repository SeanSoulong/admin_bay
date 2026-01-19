import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { getFirebaseApp } from "./config";

// Get storage instance
export const getStorageInstance = () => {
  const app = getFirebaseApp();
  return getStorage(app);
};

// Storage operations
export const storageService = {
  async uploadImage(file: File, path: string): Promise<string> {
    const storage = getStorageInstance();
    const imageRef = ref(storage, path);
    const snapshot = await uploadBytes(imageRef, file);
    return await getDownloadURL(snapshot.ref);
  },

  async deleteImage(url: string): Promise<void> {
    try {
      const storage = getStorageInstance();
      const imageRef = ref(storage, url);
      await deleteObject(imageRef);
    } catch (error) {
      console.error("Error deleting image:", error);
      throw error;
    }
  },

  async uploadWithProgress(file: File, path: string): Promise<string> {
    const storage = getStorageInstance();
    const imageRef = ref(storage, path);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytes(imageRef, file);

      uploadTask
        .then(async (snapshot) => {
          try {
            const url = await getDownloadURL(snapshot.ref);
            resolve(url);
          } catch (error) {
            reject(error);
          }
        })
        .catch(reject);
    });
  },
};
