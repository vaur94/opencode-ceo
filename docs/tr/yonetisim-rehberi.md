# Yonetsim ve Branch Politikasi

## `main` Branch Koruma Kurallari

Repo, `main` branch'ini kontrollu tutacak sekilde ayarlandi:

- zorunlu kontroller: `quality`, `tests`, `package`
- lineer history zorunlu
- force-push kapali
- merge oncesi konusma cozum zorunlulugu var
- admin enforcement aktif

## Pratik Merge Politikasi

- `main` hedefli degisiklikler icin PR acin
- PR'lari kucuk ve okunabilir tutun
- zorunlu kontroller kirmiziyken merge etmeyin
- acik review konusmalarini merge oncesi kapatin

## Yonetsimi Destekleyen Otomasyon

- CI workflow: `.github/workflows/ci.yml`
- release workflow: `.github/workflows/release.yml`
- Dependabot: `.github/dependabot.yml`
- PR sablonu: `.github/PULL_REQUEST_TEMPLATE.md`

## Guncel Sinirlar

- ilk genel release henuz olusturulmadi
- npm yayini henuz yapilmadi

## Ilgili Dokumanlar

- [PR Kilavuzu](./pr-kilavuzu.md)
- [Surum ve Yayin Rehberi](./surum-yayin-rehberi.md)
- [Guvenlik](../../SECURITY.md)
