import {
  getDatabase,
  ref,
  get,
  remove,
  update,
  push,
  set,
} from "firebase/database";
import { getFirebaseApp } from "./config";
import { Product, Review, LearningCard, User } from "../../types";

export const dbPaths = {
  marketplace: "shoppingItems",
  reviews: "reviews",
  users: "users",
  learningHub: "learning_hub",
};

// Get database instance
export const getDatabaseInstance = () => {
  const app = getFirebaseApp();
  return getDatabase(app);
};

// Retry utility for rate limiting
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      lastError = error;

      // Check if it's a 429 error (rate limit)
      if (error.code === 429 || error.message?.includes("429")) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        console.log(
          `Rate limited, retrying in ${Math.round(delay)}ms... (attempt ${
            i + 1
          }/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError!;
}

export const databaseService = {
  // Products
  async getProducts(): Promise<Product[]> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const productsRef = ref(db, dbPaths.marketplace);
      const snapshot = await get(productsRef);

      if (!snapshot.exists()) return [];

      const productsData = snapshot.val();
      return Object.keys(productsData)
        .map((key) => ({
          id: key,
          ...productsData[key],
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    });
  },

  async getProductById(id: string): Promise<Product | null> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const productRef = ref(db, `${dbPaths.marketplace}/${id}`);
      const snapshot = await get(productRef);

      if (!snapshot.exists()) return null;
      return { id, ...snapshot.val() };
    });
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const productRef = ref(db, `${dbPaths.marketplace}/${id}`);
      const snapshot = await get(productRef);

      if (!snapshot.exists()) {
        throw new Error(`Product with ID ${id} not found`);
      }

      const currentData = snapshot.val();
      const updatedData = {
        ...currentData,
        ...data,
        updatedAt: Date.now(),
      };

      await update(productRef, updatedData);
    });
  },

  async deleteProduct(id: string): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const productRef = ref(db, `${dbPaths.marketplace}/${id}`);
      await remove(productRef);
    });
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createProduct(data: any): Promise<string> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const productsRef = ref(db, dbPaths.marketplace);
      const newProductRef = push(productsRef);

      const productData = {
        ...data,
        id: newProductRef.key,
        itemId: newProductRef.key,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        rating: data.rating || 0,
        review_count: data.review_count || 0,
        visibility: data.visibility || "public",
        moderation: data.moderation || { status: "clean" },
      };

      await set(newProductRef, productData);
      return newProductRef.key!;
    });
  },

  async warnProduct(
    productId: string,
    payload: { userId: string; adminId: string; message: string }
  ): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const now = Date.now();
      const expiresAt = now + 168 * 60 * 60 * 1000; // 7 days

      const productRef = ref(db, `${dbPaths.marketplace}/${productId}`);
      const snap = await get(productRef);
      if (!snap.exists()) throw new Error("Product not found");

      await update(productRef, {
        visibility: "hidden",
        moderation: {
          status: "warned",
          warnedAt: now,
          expiresAt,
          warnedBy: payload.adminId,
          warningMessage: payload.message,
        },
        updatedAt: now,
      });
    });
  },

  async deleteProductWarning(productId: string): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const now = Date.now();

      const productRef = ref(db, `${dbPaths.marketplace}/${productId}`);
      const snap = await get(productRef);
      if (!snap.exists()) throw new Error("Product not found");

      await update(productRef, {
        visibility: "visible",
        moderation: {
          status: "clean",
          resolvedAt: now,
        },
        updatedAt: now,
      });
    });
  },

  // Reviews
  async getReviews(): Promise<Review[]> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const reviewsRef = ref(db, dbPaths.reviews);
      const snapshot = await get(reviewsRef);

      if (!snapshot.exists()) return [];

      const reviewsData = snapshot.val();
      return Object.keys(reviewsData)
        .map((key) => ({
          id: key,
          reviewId: key,
          ...reviewsData[key],
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    });
  },

  async deleteReview(id: string): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const reviewRef = ref(db, `${dbPaths.reviews}/${id}`);
      await remove(reviewRef);
    });
  },

  async updateReview(id: string, data: Partial<Review>): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const reviewRef = ref(db, `${dbPaths.reviews}/${id}`);
      await update(reviewRef, { ...data, updatedAt: Date.now() });
    });
  },

  async getReviewsByProductId(itemId: string): Promise<Review[]> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const reviewsRef = ref(db, dbPaths.reviews);
      const snapshot = await get(reviewsRef);

      if (!snapshot.exists()) return [];

      const reviewsData = snapshot.val();
      return Object.keys(reviewsData)
        .map((key) => ({
          id: key,
          reviewId: key,
          ...reviewsData[key],
        }))
        .filter((review) => review.itemId === itemId);
    });
  },

  // Learning Hub
  async getLearningCards(): Promise<LearningCard[]> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const cardsRef = ref(db, `${dbPaths.learningHub}/cards`);
      const snapshot = await get(cardsRef);

      if (!snapshot.exists()) return [];

      const cardsData = snapshot.val();
      return Object.keys(cardsData)
        .map((key) => ({
          uuid: key,
          ...cardsData[key],
        }))
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
    });
  },

  async getLearningCardById(uuid: string): Promise<LearningCard | null> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const cardRef = ref(db, `${dbPaths.learningHub}/cards/${uuid}`);
      const snapshot = await get(cardRef);

      if (!snapshot.exists()) return null;
      return { uuid, ...snapshot.val() };
    });
  },

  async createLearningCard(
    cardData: Omit<LearningCard, "uuid">
  ): Promise<LearningCard> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const cardsRef = ref(db, `${dbPaths.learningHub}/cards`);
      const newCardRef = push(cardsRef);
      const uuid = newCardRef.key!;

      const card = {
        ...cardData,
        uuid,
        createdAt: new Date().toISOString(),
      };

      await set(newCardRef, card);
      return card;
    });
  },

  async updateLearningCard(uuid: string, data: Partial<LearningCard>) {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const cardRef = ref(db, `${dbPaths.learningHub}/cards/${uuid}`);
      const snapshot = await get(cardRef);

      if (!snapshot.exists())
        throw new Error(`Card with UUID ${uuid} not found`);

      const currentData = snapshot.val();
      await update(cardRef, { ...currentData, ...data });
    });
  },

  async deleteLearningCard(uuid: string): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const cardRef = ref(db, `${dbPaths.learningHub}/cards/${uuid}`);
      await remove(cardRef);
    });
  },

  // USERS SECTION
  async getOnlineStatus(): Promise<Record<string, boolean>> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const onlineStatusRef = ref(db, "online-status");
      const snapshot = await get(onlineStatusRef);

      if (!snapshot.exists()) return {};
      return snapshot.val();
    });
  },

  async getUserWithOnlineStatus(
    userId: string
  ): Promise<(User & { online: boolean }) | null> {
    return withRetry(async () => {
      const db = getDatabaseInstance();

      // Get user data
      const userRef = ref(db, `${dbPaths.users}/${userId}`);
      const userSnapshot = await get(userRef);

      if (!userSnapshot.exists()) return null;

      // Get online status
      const onlineStatusRef = ref(db, `online-status/${userId}`);
      const onlineSnapshot = await get(onlineStatusRef);

      const userData = userSnapshot.val();
      const online = onlineSnapshot.exists() ? onlineSnapshot.val() : false;

      return {
        userId,
        ...userData,
        online, // Use online-status if available, otherwise fallback to user.online
      };
    });
  },

  async getUsersWithOnlineStatus(): Promise<User[]> {
    return withRetry(async () => {
      const db = getDatabaseInstance();

      // Get all users
      const usersRef = ref(db, dbPaths.users);
      const usersSnapshot = await get(usersRef);

      if (!usersSnapshot.exists()) return [];

      // Get all online statuses
      const onlineStatusRef = ref(db, "online-status");
      const onlineSnapshot = await get(onlineStatusRef);
      const onlineStatus = onlineSnapshot.exists() ? onlineSnapshot.val() : {};

      const usersData = usersSnapshot.val();

      return Object.keys(usersData)
        .map((key) => ({
          userId: key,
          ...usersData[key],
          // Use online-status if available, otherwise fallback to user.online or false
          online:
            onlineStatus[key] !== undefined
              ? onlineStatus[key]
              : usersData[key].online || false,
        }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    });
  },

  // Update getUsers to use getUsersWithOnlineStatus
  async getUsers(): Promise<User[]> {
    return this.getUsersWithOnlineStatus();
  },

  async getUserById(userId: string): Promise<User | null> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const userRef = ref(db, `${dbPaths.users}/${userId}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) return null;
      return { userId, ...snapshot.val() };
    });
  },

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const userRef = ref(db, `${dbPaths.users}/${userId}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const currentData = snapshot.val();
      const updatedData = {
        ...currentData,
        ...data,
        updatedAt: Date.now(),
      };

      await update(userRef, updatedData);
    });
  },

  async deleteUser(userId: string): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const userRef = ref(db, `${dbPaths.users}/${userId}`);
      await remove(userRef);

      // Also clean up user's products and reviews
      await this.cleanupUserData(userId);
    });
  },

  async cleanupUserData(userId: string): Promise<void> {
    const db = getDatabaseInstance();

    // Delete user's products
    const productsRef = ref(db, dbPaths.marketplace);
    const productsSnapshot = await get(productsRef);

    if (productsSnapshot.exists()) {
      const products = productsSnapshot.val();
      const updates: Record<string, null> = {};

      Object.keys(products).forEach((key) => {
        if (products[key].userId === userId) {
          updates[`${dbPaths.marketplace}/${key}`] = null;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }
    }

    // Delete user's reviews
    const reviewsRef = ref(db, dbPaths.reviews);
    const reviewsSnapshot = await get(reviewsRef);

    if (reviewsSnapshot.exists()) {
      const reviews = reviewsSnapshot.val();
      const updates: Record<string, null> = {};

      Object.keys(reviews).forEach((key) => {
        if (reviews[key].userId === userId) {
          updates[`${dbPaths.reviews}/${key}`] = null;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }
    }
  },

  // Moderation methods for users
  async warnUser(
    userId: string,
    payload: { adminId: string; message: string }
  ): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const now = Date.now();
      const expiresAt = now + 168 * 60 * 60 * 1000; // 7 days

      const userRef = ref(db, `${dbPaths.users}/${userId}`);
      const snap = await get(userRef);
      if (!snap.exists()) throw new Error("User not found");

      await update(userRef, {
        moderation: {
          status: "warned",
          warnedAt: now,
          expiresAt,
          warnedBy: payload.adminId,
          warningMessage: payload.message,
        },
        updatedAt: now,
      });
    });
  },

  async suspendUser(
    userId: string,
    payload: { adminId: string; reason: string; days: number }
  ): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const now = Date.now();
      const suspendedUntil = now + payload.days * 24 * 60 * 60 * 1000;

      const userRef = ref(db, `${dbPaths.users}/${userId}`);
      const snap = await get(userRef);
      if (!snap.exists()) throw new Error("User not found");

      await update(userRef, {
        moderation: {
          status: "suspended",
          suspendedAt: now,
          suspendedUntil,
          suspendedBy: payload.adminId,
          suspensionReason: payload.reason,
        },
        updatedAt: now,
      });
    });
  },

  async banUser(
    userId: string,
    payload: { adminId: string; reason: string }
  ): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const now = Date.now();

      const userRef = ref(db, `${dbPaths.users}/${userId}`);
      const snap = await get(userRef);
      if (!snap.exists()) throw new Error("User not found");

      await update(userRef, {
        moderation: {
          status: "banned",
          bannedAt: now,
          bannedBy: payload.adminId,
          banReason: payload.reason,
        },
        updatedAt: now,
      });
    });
  },

  async reinstateUser(userId: string): Promise<void> {
    return withRetry(async () => {
      const db = getDatabaseInstance();
      const now = Date.now();

      const userRef = ref(db, `${dbPaths.users}/${userId}`);
      const snap = await get(userRef);
      if (!snap.exists()) throw new Error("User not found");

      await update(userRef, {
        moderation: {
          status: "clean",
          resolvedAt: now,
        },
        updatedAt: now,
      });
    });
  },
};

// Backward compatibility
export const firestoreService = databaseService;
