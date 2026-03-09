# opencode-ceo

[![CI](https://github.com/vaur94/opencode-ceo/actions/workflows/ci.yml/badge.svg)](https://github.com/vaur94/opencode-ceo/actions/workflows/ci.yml)
[![Release](https://github.com/vaur94/opencode-ceo/actions/workflows/release.yml/badge.svg)](https://github.com/vaur94/opencode-ceo/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

OpenCode icin daha kontrollu, izlenebilir ve teslimat odakli bir yazilim operasyon sistemi kurar.

## 🚀 Bu Proje Ne Yapiyor?

`opencode-ceo`, yazilim gorevlerini belirli asamalardan geciren bir OpenCode eklentisidir. CEO ajanı isi sahiplenir, uzman ajanlara delege eder, kapilari uygular, artifact ve state bilgisini saklar, uygun oldugunda GitHub branch ve PR teslimatini da hazirlar.

## 🌍 Dil Secenekleri

- [English README](./README.md)
- [Turkce README](./README.tr.md)

## ⚡ Guncel Durum

- `main` branch CI korumasi aktif
- release workflow hazir: `.github/workflows/release.yml`
- Dependabot aktif: `.github/dependabot.yml`
- npm paketi henuz yayinlanmadi
- GitHub release henuz olusturulmadi

Release durumunu ve yayin adimlarini gormek icin [Surum ve Yayin Rehberi](./docs/tr/surum-yayin-rehberi.md) ile baslayin.

## ✨ Neden opencode-ceo?

- tek seferlik agent cevabi yerine kontrollu bir pipeline kullanir
- uzun sureli islerde SQLite tabanli state ve artifact takibi saglar
- GitHub branch ve PR teslimati icin hazir araclar sunar
- tam otomasyon ile manuel onay noktalarini ayni sistemde toplar

## 🧭 Dokuman Merkezi

Tum dokuman yapisi icin:

- [Dokuman Merkezi](./docs/README.md)

### Icindekiler

- [Bu Proje Ne Yapiyor?](#-bu-proje-ne-yapiyor)
- [Guncel Durum](#-guncel-durum)
- [Dokuman Merkezi](#-dokuman-merkezi)
- [Kurulum Durumu](#-kurulum-durumu)
- [Konfigurasyon Ornegi](#️-konfigurasyon-ornegi)
- [Pipeline Ozeti](#️-pipeline-ozeti)
- [GitHub Teslimat Akisi](#-github-teslimat-akisi)
- [Yerel Dogrulama](#-yerel-dogrulama)
- [Repo Kontrolleri](#️-repo-kontrolleri)

Temel rehberler:

- [Kullanim Kilavuzu](./docs/tr/kullanim-kilavuzu.md)
- [PR Kilavuzu](./docs/tr/pr-kilavuzu.md)
- [Model Onerileri](./docs/tr/model-onerileri.md)
- [Surum ve Yayin Rehberi](./docs/tr/surum-yayin-rehberi.md)
- [Yonetsim ve Branch Politikasi](./docs/tr/yonetisim-rehberi.md)
- [Mimari](./docs/ARCHITECTURE.md)

Repo politikalari:

- [Katki Rehberi](./CONTRIBUTING.md)
- [Guvenlik](./SECURITY.md)
- [Destek](./SUPPORT.md)
- [Davranis Kurallari](./CODE_OF_CONDUCT.md)
- [Degisiklik Gunlugu](./CHANGELOG.md)
- [Lisans](./LICENSE)

## 📦 Kurulum Durumu

Paket adi `opencode-ceo`, ancak ilk genel npm yayini henuz yapilmadi.

Bugun icin gercek kullanim secenekleri:

- bu repo uzerinden yerel gelistirme
- ilk yayin sonrasi `npm install`

Ilk yayin sonrasi planlanan komut:

```bash
npm install opencode-ceo
```

## ⚙️ Konfigurasyon Ornegi

```json
{
  "plugins": [
    {
      "name": "opencode-ceo",
      "config": {
        "autonomyLevel": "gated",
        "gates": {
          "approve-plan": "manual",
          "approve-review": "auto",
          "approve-delivery": "manual"
        }
      }
    }
  ]
}
```

En kucuk tam otonomi kurulumu:

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

## 🏗️ Pipeline Ozeti

```text
[intake] -> [decompose] -> [implement] -> [review] -> [test] -> [deliver] -> [completed]
                 \-> [blocked]                                 \-> [failed]
```

Asama ozeti:

- `intake`: gorev alinır ve proje stack'i tespit edilir
- `decompose`: uygulanabilir plan olusturulur
- `implement`: degisiklik uretimi yapilir
- `review`: kalite ve risk kontrolu yapilir
- `test`: davranis ve regresyon kontrolleri calistirilir
- `deliver`: branch ve PR ciktilari hazirlanir

Daha fazla ayrinti icin [Mimari](./docs/ARCHITECTURE.md) dosyasina bakin.

## 🧠 Model Tercihleri

`modelPreferences` ayarlarini asama bazinda optimize edebilirsiniz:

- [Model Onerileri](./docs/tr/model-onerileri.md)

## 🔀 GitHub Teslimat Akisi

- `ceo_branch_prepare`, `ceo/<pipeline-id>/<slug>` branch'i olusturur
- `ceo_pr_prepare`, aktif branch'i `origin`e push eder ve `gh pr create` ile PR acar
- `ceo_repo_fingerprint`, remote, git durumu ve repo hazirlik bilgisini raporlar

Yerel PR otomasyonu icin once:

```bash
gh auth login
```

## 🧪 Yerel Dogrulama

```bash
bun install
bun run ci:verify
```

Tekil komutlar:

- `bun run build`
- `bun run typecheck`
- `bun test`
- `bun run pack:check`

## 🛡️ Repo Kontrolleri

- korumali `main` branch
- zorunlu `quality`, `tests`, `package` kontrolleri
- lineer history zorunlulugu
- `main` icin force-push kapali
- merge oncesi konusma cozum zorunlulugu
- npm ve GitHub Actions icin Dependabot aktif
- CI, geriye donuk uyumluluk icin hem `main` hem `master` olaylarini dinler; aktif politika hedefi `main` branch'idir

Ayrintilar: [Yonetsim ve Branch Politikasi](./docs/tr/yonetisim-rehberi.md)

## 📚 Sonraki Adimlar

- kullanim: [Kullanim Kilavuzu](./docs/tr/kullanim-kilavuzu.md)
- katkı ve PR akisi: [PR Kilavuzu](./docs/tr/pr-kilavuzu.md)
- yayin akisi: [Surum ve Yayin Rehberi](./docs/tr/surum-yayin-rehberi.md)
- repo kurallari: [Yonetsim ve Branch Politikasi](./docs/tr/yonetisim-rehberi.md)

## 📄 Lisans

MIT
