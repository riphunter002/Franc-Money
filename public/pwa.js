// Registra o service worker em todas as páginas (login, cadastro e telas
// internas), pra o navegador poder oferecer "Instalar app" independente de
// por onde a pessoa entrou.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Falha ao registrar o service worker:', err);
    });
  });
}
