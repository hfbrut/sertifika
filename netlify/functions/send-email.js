// Bu fonksiyon gelecek MVP'de Netlify Functions + Resend/SendGrid ile mail gönderimini handle edecek.
// MVP'de local'de test sırasında kullanılmayacak.

exports.handler = async (event, context) => {
  return {
    statusCode: 501,
    body: JSON.stringify({ message: 'Email özelliği henüz aktif değil.' })
  };
};
