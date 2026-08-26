import cors from "cors";
import express from "express";
import path from "path";
import { errorHandler } from "./middleware/errorHandler";
import { productsRouter } from "./routes/products";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/products", productsRouter);

const frontendDist = path.resolve(__dirname, "../../frontend/dist");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(frontendDist));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/products") || req.path === "/health") {
      next();
      return;
    }

    res.sendFile(path.join(frontendDist, "index.html"), (err) => {
      if (err) {
        next(err);
      }
    });
  });
}

app.use(errorHandler);
