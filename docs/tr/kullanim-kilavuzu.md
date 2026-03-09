# Kullanim Kilavuzu

## 1. Baslamadan Once

Bugun icin `opencode-ceo` repo duzeyinde hazir, ancak npm uzerinden genel kullanim icin henuz yayinlanmis degil.

Bu nedenle iki farkli kullanim modu var:

- bu repo uzerinden yerel gelistirme ve deneme
- ilk genel yayin sonrasi `npm install`

## 2. Yerel Kurulum

```bash
bun install
bun run ci:verify
```

GitHub teslimat akisini yerelde kullanacaksaniz:

```bash
gh auth login
```

## 3. En Kucuk Konfigurasyon

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

Bunu, CEO ajaninin tum pipeline'i otomatik yuruttugu senaryolar icin kullanin.

## 4. Kontrollu Konfigurasyon

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

Bunu, plan, review veya delivery oncesinde insan onayi istediginiz senaryolarda kullanin.

## 5. Calisma Akisi

1. `ceo` gorevi alir.
2. Pipeline `intake`, `decompose`, `implement`, `review`, `test` ve `deliver` asamalarindan gecer.
3. Gate, artifact, stage gecmisi ve kararlar `.ceo/` altindaki SQLite state icinde tutulur.
4. Repo GitHub icin hazirsa branch ve PR teslimati da otomatiklestirilebilir.

## 6. Guncelik Komutlar

```bash
bun run build
bun run typecheck
bun test
bun run pack:check
bun run ci:verify
```

## 7. Sorun Giderme

### CI'da `bun install --frozen-lockfile` hatasi

Yerelde `bun install` calistirin ve guncellenen `bun.lock` dosyasini commit edin.

### PR olusmuyor

Sunlari kontrol edin:

- `gh auth status` basarili mi
- repoda GitHub `origin` remote'u var mi
- aktif branch upstream'e push edilebiliyor mu

### Gate nedeniyle teslimat bloklaniyor

Daha az kisitlayici bir `autonomyLevel` secin veya ilgili `gates` girdisini `auto` yapin.

### Paket npm'de gorunmuyor

Bu durum ilk genel yayin yapilana kadar normaldir. O zamana kadar repo uzerinden calisin.

## 8. Ilgili Dokumanlar

- [PR Kilavuzu](./pr-kilavuzu.md)
- [Model Onerileri](./model-onerileri.md)
- [Surum ve Yayin Rehberi](./surum-yayin-rehberi.md)
- [Mimari](../ARCHITECTURE.md)
