# Model Onerileri

Bu rehber, `modelPreferences` ayarlarini pipeline asamalarina gore daha mantikli secmenize yardim eder.

## Genel Kural

- planlama ve inceleme icin yuksek akil yurutme modelleri kullanin
- implement icin kod odakli modeller kullanin
- tekrarlayan dogrulama icin daha hizli ve ekonomik modeller secin

## Asamaya Gore Onerilen Profil

| Asama | Model profili | Neden |
|------|---------------|-------|
| `decompose` | yuksek akil yurutme | daha iyi mimari ve is parcala ma |
| `implement` | kodlama odakli | daha hizli kod uretimi ve refactor |
| `review` | elestirel akil yurutme | risk ve hata yakalamasi daha guclu |
| `test` | hizli dogrulama | tekrarli kontroller icin daha verimli |

## Ornek Esleme

```json
{
  "modelPreferences": {
    "decompose": "gpt-5.4",
    "implement": "gpt-5.4",
    "review": "gpt-5.4",
    "test": "gpt-5.4-mini"
  }
}
```

Bu isimleri kendi OpenCode ortaminda kullanabildiginiz model kimlikleri ile degistirin.
