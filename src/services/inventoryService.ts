import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  type DocumentData,
  type QuerySnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import type { Product, SaleItem } from '../types/product';

// Add a new product
export const createProduct = async (
  userId: string,
  data: Omit<Product, 'id' | 'userId' | 'createdAt'>
) => {
  return await addDoc(collection(db, 'products'), {
    ...data,
    userId,
    createdAt: new Date().toISOString()
  });
};

// Subscribe to all products for a user
export const subscribeToProducts = (
  userId: string,
  callback: (data: Product[]) => void
) => {
  const q = query(
    collection(db, 'products'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const items = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as Product[];
    callback(items);
  });
};

// Update product details
export const updateProduct = async (
  id: string,
  data: Partial<Omit<Product, 'id' | 'userId'>>
) => {
  const docRef = doc(db, 'products', id);
  return await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });
};

// Delete a product
export const deleteProduct = async (id: string) => {
  return await deleteDoc(doc(db, 'products', id));
};

// Deduct stock after a sale
export const deductStock = async (items: SaleItem[]) => {
  for (const item of items) {
    try {
      const productRef = doc(db, 'products', item.productId);
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const product = productSnap.data() as Product;
        const newStock = Math.max(0, product.stockQuantity - item.quantity);

        await updateDoc(productRef, {
          stockQuantity: newStock,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to deduct stock for', item.productName, error);
    }
  }
};

// Add stock (restock)
export const addStock = async (productId: string, quantity: number) => {
  const productRef = doc(db, 'products', productId);
  const productSnap = await getDoc(productRef);

  if (productSnap.exists()) {
    const product = productSnap.data() as Product;
    await updateDoc(productRef, {
      stockQuantity: product.stockQuantity + quantity,
      updatedAt: new Date().toISOString()
    });
  }
};

// Calculate inventory statistics
export const calculateInventoryStats = (products: Product[]): {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalProfitPotential: number;
} => {
  const totalProducts = products.length;

  const totalStockValue = products.reduce(
    (sum, p) => sum + (p.buyingPrice * p.stockQuantity),
    0
  );

  const lowStockCount = products.filter(
    (p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold
  ).length;

  const outOfStockCount = products.filter(
    (p) => p.stockQuantity === 0
  ).length;

  const totalProfitPotential = products.reduce(
    (sum, p) => sum + ((p.sellingPrice - p.buyingPrice) * p.stockQuantity),
    0
  );

  return {
    totalProducts,
    totalStockValue,
    lowStockCount,
    outOfStockCount,
    totalProfitPotential
  };
};