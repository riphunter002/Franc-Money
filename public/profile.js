/* ==========================================================
   Franc Money — profile.js
   Depende de session.js já ter sido carregado antes deste
   arquivo (getStoredAuth, fetchWithAuth, extractErrorMessage,
   updateStoredUser etc.)
   ========================================================== */

function initProfilePage() {
  const auth = getStoredAuth();
  if (!auth) {
    goToLogin();
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearStoredAuth();
      goToLogin();
    });
  }

  /* ----------------------------------------------------------
     Dados da conta (nome/e-mail)
     ---------------------------------------------------------- */
  const profileForm = document.getElementById("profileForm");
  const nameInput = document.getElementById("profileName");
  const emailInput = document.getElementById("profileEmail");
  const profileSubmitBtn = document.getElementById("profileSubmitBtn");
  const profileFormError = document.getElementById("profileFormError");
  const profileFormStatus = document.getElementById("profileFormStatus");

  nameInput.value = auth.user.name || "";
  emailInput.value = auth.user.email || "";

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    profileFormError.textContent = "";
    profileFormStatus.textContent = "";

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name) {
      profileFormError.textContent = "Informe o seu nome.";
      nameInput.focus();
      return;
    }

    if (!email) {
      profileFormError.textContent = "Informe o seu e-mail.";
      emailInput.focus();
      return;
    }

    profileSubmitBtn.disabled = true;
    profileSubmitBtn.textContent = "Salvando...";

    try {
      const response = await fetchWithAuth(`/users/${auth.user.id}`, auth.token, {
        method: "PUT",
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, "Não foi possível salvar as alterações."));
      }

      // Mantém a sessão em dia com o nome/e-mail novos (ex.: o "Olá, Nome"
      // do dashboard usa o que está salvo aqui, não busca de novo na API)
      updateStoredUser(data);
      auth.user = data;

      profileFormStatus.textContent = "Dados atualizados com sucesso.";
    } catch (err) {
      profileFormError.textContent = err.message || "Não foi possível salvar as alterações.";
    } finally {
      profileSubmitBtn.disabled = false;
      profileSubmitBtn.textContent = "Salvar alterações";
    }
  });

  /* ----------------------------------------------------------
     Trocar senha
     ---------------------------------------------------------- */
  const passwordForm = document.getElementById("passwordForm");
  const currentPasswordInput = document.getElementById("currentPassword");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmNewPasswordInput = document.getElementById("confirmNewPassword");
  const passwordSubmitBtn = document.getElementById("passwordSubmitBtn");
  const passwordFormError = document.getElementById("passwordFormError");
  const passwordFormStatus = document.getElementById("passwordFormStatus");

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    passwordFormError.textContent = "";
    passwordFormStatus.textContent = "";

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    if (!currentPassword) {
      passwordFormError.textContent = "Informe a senha atual.";
      currentPasswordInput.focus();
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      passwordFormError.textContent = "A nova senha deve ter ao menos 6 caracteres.";
      newPasswordInput.focus();
      return;
    }

    if (newPassword !== confirmNewPassword) {
      passwordFormError.textContent = "As senhas não coincidem.";
      confirmNewPasswordInput.focus();
      return;
    }

    passwordSubmitBtn.disabled = true;
    passwordSubmitBtn.textContent = "Alterando...";

    try {
      const response = await fetchWithAuth("/users/password", auth.token, {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, "Não foi possível alterar a senha."));
      }

      passwordFormStatus.textContent = "Senha alterada com sucesso.";
      passwordForm.reset();
    } catch (err) {
      passwordFormError.textContent = err.message || "Não foi possível alterar a senha.";
    } finally {
      passwordSubmitBtn.disabled = false;
      passwordSubmitBtn.textContent = "Alterar senha";
    }
  });
}

document.addEventListener("DOMContentLoaded", initProfilePage);
