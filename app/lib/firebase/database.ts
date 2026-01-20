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
import { Product, Review, LearningCard } from "../../types";

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

// Database operations
export const databaseService = {
  // Products
  async getProducts(): Promise<Product[]> {
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
  },

  async getProductById(id: string): Promise<Product | null> {
    const db = getDatabaseInstance();
    const productRef = ref(db, `${dbPaths.marketplace}/${id}`);
    const snapshot = await get(productRef);

    if (!snapshot.exists()) return null;
    return { id, ...snapshot.val() };
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<void> {
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
  },

  async deleteProduct(id: string): Promise<void> {
    const db = getDatabaseInstance();
    const productRef = ref(db, `${dbPaths.marketplace}/${id}`);
    await remove(productRef);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createProduct(data: any): Promise<string> {
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
    };

    await set(newProductRef, productData);
    return newProductRef.key!;
  },

  // Reviews
  async getReviews(): Promise<Review[]> {
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
  },

  async deleteReview(id: string): Promise<void> {
    const db = getDatabaseInstance();
    const reviewRef = ref(db, `${dbPaths.reviews}/${id}`);
    await remove(reviewRef);
  },

  async updateReview(id: string, data: Partial<Review>): Promise<void> {
    const db = getDatabaseInstance();
    const reviewRef = ref(db, `${dbPaths.reviews}/${id}`);
    await update(reviewRef, { ...data, updatedAt: Date.now() });
  },

  async getReviewsByProductId(itemId: string): Promise<Review[]> {
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
  },

  // Learning Hub
  async getLearningCards(): Promise<LearningCard[]> {
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
  },

  async getLearningCardById(uuid: string): Promise<LearningCard | null> {
    const db = getDatabaseInstance();
    const cardRef = ref(db, `${dbPaths.learningHub}/cards/${uuid}`);
    const snapshot = await get(cardRef);

    if (!snapshot.exists()) return null;
    return { uuid, ...snapshot.val() };
  },

  async createLearningCard(
    cardData: Omit<LearningCard, "uuid">
  ): Promise<LearningCard> {
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
  },

  async updateLearningCard(
    uuid: string,
    data: Partial<LearningCard>
  ): Promise<void> {
    const db = getDatabaseInstance();
    const cardRef = ref(db, `${dbPaths.learningHub}/cards/${uuid}`);
    const snapshot = await get(cardRef);

    if (!snapshot.exists()) {
      throw new Error(`Card with UUID ${uuid} not found`);
    }

    const currentData = snapshot.val();
    await update(cardRef, { ...currentData, ...data });
  },

  async deleteLearningCard(uuid: string): Promise<void> {
    const db = getDatabaseInstance();
    const cardRef = ref(db, `${dbPaths.learningHub}/cards/${uuid}`);
    await remove(cardRef);

    // Clean up saved cards
    await this.cleanupSavedCards(uuid);
  },

  async cleanupSavedCards(uuid: string): Promise<void> {
    const db = getDatabaseInstance();
    const savedCardsRef = ref(db, `${dbPaths.learningHub}/user_saved_cards`);
    const savedSnapshot = await get(savedCardsRef);

    if (!savedSnapshot.exists()) return;

    const savedData = savedSnapshot.val();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};

    Object.keys(savedData).forEach((userId) => {
      if (savedData[userId] && savedData[userId][uuid]) {
        updates[`${dbPaths.learningHub}/user_saved_cards/${userId}/${uuid}`] =
          null;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
    }
  },
};

// For backward compatibility
export const firestoreService = databaseService;
