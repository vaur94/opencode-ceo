# PR Kilavuzu

## PR Acmadan Once

```bash
bun run ci:verify
```

## Beklenen PR Yapisi

- tek bir odakli degisiklik
- neyin neden degistigini acik bir sekilde anlatan ozet
- davranis degistiyse test guncellemesi
- alakasiz format veya bagimlilik gurultusu olmamasi

## Zorunlu Icerik

`.github/PULL_REQUEST_TEMPLATE.md` sablonunu kullanin ve su bilgileri ekleyin:

- degisikligin ozeti
- etkilenen alanlar
- calistirilan dogrulama adimlari
- gerekiyorsa uyumluluk veya migration notlari

## Inceleme Kurallari

- `main` branch'i icin pull request zorunludur
- zorunlu CI kontrolleri gecmeden merge yapilamaz
- tum konusmalar cozulmeden merge yapilamaz
- `main` branch'inde lineer history korunur ve force-push engellenir

## Merge Rehberi

- history okunabilir ve odakli kalsin
- tek buyuk PR yerine kucuk ve bagimsiz PR'lari tercih edin
- acil durum disinda branch protection'i baypas etmeyin

## Ilgili Dokumanlar

- [Yonetsim ve Branch Politikasi](./yonetisim-rehberi.md)
- [Kullanim Kilavuzu](./kullanim-kilavuzu.md)
- [Katki Rehberi](../../CONTRIBUTING.md)
