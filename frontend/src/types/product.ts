export type Product = {
  id: number;
  name: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiSuccess<T> = {
  data: T;
};

export type ApiError = {
  error: string;
};

export type FeedbackTone = "success" | "error";

export type FeedbackMessage = {
  tone: FeedbackTone;
  text: string;
};
