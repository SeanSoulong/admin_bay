export * from "./config";
export * from "./auth";
export * from "./database";
export * from "./storage";
import { getFirebaseApp } from "./config";
import { getAuthInstance } from "./auth";
import { getDatabaseInstance } from "./database";
import { getStorageInstance } from "./storage";
export const app = getFirebaseApp();
export const auth = getAuthInstance();
export const database = getDatabaseInstance();
export const storage = getStorageInstance();
import { onAuthStateChanged, NextOrObserver, User } from "firebase/auth";
import { get, getDatabase, ref } from "firebase/database";

export const onAuthStateChange = (callback: NextOrObserver<User | null>) => {
  return onAuthStateChanged(auth, callback);
};

// Server-side friendly exports (no auth)
export const getServerDatabaseService = () => {
  const app = getFirebaseApp();
  const database = getDatabase(app);

  return {
    async getProducts() {
      const productsRef = ref(database, "shoppingItems");
      const snapshot = await get(productsRef);
      if (!snapshot.exists()) return [];
      const productsData = snapshot.val();
      return Object.keys(productsData).map((key) => ({
        id: key,
        ...productsData[key],
      }));
    },
  };
};
