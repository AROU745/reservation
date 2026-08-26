import type { Product } from "@prisma/client";
import { AppError } from "../errors/AppError";
import { ensureSqliteConcurrencyPragmas, prisma } from "../lib/prisma";
import type { ProductDTO } from "../types/product";

function toProductDTO(product: Product): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    quantity: product.quantity,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function parseProductId(id: string): number {
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    throw new AppError(422, "Invalid product id");
  }

  return productId;
}

function parseQuantity(quantity: unknown): number {
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError(422, "Quantity must be a positive integer");
  }

  return quantity;
}

export async function listProducts(): Promise<ProductDTO[]> {
  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
  });

  return products.map(toProductDTO);
}

/**
 * Réservation concurrente-safe (Prisma + SQLite).
 *
 * Stratégie : UPDATE conditionnel atomique (pas de read → check → write en mémoire).
 *
 * SQL équivalent :
 *   UPDATE Product
 *   SET quantity = quantity - :qty
 *   WHERE id = :id AND quantity >= :qty
 *
 * Pourquoi ça tient avec 2 requêtes sur stock = 1 :
 * - La décision « assez de stock ? » est dans le WHERE SQL, pas dans une variable JS.
 * - SQLite n'autorise qu'un seul writer à la fois : les deux UPDATE s'exécutent l'un après l'autre.
 * - Le 1er UPDATE passe (1 → 0). Le 2e ne matche plus aucune ligne (quantity = 0) → 409.
 * - Le stock ne peut pas devenir négatif : le WHERE + le CHECK(quantity >= 0) l'interdisent.
 *
 * On enveloppe dans $transaction pour garder UPDATE + lecture finale cohérents.
 * PRAGMA busy_timeout (voir lib/prisma.ts) fait attendre le 2e writer au lieu d'échouer en SQLITE_BUSY.
 */
export async function reserveProduct(
  idParam: string,
  quantityInput: unknown
): Promise<ProductDTO> {
  const id = parseProductId(idParam);
  const quantity = parseQuantity(quantityInput);

  await ensureSqliteConcurrencyPragmas();

  return prisma.$transaction(async (tx) => {
    // Atomique : decrement + garde dans le même UPDATE (pas de lecture JS préalable).
    const result = await tx.product.updateMany({
      where: {
        id,
        quantity: { gte: quantity },
      },
      data: {
        quantity: { decrement: quantity },
      },
    });

    if (result.count === 0) {
      const existing = await tx.product.findUnique({ where: { id } });

      if (!existing) {
        throw new AppError(404, "Product not found");
      }

      throw new AppError(409, "Insufficient stock");
    }

    const product = await tx.product.findUniqueOrThrow({ where: { id } });
    return toProductDTO(product);
  });
}

export async function releaseProduct(
  idParam: string,
  quantityInput: unknown
): Promise<ProductDTO> {
  const id = parseProductId(idParam);
  const quantity = parseQuantity(quantityInput);

  return prisma.$transaction(async (tx) => {
    const result = await tx.product.updateMany({
      where: { id },
      data: {
        quantity: { increment: quantity },
      },
    });

    if (result.count === 0) {
      throw new AppError(404, "Product not found");
    }

    const product = await tx.product.findUniqueOrThrow({ where: { id } });
    return toProductDTO(product);
  });
}
