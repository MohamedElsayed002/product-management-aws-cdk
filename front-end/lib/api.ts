import axios from 'axios';

const API_BASE_URL = 'https://jmnylyt1bi.execute-api.eu-north-1.amazonaws.com';

export interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string; // S3 URL for the image
  thumbnailUrl?: string; // Optional thumbnail image
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  imageFile: File | null;
}

export interface CreateProductResponse {
  message: string;
  product: Product;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const productsApi = {
  createProduct: async (product: CreateProductRequest): Promise<CreateProductResponse> => {
    // Convert image file to base64 if present
    let imageUrl: string | undefined;
    if (product.imageFile) {
      imageUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(product.imageFile!);
      });
    }

    const requestData = {
      name: product.name,
      description: product.description,
      price: product.price,
      imageData: imageUrl || '',
    };

    const response = await api.post<CreateProductResponse>('/products', requestData);
    console.log(response.data);
    return response.data;
  },

  getProducts: async (): Promise<Product[]> => {
    const response = await api.get('/products');
    const data = response.data;

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: any): Product => {
      const id = item.id?.S ?? item.id;
      const name = item.name?.S ?? item.name ?? '';
      const description = item.description?.S ?? item.description ?? '';
      const rawPrice = item.price?.N ?? item.price;
      const price = typeof rawPrice === 'string' ? Number(rawPrice) : Number(rawPrice ?? 0);
      const imageUrl = item.imageUrl?.S ?? item.imageUrl ?? '';
      const thumbnailUrl = item.thumbnailUrl?.S ?? item.thumbnailUrl;
      const createdAt = item.createdAt?.S ?? item.createdAt;
      const updatedAt = item.updatedAt?.S ?? item.updatedAt;

      return {
        id,
        name,
        description,
        price,
        imageUrl,
        thumbnailUrl,
        createdAt,
        updatedAt,
      };
    });
  },

  removeProduct: async (productId: string): Promise<{ message: string; productId: string }> => {
    const response = await api.delete<{ message: string; productId: string }>(`/products/${productId}`);
    return response.data;
  },
};
