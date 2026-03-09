# Surum ve Yayin Rehberi

## Guncel Yayin Durumu

- npm paketi: henuz yayinlanmadi
- GitHub release: henuz olusturulmadi
- release workflow: `.github/workflows/release.yml` icinde hazir

## Ilk Yayin Oncesi Kontrol Listesi

Sunlarin tam oldugundan emin olun:

- `bun run ci:verify` yerelde geciyor
- GitHub uzerinde `main` yesil
- `CHANGELOG.md` yayin icerigini anlatiyor
- `package.json` versiyonu dogru
- GitHub Actions secrets icinde `NPM_TOKEN` tanimli

## Yayin Akisi

1. gerekirse versiyon ve changelog guncellenir
2. release'e hazir degisiklik normal PR akisindan gecirilir
3. `v0.1.0` gibi `v*` etiketi olusturulur
4. `.github/workflows/release.yml` npm yayini yapar
5. GitHub release notlari olusturulur veya dogrulanir

## Bu Repo'da Hazir Olanlar

- release workflow baglantisi
- CI icinde paket dogrulamasi
- changelog dosyasi
- korumali `main` branch

## Hala Manuel Olanlar

- ilk genel surum kararinin verilmesi
- ilk release tag'inin olusturulmasi
- npm kimlik bilgilerinin hazir olmasi

## Ilgili Dokumanlar

- [Kullanim Kilavuzu](./kullanim-kilavuzu.md)
- [Yonetsim ve Branch Politikasi](./yonetisim-rehberi.md)
- [Degisiklik Gunlugu](../../CHANGELOG.md)
