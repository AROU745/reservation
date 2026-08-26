import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, fetchProducts } from "./api/products";
import { ProductRow } from "./components/ProductRow";
import type { Product } from "./types/product";

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setLoadError(error.message);
      } else {
        setLoadError("Impossible de charger les produits.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function handleProductUpdated(updated: Product): void {
    setProducts((current) =>
      current.map((product) =>
        product.id === updated.id ? updated : product
      )
    );
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>Réservation de stock</h1>
        <p>Réservez ou libérez des articles sans dépasser le stock disponible.</p>
      </header>

      <main className="page__main">
        {loading && <p className="state">Chargement des produits…</p>}

        {!loading && loadError && (
          <div className="state state--error">
            <p>{loadError}</p>
            <button type="button" className="btn btn--secondary" onClick={() => void loadProducts()}>
              Réessayer
            </button>
          </div>
        )}

        {!loading && !loadError && products.length === 0 && (
          <p className="state">Aucun produit disponible.</p>
        )}

        {!loading && !loadError && products.length > 0 && (
          <section className="product-list" aria-label="Liste des produits">
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onProductUpdated={handleProductUpdated}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
