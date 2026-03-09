# opencode-ceo

[![CI](https://github.com/vaur94/opencode-ceo/actions/workflows/ci.yml/badge.svg)](https://github.com/vaur94/opencode-ceo/actions/workflows/ci.yml)
[![Release](https://github.com/vaur94/opencode-ceo/actions/workflows/release.yml/badge.svg)](https://github.com/vaur94/opencode-ceo/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

OpenCode'u daha kontrollu, izlenebilir ve teslimat odakli bir yazi lim sirketi isletim sistemine donusturur.

`opencode-ceo`, isleri asamali bir teslimat hattindan geciren bir OpenCode eklentisidir. CEO ajanı isi parcala, uzman ajanlara delege eder, kapilari uygular, artifact ve state bilgisini saklar, gerekirse GitHub branch ve PR akisina kadar teslimati yonetir.

## Dil

- English: `README.md`
- Turkce: `README.tr.md`

## Neden opencode-ceo?

- Duzensiz agent ciktilari yerine belirli bir pipeline kullanir.
- SQLite tabanli state ve artifact saklama ile uzun suren oturumlari destekler.
- GitHub branch ve PR akisi icin hazir araclar sunar.
- Tam otomasyon ile kontrollu onay noktalarini ayni sistemde toplar.

## Dokuman Haritasi

| Konu | English | Turkce |
|------|---------|--------|
| Dokuman merkezi | `docs/README.md` | `docs/README.md` |
| Kullanim kilavuzu | `docs/en/usage-guide.md` | `docs/tr/kullanim-kilavuzu.md` |
| PR rehberi | `docs/en/pull-request-guide.md` | `docs/tr/pr-kilavuzu.md` |
| Model onerileri | `docs/en/model-recommendations.md` | `docs/tr/model-onerileri.md` |
| Mimari | `docs/ARCHITECTURE.md` | `docs/ARCHITECTURE.md` |
| Katki rehberi | `CONTRIBUTING.md` | `CONTRIBUTING.md` |
| Guvenlik | `SECURITY.md` | `SECURITY.md` |
| Destek | `SUPPORT.md` | `SUPPORT.md` |
| Degisiklik gunlugu | `CHANGELOG.md` | `CHANGELOG.md` |

## Kurulum

```bash
npm install opencode-ceo
```

`opencode.json` icine eklenti ayarini ekleyin:

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

## Hizli Baslangic

En kucuk kurulum icin tam otonomi kullanabilirsiniz:

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

Bu kurulumdan sonra `ceo` ajanı isi sahiplenir, gizli uzman ajanlara delege eder ve pipeline son durumuna kadar ilerler.

## GitHub Teslimat Akisi

- `ceo_branch_prepare`, `ceo/<pipeline-id>/<slug>` adlandirmasi ile branch olusturur.
- `ceo_pr_prepare`, aktif branch'i `origin`e push eder ve `gh pr create` ile PR acar.
- `ceo_repo_fingerprint`, repo durumu, remote bilgisi ve git durumunu raporlar.

Yerel PR otomasyonu icin once GitHub CLI girisi yapin:

```bash
gh auth login
```

## Konfigurasyon

| Secenek | Tip | Varsayilan | Aciklama |
|---------|-----|------------|----------|
| `autonomyLevel` | `full` \| `gated` \| `manual` | `full` | Pipeline gecislerinde insan mudahalesi seviyesini belirler. |
| `gates` | `Record<string, "auto" \| "manual">` | `{}` | `approve-plan` ve `approve-delivery` gibi kapilari tanimlar. |
| `disabledAgents` | `string[]` | `[]` | Belirli uzman ajanlari devre disi birakir. |
| `modelPreferences` | `Object` | `{}` | Implement, review ve test gibi asamalarda tercih edilen modelleri belirler. |

Pratik model tavsiyeleri icin `docs/tr/model-onerileri.md` dosyasina bakin.

## Gelistirme

```bash
bun install
bun run ci:verify
```

## Sonraki Dokumanlar

- Kullanim detaylari: `docs/tr/kullanim-kilavuzu.md`
- PR akisi: `docs/tr/pr-kilavuzu.md`
- Model tavsiyeleri: `docs/tr/model-onerileri.md`
- Mimari detaylar: `docs/ARCHITECTURE.md`

## Lisans

MIT
