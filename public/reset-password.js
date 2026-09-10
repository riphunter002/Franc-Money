/* ==========================================================
   Franc Money — reset-password.js
   Tela pública (sem sessão) — mesmo padrão de auth.js/register.js.
   ========================================================== */
(function resetPasswordForm() {
  const form = document.getElementById("resetForm");
  if (!form) return;

  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const passwordError = document.getElementById("passwordError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");
  const formStatus = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");
  const toggleBtn = document.getElementById("togglePassword");

  const API_BASE_URL = window.FRANC_API_BASE_URL || "";
  const token = new URLSearchParams(window.location.search).get("token");

  toggleBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    const newType = isPassword ? "text" : "password";
    passwordInput.type = newType;
    confirmPasswordInput.type = newType;
    toggleBtn.textContent = isPassword ? "Ocultar" : "Mostrar";
    toggleBtn.setAttribute("aria-pressed", String(isPassword));
  });

  function setFieldError(input, errorEl, message) {
    if (message) {
      input.classList.add("is-invalid");
      errorEl.textContent = message;
    } else {
      input.classList.remove("is-invalid");
      errorEl.textContent = "";
    }
  }

  function setStatus(message, type) {
    formStatus.textContent = message;
    formStatus.classList.remove("is-error", "is-success");
    if (type) formStatus.classList.add(type);
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("is-loading", isLoading);
  }

  if (!token) {
    setStatus(
      "Link inválido: faltou o token. Peça um novo link em \"Esqueci minha senha\".",
      "is-error"
    );
    form.querySelectorAll("input, button[type='submit']").forEach((el) => (el.disabled = true));
  }

  passwordInput.addEventListener("input", () => setFieldError(passwordInput, passwordError, ""));
  confirmPasswordInput.addEventListener("input", () =>
    setFieldError(confirmPasswordInput, confirmPasswordError, "")
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("", null);

    let valid = true;

    if (!passwordInput.value || passwordInput.value.length < 6) {
      setFieldError(passwordInput, passwordError, "A senha deve ter ao menos 6 caracteres.");
      valid = false;
    } else {
      setFieldError(passwordInput, passwordError, "");
    }

    if (confirmPasswordInput.value !== passwordInput.value) {
      setFieldError(confirmPasswordInput, confirmPasswordError, "As senhas não coincidem.");
      valid = false;
    } else {
      setFieldError(confirmPasswordInput, confirmPasswordError, "");
    }

    if (!valid) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: passwordInput.value }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível redefinir a senha.");
      }

      setStatus("Senha redefinida! Redirecionando para o login...", "is-success");
      window.setTimeout(() => {
        window.location.href = "index.html";
      }, 1400);
    } catch (err) {
      setStatus(err.message || "Não foi possível redefinir a senha.", "is-error");
    } finally {
      setLoading(false);
    }
  });
})();
