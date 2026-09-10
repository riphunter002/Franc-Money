/* ==========================================================
   Franc Money — forgot-password.js
   Tela pública (sem sessão), por isso não depende de session.js —
   mesmo padrão de auth.js/register.js.
   ========================================================== */
(function forgotPasswordForm() {
  const form = document.getElementById("forgotForm");
  if (!form) return;

  const emailInput = document.getElementById("email");
  const emailError = document.getElementById("emailError");
  const formStatus = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");

  const API_BASE_URL = window.FRANC_API_BASE_URL || "";

  function setFieldError(message) {
    if (message) {
      emailInput.classList.add("is-invalid");
      emailError.textContent = message;
    } else {
      emailInput.classList.remove("is-invalid");
      emailError.textContent = "";
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

  emailInput.addEventListener("input", () => setFieldError(""));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("", null);

    const email = emailInput.value.trim();
    if (!email) {
      setFieldError("Informe o seu e-mail.");
      emailInput.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível enviar o link de redefinição.");
      }

      // O backend responde a mesma coisa exista a conta ou não (pra não
      // revelar quais e-mails têm cadastro), então a tela mostra a mesma
      // mensagem: confira o e-mail.
      setStatus(
        data.message || "Se existir uma conta com esse e-mail, enviamos um link. Confira sua caixa de entrada.",
        "is-success"
      );
      form.reset();
    } catch (err) {
      setStatus(err.message || "Não foi possível enviar o link de redefinição.", "is-error");
    } finally {
      setLoading(false);
    }
  });
})();
