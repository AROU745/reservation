import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import type { ApiError } from "../types/product";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const body: ApiError = { error: err.message };
    res.status(err.statusCode).json(body);
    return;
  }

  console.error(err);
  const body: ApiError = { error: "Internal server error" };
  res.status(500).json(body);
}
