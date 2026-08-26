# Stock Reservation

Mini-application fullstack de réservation de stock, conçue pour un test technique.

## Fonctionnalités

- Lister les produits et leur stock disponible
- Réserver une quantité (décrémente le stock)
- Libérer une quantité (incrémente le stock)
- Refuser les cas invalides : stock insuffisant, quantité incorrecte, produit inexistant
- Empêcher la double réservation du dernier article (concurrence)

## Stack technique

- **Backend** : TypeScript, Node.js, Express, Prisma, SQLite
- **Frontend** : TypeScript, React, Vite
- **Tests** : Vitest + Supertest

## Installation

### Backend

```bash
cd backend
npm install
copy .env.example .env
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

API : `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI : `http://localhost:5173` (proxy vers le backend)

## API

### `GET /products`

```json
{
  "data": [
    {
      "id": 1,
      "name": "Laptop Lenovo",
      "quantity": 5,
      "createdAt": "2026-08-26T09:00:00.000Z",
      "updatedAt": "2026-08-26T09:00:00.000Z"
    }
  ]
}
```

### `POST /products/:id/reserve`

```json
{ "quantity": 2 }
```

| Code | Cas |
|------|-----|
| `200` | réservation OK |
| `404` | produit inexistant |
| `409` | stock insuffisant / conflit |
| `422` | quantité invalide |

```json
{ "data": { "id": 1, "name": "Laptop Lenovo", "quantity": 3, "createdAt": "...", "updatedAt": "..." } }
```

```json
{ "error": "Insufficient stock" }
```

### `POST /products/:id/release`

```json
{ "quantity": 2 }
```

Réponses : `200`, `404`, `422`.

## Concurrence & double réservation

**Scénario** : stock = 1, clients A et B réservent 1 en même temps.

**Attendu** : une seule `200`, l’autre `409`, stock final = `0` (jamais négatif).

**Solution** : UPDATE conditionnel atomique (pas de read → check → write en mémoire) :

```sql
UPDATE Product
SET quantity = quantity - :qty
WHERE id = :id AND quantity >= :qty
```

Avec SQLite :

1. La garde est dans le `WHERE` SQL, pas dans une variable JS
2. Un seul writer à la fois : les UPDATE s’enchaînent
3. Le 1er passe (`1 → 0`) ; le 2e ne matche plus → **double réservation refusée** (`409`)
4. `PRAGMA busy_timeout` évite un `SQLITE_BUSY` brut au profit d’un vrai conflit métier
5. Filet : `CHECK (quantity >= 0)`

Code : `backend/src/services/productService.ts`

## Idempotence

**État actuel (test)** : `reserve` / `release` ne sont **pas** idempotents. Deux appels identiques réussis décrémentent / incrémentent deux fois.

**En production**, on viserait :

- une clé d’idempotence (`Idempotency-Key` ou `reservationId` unique)
- une table des opérations déjà traitées
- replay : même clé → même réponse, sans re-modifier le stock

Sans cela, un retry réseau peut créer une fausse double réservation même hors concurrence.

## Sécurité essentielle

Mis en place pour le scope du test :

- validation stricte des quantités et des ids (`422`)
- pas d’update aveugle : garde SQL + contrainte `CHECK`
- réponses d’erreur simples, sans fuite de stack

Hors scope (à ajouter avant une vraie mise en prod) :

- authentification / autorisation
- rate limiting
- HTTPS, CORS restreint, headers de sécurité
- audit log des réservations

## Améliorations production

- **Base** : PostgreSQL (vraies transactions / `FOR UPDATE` si besoin) plutôt que SQLite fichier
- **Métier** : réservations tracées (qui, quoi, quand, expiration / TTL)
- **Idempotence** : voir section ci-dessus
- **Observabilité** : logs structurés, métriques, alertes sur `409` massifs
- **API** : versioning, pagination, OpenAPI
- **Infra** : migrations CI, healthchecks, secrets hors repo

## Tests

```bash
cd backend
npm test
```

Inclut le scénario concurrentiel du dernier article.

## Structure

```text
STOCK RESERVATION/
├── backend/
│   ├── prisma/
│   ├── src/          # routes, controllers, services
│   └── tests/
└── frontend/
    └── src/          # api fetch, composants, page unique
```


