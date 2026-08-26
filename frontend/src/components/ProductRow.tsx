import { useState, type FormEvent } from "react";
import {
  ApiRequestError,
  releaseProduct,
  reserveProduct,
} from "../api/products";
import type { FeedbackMessage, Product } from "../types/product";
import { Feedback } from "./Feedback";

type ProductRowProps = {
  product: Product;
  onProductUpdated: (product: Product) => void;
};

function parseQuantityInput(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return null;
  }

  return quantity;
}

export function ProductRow({ product, onProductUpdated }: ProductRowProps) {
  const [quantityInput, setQuantityInput] = useState("1");
  const [pendingAction, setPendingAction] = useState<"reserve" | "release" | null>(
    null
  );
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const isLoading = pendingAction !== null;

  async function runAction(
    action: "reserve" | "release",
    event: FormEvent
  ): Promise<void> {
    event.preventDefault();
    setFeedback(null);

    const quantity = parseQuantityInput(quantityInput);
    if (quantity === null) {
      setFeedback({
        tone: "error",
        text: "Quantité invalide.",
      });
      return;
    }

    setPendingAction(action);

    try {
      const updated =
        action === "reserve"
          ? await reserveProduct(product.id, quantity)
          : await releaseProduct(product.id, quantity);

      onProductUpdated(updated);
      setFeedback({
        tone: "success",
        text:
          action === "reserve"
            ? `Réservation réussie. Stock : ${updated.quantity}`
            : `Libération réussie. Stock : ${updated.quantity}`,
      });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setFeedback({ tone: "error", text: error.message });
      } else {
        setFeedback({
          tone: "error",
          text: "Erreur serveur. Réessayez plus tard.",
        });
      }
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <article className="product">
      <div className="product__info">
        <h2 className="product__name">{product.name}</h2>
        <p className="product__stock">
          Stock disponible : <strong>{product.quantity}</strong>
        </p>
      </div>

      <form className="product__actions" onSubmit={(e) => void runAction("reserve", e)}>
        <label className="product__qty">
          <span>Quantité</span>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={quantityInput}
            disabled={isLoading}
            onChange={(event) => setQuantityInput(event.target.value)}
          />
        </label>

        <div className="product__buttons">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={isLoading}
          >
            {pendingAction === "reserve" ? "Réservation…" : "Réserver"}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={isLoading}
            onClick={(event) => void runAction("release", event)}
          >
            {pendingAction === "release" ? "Libération…" : "Libérer"}
          </button>
        </div>
      </form>

      <Feedback message={feedback} />
    </article>
  );
}
