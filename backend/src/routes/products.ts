import { Router } from "express";
import * as productController from "../controllers/productController";

export const productsRouter = Router();

productsRouter.get("/", productController.getProducts);
productsRouter.post("/:id/reserve", productController.reserveProduct);
productsRouter.post("/:id/release", productController.releaseProduct);
