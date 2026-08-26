import type { ApiError, ApiSuccess, Product } from "../types/product";

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

function messageForStatus(status: number, fallback: string): string {
  switch (status) {
    case 404:
      return "Produit introuvable.";
    case 409:
      return "Stock insuffisant.";
    case 422:
      return "Quantité invalide.";
    default:
      return fallback || "Erreur serveur. Réessayez plus tard.";
  }
}

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const payload = await parseJson<ApiSuccess<T> | ApiError>(response);

  if (!response.ok) {
    const apiMessage =
      payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "";
    throw new ApiRequestError(
      response.status,
      messageForStatus(response.status, apiMessage)
    );
  }

  if (!payload || !("data" in payload)) {
    throw new ApiRequestError(500, "Réponse serveur invalide.");
  }

  return payload.data;
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch("/products");
  return handleResponse<Product[]>(response);
}

export async function reserveProduct(
  id: number,
  quantity: number
): Promise<Product> {
  const response = await fetch(`/products/${id}/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });

  return handleResponse<Product>(response);
}

export async function releaseProduct(
  id: number,
  quantity: number
): Promise<Product> {
  const response = await fetch(`/products/${id}/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });

  return handleResponse<Product>(response);
}
