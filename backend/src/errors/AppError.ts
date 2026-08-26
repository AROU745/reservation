import type { HttpErrorCode } from "../types/product";

export class AppError extends Error {
  readonly statusCode: HttpErrorCode;

  constructor(statusCode: HttpErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}
