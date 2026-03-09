# Kullanim Kilavuzu

## Kurulum

```bash
npm install opencode-ceo
```

## En Kucuk Konfigurasyon

```json
{
  "plugins": [
    {
      "name": "opencode-ceo",
      "config": {
        "autonomyLevel": "full"
      }
    }
  ]
}
```

## Kontrollu Konfigurasyon

```json
{
  "plugins": [
    {
      "name": "opencode-ceo",
      "config": {
        "autonomyLevel": "gated",
        "gates": {
          "approve-plan": "manual",
          "approve-review": "manual",
          "approve-delivery": "manual"
        },
        "modelPreferences": {
          "decompose": "high-reasoning-model",
          "implement": "coding-model",
          "review": "review-model",
          "test": "fast-validation-model"
        }
      }
    }
  ]
}
```

## Calisma Akisi

1. `ceo` ajani gorevi alir.
2. Pipeline intake, decompose, implement, review, test ve deliver asamalarindan gecer.
3. Artifact, gate, decision ve stage gecmisi `.ceo/` altindaki SQLite state icinde tutulur.
4. GitHub delivery araclari, repo dogru sekilde ayarlandiysa branch ve PR akisina kadar teslimat yapar.

## Onerilen Yerel Akis

```bash
bun install
bun run ci:verify
gh auth login
```

## Sorun Giderme

### CI'da `bun install --frozen-lockfile` hatasi

Yerelde `bun install` calistirin ve guncellenen `bun.lock` dosyasini commit edin.

### PR olusmuyor

Sunlari kontrol edin:

- `gh auth status` basarili mi
- repoda GitHub `origin` remote'u var mi
- aktif branch upstream'e push edilebiliyor mu

### Gate nedeniyle teslimat bloklaniyor

Daha az kisitlayici bir `autonomyLevel` secin veya ilgili `gates` girdisini `auto` yapin.
