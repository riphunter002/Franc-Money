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
  const resetLinkField = document.getElementById("resetLinkField");
  const resetLinkOutput = document.getElementById("resetLinkOutput");
  const resetLinkHint = document.getElementById("resetLinkHint");

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
    resetLinkField.hidden = true;

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
        throw new Error(data.error || "Não foi possível gerar o link de redefinição.");
      }

      setStatus("Link gerado! Copie e abra ele pra criar uma senha nova.", "is-success");

      // Versão local (sem e-mail de verdade): o backend devolve o caminho
      // relativo do link; monta a URL completa pra ficar fácil de copiar
      resetLinkOutput.value = `${window.location.origin}${data.resetUrl}`;
      resetLinkHint.textContent = `Válido por ${data.expiresInMinutes} minutos.`;
      resetLinkField.hidden = false;
      resetLinkOutput.focus();
      resetLinkOutput.select();
    } catch (err) {
      setStatus(err.message || "Não foi possível gerar o link de redefinição.", "is-error");
    } finally {
      setLoading(false);
    }
  });
})();
