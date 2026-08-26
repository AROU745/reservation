import { prisma, ensureSqliteConcurrencyPragmas } from "../src/lib/prisma";

export async function setupTestDb(): Promise<void> {
  await ensureSqliteConcurrencyPragmas();
}

export async function createTestProduct(
  name: string,
  quantity: number
): Promise<{ id: number; name: string; quantity: number }> {
  return prisma.product.create({
    data: { name, quantity },
  });
}

export async function getProductQuantity(id: number): Promise<number> {
  const product = await prisma.product.findUniqueOrThrow({ where: { id } });
  return product.quantity;
}

export async function deleteTestProduct(id: number): Promise<void> {
  await prisma.product.deleteMany({ where: { id } });
}
