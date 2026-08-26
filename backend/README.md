# Stock Reservation — Backend

API de réservation de stock (Express + TypeScript + Prisma + SQLite).

## Démarrage

```bash
cd backend
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

- Dev : `npm run dev`
- Build : `npm run build` puis `npm start`
- Tests : `npm test`

## API

| Méthode | Route | Body |
|---------|--------|------|
| `GET` | `/products` | — |
| `POST` | `/products/:id/reserve` | `{ "quantity": 1 }` |
| `POST` | `/products/:id/release` | `{ "quantity": 1 }` |

Codes : `200` succès · `404` produit inexistant · `409` stock insuffisant · `422` quantité invalide · `500` erreur serveur.

## Stratégie de concurrence (cas senior)

### Le piège à éviter

```text
1. Lire product.quantity   → les deux clients voient 1
2. Vérifier en mémoire     → les deux croient pouvoir réserver
3. Écrire quantity = 0     → les deux écrivent
→ race condition / stock incohérent
```

SQLite n'a pas de `SELECT FOR UPDATE` classique comme PostgreSQL. Un « verrou applicatif » en Node (mutex en mémoire) ne protège pas non plus si plusieurs process existent, et ne remplace pas une garde SQL.

### La stratégie retenue : UPDATE conditionnel atomique

```sql
UPDATE Product
SET quantity = quantity - :qty
WHERE id = :id AND quantity >= :qty
```

Côté Prisma (`productService.reserveProduct`) :

1. Transaction `$transaction`
2. `updateMany` avec `quantity: { gte: qty }` + `decrement`
3. Si `count === 0` → produit absent (`404`) ou stock insuffisant (`409`)
4. Sinon lecture du produit mis à jour (`200`)

### Pourquoi une seule réservation passe quand stock = 1

1. **La garde est dans le SQL**, pas dans une variable JS lue plus tôt.
2. **SQLite sérialise les writers** (un seul writer à la fois sur le fichier DB).
3. La requête A obtient le verrou d'écriture, exécute l'UPDATE (`1 → 0`), commit.
4. La requête B attend (grâce à `PRAGMA busy_timeout`), exécute le même UPDATE : `WHERE quantity >= 1` ne matche plus → **0 ligne** → **HTTP 409**.
5. Filet de sécurité DB : `CHECK (quantity >= 0)` — le stock ne peut pas devenir négatif.

### Particularité SQLite prise en compte

Sans `PRAGMA busy_timeout`, le second writer peut recevoir `SQLITE_BUSY` tout de suite (erreur 500) au lieu d'attendre. On configure `busy_timeout = 5000` au démarrage (`src/lib/prisma.ts`) pour que le second UPDATE s'exécute **après** le premier et produise correctement un `409`.

### Preuve automatisée

```bash
npm test
```

Le test `tests/concurrency.test.ts` lance deux `POST /reserve` en parallèle sur un produit à stock `1` et vérifie : statuses `[200, 409]`, stock final `0`.
