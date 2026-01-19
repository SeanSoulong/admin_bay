import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { ADMIN_EMAILS } from "./config";
import { getFirebaseApp } from "./config";

// Get auth instance
export const getAuthInstance = () => {
  const app = getFirebaseApp();
  return getAuth(app);
};

// Check if user is admin
export const isAdmin = (user: User | null): boolean => {
  if (!user || !user.email) return false;
  return ADMIN_EMAILS.includes(user.email);
};

// Admin authentication
export const adminSignIn = async (
  email: string,
  password: string
): Promise<User> => {
  if (!ADMIN_EMAILS.includes(email)) {
    throw new Error("Access denied. Admin email required.");
  }

  const auth = getAuthInstance();
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
};

export const adminSignOut = (): Promise<void> => {
  const auth = getAuthInstance();
  return signOut(auth);
};
