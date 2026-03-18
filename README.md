# Sertifika MVP (1 Gece)

Bu sürüm, hızlı demo için hazırlanmış basit bir prototiptir.

## Neler var?

- Etkinlik bilgisi girme (0 adım: kullanım tipi seçimi)
- Şablon görseli dosya ile alma
- Metin konumlandırma (X, Y, font boyutu, hizalama)
- Canlı önizleme
- CSV (`full_name,email`) yükleme
- Her katılımcı için tekil sertifika linki üretme
- Katılımcı linkten sertifikayı görüp JPG indirme
- Güncellenmiş CSV (tracking sütunları ile) indirme

## Hızlı başlatma (Yerelde)

1. Bu klasörde bir statik sunucu çalıştır:
   - Node.js: `npm install http-server -g && http-server -p 5501`
   - VS Code: Extension > "Live Server" > sağ tıkla > "Open with Live Server"

2. Tarayıcıda aç: `http://localhost:5501/index.html`

3. [sample-participants.csv](sample-participants.csv) dosyasını yükle

4. Linkleri üret ve katılımcı ekranını test et

## Netlify'ye Deploy (GitHub ile Auto-Deploy)

### 1. GitHub Repo Oluştur

```bash
# GitHub'da yeni bir repo oluştur: https://github.com/new
# Sonra terminalde:

git remote add origin https://github.com/KULLANICI_ADI/sertifika.git
git branch -M main
git push -u origin main
```

### 2. Netlify'ye Bağlan

1. [Netlify](https://netlify.com) sitesine git ve oturum aç (GitHub ile signup)
2. "New site from Git" → GitHub seç → "sertifika" repo'sunu seç
3. Build komutu: **bos bırak** (static site, build gerek yok)
4. Publish directory: `.` (kök dizin)
5. Deploy et

Her GitHub push'dan sonra Netlify otomatik deploy edecek.

## Notlar

- Bu sürümde otomatik email gönderimi yoktur (Netlify Functions API entegrasyonu yapılmış ama henüz aktif değil).
- Linkler kısa `id` ile üretilir; detay veri tarayıcı `localStorage` içinde tutulur.
- Bu nedenle link, ilk adımda linki üreten cihaz/tarayıcıda sorunsuz açılır.
- Gelecek sürümde: Supabase + email gönderim + doğrulama ekranı.

## Gelecek (Next Steps)

- Email API entegrasyonu (Resend/SendGrid)
- Doğrulama endpoint (QR kod + katılımcı adı)
- Hazır şablon kütüphanesi
- Sürükle-bırak konumlandırma opsiyonu
- Sosyal ağlara otomatik paylaşım

