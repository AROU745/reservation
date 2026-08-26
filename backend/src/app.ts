import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { productsRouter } from "./routes/products";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/products", productsRouter);

app.use(errorHandler);
