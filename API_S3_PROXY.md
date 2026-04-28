# API S3 Proxy

## Contexte

MapX dépend de ressources style/base map servies depuis `submodules/mapx-style/` via HCP S3 :

- glyphs
- sprites
- `style.json`
- PMTiles (`layers/*.pmtiles`)
- GeoJSON annexes (`masks/*`)

Le problème historique était un header HCP obligatoire même sur les objets publics :

```txt
Authorization: AWS all_users:
```

Sans lui, HCP se comporte mal côté navigateur, en particulier sur les requêtes `Range` nécessaires à PMTiles. Cela forçait une logique HCP dans le frontend (`window.fetch` patché, `transformRequest`).

## Ce qui a été fait (V1)

### Route API

```txt
GET  /s3/*
HEAD /s3/*
```

Exemples :

```txt
/s3/style/v1/style.json
/s3/style/v1/glyphs/Noto%20Sans%20Regular/0-255.pbf
/s3/style/v1/sprites/sprite.json
/s3/layers/protomaps_basemap__v0.pmtiles
/s3/masks/un_2020_countries_mask__v0.geojson
```

### Modules

- **`api/modules/s3_proxy/index.js`** — middleware Express, validation du path, injection du header HCP
- **`api/modules/mirror/proxy.js`** — utilitaire partagé : forward des headers `Range`/conditionnels, streaming via `pipeline`, propagation des statuts upstream (`200`, `206`, `304`, `404`, `416`, etc.)
- Route câblée dans **`api/index.js`**

### Settings

Dans `api/settings/settings-global.js` :

```js
s3_proxy: {
  baseUrl: "",          // URL upstream HCP, ex. https://mapx.unepgrid.s3.unige.ch/mapx
  allowedPrefixes: [],  // ex. ["style", "layers", "masks", "maps"]
}
```

Variables d'environnement (voir `mapx.dev.EXAMPLE.env`) :

```txt
MAPX_S3_PROXY_BASE_URL=
MAPX_S3_PROXY_ALLOWED_PREFIXES=style,layers,masks,maps
```

### Côté `mapx-style`

- Patch `window.fetch` et `transformRequest` **supprimés** — le proxy gère l'auth côté serveur
- `config.js` simplifié : ne conserve que `S3_BASE` (Vite env)
- `VITE_MAPX_ASSET_BASE_URL` pointe par défaut vers `https://api.mapx.org/s3`
- `VITE_MAPX_ASSET_REQUEST_HEADERS` vide par défaut (`{}`)
- Pour dev local, créer un `.env` avec :
  ```txt
  VITE_MAPX_ASSET_BASE_URL=http://apidev.mapx.localhost:8880/s3
  ```

### Côté MapX app

- `MapxStyle` accepte désormais `{ baseUrl }` dans son constructeur
- Création déplacée du niveau module vers `Theme.init()`, après `setApiUrlAuto()`, pour que `settings.api.host_public` soit correct
- URL construite depuis `settings.api.{protocol, host_public, port_public}`

## Ce que la V1 résout

- Suppression du header HCP dans le navigateur
- URL publique stable côté MapX (`/s3/*`)
- Support correct des `Range` pour PMTiles
- Simplification de `mapx-style` (plus de patch fetch)
- Gestion correcte des annulations client mid-stream (zoom rapide MapLibre)

## Ce que la V1 ne résout pas encore

1. Pas de conversion serveur `z/x/y → PMTiles range` pour Mapterhorn.
2. Pas de route sémantique `/style/...` ou `/terrain/...`.
3. Pas d'usage du catalogue comme source de routage.
4. Pas de cache Redis — à ajouter en V1.1.

## Cache — V1.1 (à venir)

- Clé = hash de `method + path + range + etag/conditional headers`
- TTL court, taille max par entrée
- Pas de cache sur les ranges PMTiles (volumétrie trop importante)

## Évolutions possibles

### Étape 2 — routes sémantiques

```txt
/style/style.json
/style/glyphs/:fontstack/:range.pbf
/style/sprites/:file
/style/files/*
```

S'appuyer sur le catalogue [`submodules/mapx-style/data/catalog.json`](submodules/mapx-style/data/catalog.json) pour le routage.

### Étape 3 — terrain Mapterhorn

```txt
/terrain/:z/:x/:y.webp
```

Lecture PMTiles côté serveur, cache, réponse raster standard pour `maplibre-contour`.

## Notes sur `maplibre-contour`

Le DEM est consommé comme URL raster classique par `mlcontour.DemSource`. Un `addProtocol("mapterhorn", ...)` ne suffit pas pour reutiliser PMTiles dans ce flux — il faudrait une route serveur dédiée (étape 3).
