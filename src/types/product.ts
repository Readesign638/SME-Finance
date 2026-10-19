export interface Product {
  id: string;
  userId: string;
  name: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  category?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  buyingPrice: number;
  subtotal: number;
}

export interface InventoryStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalProfitPotential: number;
}