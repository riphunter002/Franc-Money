// A conexão bancária será implementada separadamente; esta tela não consulta o Pluggy.
document.addEventListener('DOMContentLoaded', () => {
  if (!getStoredAuth()) {
    goToLogin();
    return;
  }
  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearStoredAuth();
    goToLogin();
  });
});
