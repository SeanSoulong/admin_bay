import { storage } from "./firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

export const uploadImage = async (
  file: File,
  folder: string = "marketplace",
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;

    const storageRef = ref(storage, `${folder}/${fileName}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

export const deleteImage = async (url: string): Promise<void> => {
  try {
    const urlObj = new URL(url);
    const path = decodeURIComponent(urlObj.pathname);

    const match = path.match(/\/o\/(.+)/);
    if (match) {
      const storagePath = match[1];
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } else {
      throw new Error("Invalid storage URL");
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
};

export const extractPathFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const path = decodeURIComponent(urlObj.pathname);
    const match = path.match(/\/o\/(.+)/);
    return match ? match[1] : url;
  } catch {
    return url;
  }
};
