import { databaseService } from "./firebase";
import { Product, Review, LearningCard } from "../types";

export async function getProducts(): Promise<Product[]> {
  try {
    const products = await databaseService.getProducts();
    return products || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("Failed to fetch products");
  }
}

export async function getReviews(): Promise<Review[]> {
  try {
    const reviews = await databaseService.getReviews();
    return reviews || [];
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw new Error("Failed to fetch reviews");
  }
}

export async function getLearningCards(): Promise<LearningCard[]> {
  try {
    const cards = await databaseService.getLearningCards();
    return cards || [];
  } catch (error) {
    console.error("Error fetching learning cards:", error);
    throw new Error("Failed to fetch learning cards");
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    return await databaseService.getProductById(id);
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

export async function getLearningCardById(
  uuid: string
): Promise<LearningCard | null> {
  try {
    return await databaseService.getLearningCardById(uuid);
  } catch (error) {
    console.error("Error fetching learning card:", error);
    return null;
  }
}

// For server-side actions
export async function deleteProduct(id: string): Promise<void> {
  try {
    await databaseService.deleteProduct(id);
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}

export async function updateProduct(
  id: string,
  data: Partial<Product>
): Promise<void> {
  try {
    await databaseService.updateProduct(id, data);
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
}
