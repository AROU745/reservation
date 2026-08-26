import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import {
  createTestProduct,
  deleteTestProduct,
  getProductQuantity,
  setupTestDb,
} from "./helpers";

describe("scénario senior — dernier article (stock = 1)", () => {
  const createdIds: number[] = [];

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await deleteTestProduct(id);
    }
  });

  it("deux réservations concurrentes : une seule réussit, l'autre 409, stock final 0", async () => {
    const product = await createTestProduct("Last Item Concurrent", 1);
    createdIds.push(product.id);

    const [responseA, responseB] = await Promise.all([
      request(app).post(`/products/${product.id}/reserve`).send({ quantity: 1 }),
      request(app).post(`/products/${product.id}/reserve`).send({ quantity: 1 }),
    ]);

    const responses = [responseA, responseB];
    const successes = responses.filter((r) => r.status === 200);
    const conflicts = responses.filter((r) => r.status === 409);

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(1);

    expect(successes[0].body.data).toMatchObject({
      id: product.id,
      quantity: 0,
    });
    expect(conflicts[0].body).toEqual({ error: "Insufficient stock" });

    const finalQuantity = await getProductQuantity(product.id);
    expect(finalQuantity).toBe(0);
    expect(finalQuantity).toBeGreaterThanOrEqual(0);
  });

  it("reste robuste sur plusieurs vagues concurrentes sans stock négatif", async () => {
    const product = await createTestProduct("Burst Concurrent", 1);
    createdIds.push(product.id);

    const wave1 = await Promise.all([
      request(app).post(`/products/${product.id}/reserve`).send({ quantity: 1 }),
      request(app).post(`/products/${product.id}/reserve`).send({ quantity: 1 }),
      request(app).post(`/products/${product.id}/reserve`).send({ quantity: 1 }),
    ]);

    expect(wave1.filter((r) => r.status === 200)).toHaveLength(1);
    expect(wave1.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await getProductQuantity(product.id)).toBe(0);

    await prisma.product.update({
      where: { id: product.id },
      data: { quantity: 1 },
    });

    const wave2 = await Promise.all([
      request(app).post(`/products/${product.id}/reserve`).send({ quantity: 1 }),
      request(app).post(`/products/${product.id}/reserve`).send({ quantity: 1 }),
    ]);

    expect(wave2.filter((r) => r.status === 200)).toHaveLength(1);
    expect(wave2.filter((r) => r.status === 409)).toHaveLength(1);
    expect(await getProductQuantity(product.id)).toBe(0);
  });
});
