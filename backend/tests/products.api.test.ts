import request from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import {
  createTestProduct,
  deleteTestProduct,
  getProductQuantity,
  setupTestDb,
} from "./helpers";

const createdIds: number[] = [];

async function createTrackedProduct(name: string, quantity: number) {
  const product = await createTestProduct(name, quantity);
  createdIds.push(product.id);
  return product;
}

describe("API /products", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterEach(async () => {
    while (createdIds.length > 0) {
      const id = createdIds.pop();
      if (id !== undefined) {
        await deleteTestProduct(id);
      }
    }
  });

  it("GET /products retourne la liste des produits avec le format attendu", async () => {
    const a = await createTrackedProduct("GET Fixture A", 4);
    const b = await createTrackedProduct("GET Fixture B", 2);

    const response = await request(app).get("/products");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(Array.isArray(response.body.data)).toBe(true);

    const ids = response.body.data.map((p: { id: number }) => p.id);
    expect(ids).toEqual(expect.arrayContaining([a.id, b.id]));

    const foundA = response.body.data.find((p: { id: number }) => p.id === a.id);
    expect(foundA).toMatchObject({
      id: a.id,
      name: "GET Fixture A",
      quantity: 4,
    });
    expect(foundA).toHaveProperty("createdAt");
    expect(foundA).toHaveProperty("updatedAt");
  });

  it("POST /products/:id/reserve diminue le stock d'une quantité valide", async () => {
    const product = await createTrackedProduct("Reserve Valid", 10);

    const response = await request(app)
      .post(`/products/${product.id}/reserve`)
      .send({ quantity: 3 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: product.id,
      name: "Reserve Valid",
      quantity: 7,
    });

    const quantityInDb = await getProductQuantity(product.id);
    expect(quantityInDb).toBe(7);
    expect(quantityInDb).toBe(product.quantity - 3);
  });

  it("POST /products/:id/reserve retourne 409 si la quantité dépasse le stock", async () => {
    const product = await createTrackedProduct("Reserve Overflow", 2);

    const response = await request(app)
      .post(`/products/${product.id}/reserve`)
      .send({ quantity: 5 });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "Insufficient stock" });

    const quantityInDb = await getProductQuantity(product.id);
    expect(quantityInDb).toBe(2);
  });

  it("POST /products/:id/reserve retourne 409 si on réserve exactement plus que le stock restant après une première réservation", async () => {
    const product = await createTrackedProduct("Reserve Partial Then Overflow", 3);

    const first = await request(app)
      .post(`/products/${product.id}/reserve`)
      .send({ quantity: 2 });
    expect(first.status).toBe(200);
    expect(first.body.data.quantity).toBe(1);

    const second = await request(app)
      .post(`/products/${product.id}/reserve`)
      .send({ quantity: 2 });
    expect(second.status).toBe(409);
    expect(second.body.error).toBe("Insufficient stock");

    expect(await getProductQuantity(product.id)).toBe(1);
  });

  it("POST /products/:id/reserve retourne 422 pour quantity = 0", async () => {
    const product = await createTrackedProduct("Reserve Zero", 5);

    const response = await request(app)
      .post(`/products/${product.id}/reserve`)
      .send({ quantity: 0 });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: "Quantity must be a positive integer",
    });
    expect(await getProductQuantity(product.id)).toBe(5);
  });

  it("POST /products/:id/reserve retourne 422 pour une quantité négative", async () => {
    const product = await createTrackedProduct("Reserve Negative", 5);

    const response = await request(app)
      .post(`/products/${product.id}/reserve`)
      .send({ quantity: -2 });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: "Quantity must be a positive integer",
    });
    expect(await getProductQuantity(product.id)).toBe(5);
  });

  it("POST /products/:id/reserve retourne 422 pour une quantité non entière", async () => {
    const product = await createTrackedProduct("Reserve Float", 5);

    const response = await request(app)
      .post(`/products/${product.id}/reserve`)
      .send({ quantity: 1.5 });

    expect(response.status).toBe(422);
    expect(await getProductQuantity(product.id)).toBe(5);
  });

  it("POST /products/:id/reserve retourne 422 si quantity est absente", async () => {
    const product = await createTrackedProduct("Reserve Missing Qty", 5);

    const response = await request(app)
      .post(`/products/${product.id}/reserve`)
      .send({});

    expect(response.status).toBe(422);
    expect(await getProductQuantity(product.id)).toBe(5);
  });

  it("POST /products/:id/reserve retourne 404 pour un produit inexistant", async () => {
    const missingId = 9_999_999;

    const existing = await prisma.product.findUnique({ where: { id: missingId } });
    expect(existing).toBeNull();

    const response = await request(app)
      .post(`/products/${missingId}/reserve`)
      .send({ quantity: 1 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Product not found" });
  });

  it("POST /products/:id/release augmente le stock", async () => {
    const product = await createTrackedProduct("Release Valid", 4);

    const response = await request(app)
      .post(`/products/${product.id}/release`)
      .send({ quantity: 3 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: product.id,
      quantity: 7,
    });

    expect(await getProductQuantity(product.id)).toBe(7);
  });

  it("POST /products/:id/release retourne 404 pour un produit inexistant", async () => {
    const response = await request(app)
      .post("/products/9999999/release")
      .send({ quantity: 1 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Product not found" });
  });

  it("POST /products/:id/release retourne 422 pour quantity = 0 ou négative", async () => {
    const product = await createTrackedProduct("Release Invalid Qty", 4);

    const zero = await request(app)
      .post(`/products/${product.id}/release`)
      .send({ quantity: 0 });
    expect(zero.status).toBe(422);

    const negative = await request(app)
      .post(`/products/${product.id}/release`)
      .send({ quantity: -1 });
    expect(negative.status).toBe(422);

    expect(await getProductQuantity(product.id)).toBe(4);
  });

  it("enchaînement réserve puis libère restaure le stock initial", async () => {
    const product = await createTrackedProduct("Reserve Then Release", 6);

    const reserved = await request(app)
      .post(`/products/${product.id}/reserve`)
      .send({ quantity: 4 });
    expect(reserved.status).toBe(200);
    expect(reserved.body.data.quantity).toBe(2);

    const released = await request(app)
      .post(`/products/${product.id}/release`)
      .send({ quantity: 4 });
    expect(released.status).toBe(200);
    expect(released.body.data.quantity).toBe(6);

    expect(await getProductQuantity(product.id)).toBe(6);
  });
});
