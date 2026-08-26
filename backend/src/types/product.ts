export type ProductDTO = {
  id: number;
  name: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
};

export type QuantityBody = {
  quantity: number;
};

export type ApiSuccess<T> = {
  data: T;
};

export type ApiError = {
  error: string;
};

export type HttpErrorCode = 404 | 409 | 422 | 500;
