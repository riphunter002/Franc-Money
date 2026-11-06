(() => {
  const raiz = document.documentElement;
  let tema = 'dark';

  try {
    if (localStorage.getItem('franc_theme') === 'light') tema = 'light';
  } catch {
    // A preferência é opcional: o tema funciona mesmo com storage bloqueado.
  }

  function atualizarControles() {
    const proximoTema = tema === 'dark' ? 'claro' : 'escuro';
    document.querySelectorAll('[data-theme-toggle]').forEach((botao) => {
      botao.setAttribute('aria-label', `Ativar tema ${proximoTema}`);
      botao.setAttribute('title', `Ativar tema ${proximoTema}`);
      const rotulo = botao.querySelector('[data-theme-label]');
      if (rotulo) rotulo.textContent = `Modo ${proximoTema}`;
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema === 'dark' ? '#0a0e17' : '#f6f5f1');
  }

  function aplicarTema() {
    raiz.dataset.theme = tema;
    raiz.style.colorScheme = tema;
    atualizarControles();
  }

  // Executado no head para aplicar a preferência antes da primeira pintura.
  aplicarTema();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', atualizarControles, { once: true });
  }

  document.addEventListener('click', (evento) => {
    const botao = evento.target.closest?.('[data-theme-toggle]');
    if (!botao) return;
    evento.preventDefault();
    tema = tema === 'dark' ? 'light' : 'dark';
    aplicarTema();
    try {
      localStorage.setItem('franc_theme', tema);
    } catch {
      // Mantém a alternância nesta página quando não é possível persistir.
    }
  });
})();
