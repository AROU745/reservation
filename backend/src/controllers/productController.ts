import type { NextFunction, Request, Response } from "express";
import * as productService from "../services/productService";
import type { ApiSuccess, ProductDTO } from "../types/product";

export async function getProducts(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const products = await productService.listProducts();
    const body: ApiSuccess<ProductDTO[]> = { data: products };
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
}

export async function reserveProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const product = await productService.reserveProduct(
      req.params.id,
      req.body?.quantity
    );
    const body: ApiSuccess<ProductDTO> = { data: product };
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
}

export async function releaseProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const product = await productService.releaseProduct(
      req.params.id,
      req.body?.quantity
    );
    const body: ApiSuccess<ProductDTO> = { data: product };
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
}
