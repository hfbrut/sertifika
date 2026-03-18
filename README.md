# Sertifika MVP (1 Gece)

Bu sürüm, hızlı demo için hazırlanmış basit bir prototiptir.

## Neler var?

- Etkinlik bilgisi girme
- Şablon görseli link veya dosya ile alma
- CSV (`full_name,email`) yükleme
- Her katılımcı için tekil sertifika linki üretme
- Katılımcı linkten sertifikayı görüp JPG indirme

## Hızlı başlatma

1. Bu klasörde bir statik sunucu çalıştır:
   - Python: `python -m http.server 5500`
2. Tarayıcıda aç: `http://localhost:5500/index.html`
3. `sample-participants.csv` dosyasını yükle
4. Linkleri üret ve katılımcı ekranını test et

## Notlar

- Bu sürümde otomatik email gönderimi yoktur.
- Bu sürümde gerçek doğrulama/veritabanı imzası yoktur.
- Linkler kısa `id` ile üretilir, detay veri bu MVP'de tarayıcı `localStorage` içinde tutulur.
- Bu nedenle üretilen link, bu aşamada yalnızca linki üreten cihaz/tarayıcıda sorunsuz açılır.

## Sonraki adım (önerilen)

- Netlify Functions + Supabase eklenerek:
  - güvenli token imzalama
  - doğrulama endpointi
  - email gönderim kuyruğu
  - gönderim durum takibi
