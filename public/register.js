/* ==========================================================
   Franc Money — register.js
   1) Fogos de artifício (fundo decorativo, boas-vindas)
   2) Lógica do formulário de cadastro (com login automático)
   ========================================================== */

/* ==========================================================
   Fogos de artifício
   Mesma ideia da chuva de moedas do login (auth.js): um loop
   cria elementos no DOM em intervalos, o CSS anima e remove
   eles sozinho. Aqui são dois "estágios": o foguete sobe
   (.firework-rocket) e, quando termina, vira uma explosão de
   fagulhas (.firework-burst > .firework-spark).
   ========================================================== */
(function fireworks() {
  const field = document.getElementById("fireworksField");
  if (!field) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) return;

  // Paleta combinando com a identidade visual (dourado) + um toque de
  // verde (sucesso) e branco (brilho), sem cair num arco-íris genérico
  const SPARK_COLORS = ["#f4d160", "#d4af37", "#3ddc97", "#ffffff"];
  const MAX_ROCKETS = 5; // limite para manter a performance estável

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnBurst(xPx, yPx) {
    const burst = document.createElement("div");
    burst.className = "firework-burst";
    burst.style.left = xPx + "px";
    burst.style.top = yPx + "px";

    const flash = document.createElement("div");
    flash.className = "firework-flash";
    burst.appendChild(flash);

    const sparkCount = Math.round(randomBetween(14, 22));
    for (let i = 0; i < sparkCount; i++) {
      const spark = document.createElement("span");
      spark.className = "firework-spark";

      // Ângulo quase igualmente distribuído ao redor do círculo, com um
      // pequeno desvio aleatório para não parecer perfeitamente geométrico
      const angle = (i / sparkCount) * Math.PI * 2 + randomBetween(-0.15, 0.15);
      const distance = randomBetween(40, 110);
      const gravity = randomBetween(15, 40); // puxão sutil pra baixo, como fogos de verdade

      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance + gravity;

      spark.style.setProperty("--spark-dx", dx.toFixed(1) + "px");
      spark.style.setProperty("--spark-dy", dy.toFixed(1) + "px");
      spark.style.setProperty("--spark-size", randomBetween(3, 6).toFixed(1) + "px");
      spark.style.setProperty(
        "--spark-color",
        SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)]
      );

      burst.appendChild(spark);
    }

    field.appendChild(burst);
    window.setTimeout(() => burst.remove(), 950);
  }

  function spawnRocket() {
    if (field.querySelectorAll(".firework-rocket").length >= MAX_ROCKETS) return;

    const rocket = document.createElement("span");
    rocket.className = "firework-rocket";

    const leftVw = randomBetween(8, 92);
    const riseHeightVh = randomBetween(45, 82);
    const riseDriftPx = randomBetween(-60, 60);
    const riseDurationS = randomBetween(0.8, 1.3);

    rocket.style.left = leftVw + "vw";
    rocket.style.setProperty("--rise-height", riseHeightVh + "vh");
    rocket.style.setProperty("--rise-drift", riseDriftPx + "px");
    rocket.style.animationDuration = riseDurationS + "s";

    rocket.addEventListener(
      "animationend",
      () => {
        // Posição final do foguete em pixels, pra nascer a explosão exatamente ali
        const xPx = (leftVw / 100) * window.innerWidth + riseDriftPx;
        const yPx = window.innerHeight - (riseHeightVh / 100) * window.innerHeight;
        spawnBurst(xPx, yPx);
        rocket.remove();
      },
      { once: true }
    );

    field.appendChild(rocket);
  }

  function loop() {
    spawnRocket();
    window.setTimeout(loop, randomBetween(700, 1400));
  }

  loop();

  // Rajada mais intensa para o momento de sucesso do cadastro: dispara
  // vários foguetes de uma vez, ignorando o limite normal de MAX_ROCKETS
  window.__francCelebrate = function celebrate() {
    for (let i = 0; i < 6; i++) {
      window.setTimeout(spawnRocket, i * 120);
    }
  };
})();

/* ==========================================================
   Formulário de cadastro
   ========================================================== */
(function registerForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");

  const formStatus = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");
  const toggleBtn = document.getElementById("togglePassword");

  // Mostrar/ocultar as duas senhas juntas
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
      input.setAttribute("aria-invalid", "true");
      errorEl.textContent = message;
    } else {
      input.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
      errorEl.textContent = "";
    }
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate() {
    let valid = true;

    if (!nameInput.value.trim()) {
      setFieldError(nameInput, nameError, "Informe o seu nome.");
      valid = false;
    } else {
      setFieldError(nameInput, nameError, "");
    }

    if (!emailInput.value.trim()) {
      setFieldError(emailInput, emailError, "Informe o seu e-mail.");
      valid = false;
    } else if (!isValidEmail(emailInput.value.trim())) {
      setFieldError(emailInput, emailError, "Informe um e-mail válido.");
      valid = false;
    } else {
      setFieldError(emailInput, emailError, "");
    }

    if (!passwordInput.value) {
      setFieldError(passwordInput, passwordError, "Crie uma senha.");
      valid = false;
    } else if (passwordInput.value.length < 6) {
      setFieldError(passwordInput, passwordError, "A senha deve ter ao menos 6 caracteres.");
      valid = false;
    } else {
      setFieldError(passwordInput, passwordError, "");
    }

    if (!confirmPasswordInput.value) {
      setFieldError(confirmPasswordInput, confirmPasswordError, "Repita a senha.");
      valid = false;
    } else if (confirmPasswordInput.value !== passwordInput.value) {
      setFieldError(confirmPasswordInput, confirmPasswordError, "As senhas não coincidem.");
      valid = false;
    } else {
      setFieldError(confirmPasswordInput, confirmPasswordError, "");
    }

    return valid;
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("is-loading", isLoading);
  }

  function setStatus(message, type) {
    formStatus.textContent = message;
    formStatus.classList.remove("is-error", "is-success");
    if (type) formStatus.classList.add(type);
  }

  nameInput.addEventListener("input", () => setFieldError(nameInput, nameError, ""));
  emailInput.addEventListener("input", () => setFieldError(emailInput, emailError, ""));
  passwordInput.addEventListener("input", () => setFieldError(passwordInput, passwordError, ""));
  confirmPasswordInput.addEventListener("input", () =>
    setFieldError(confirmPasswordInput, confirmPasswordError, "")
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("", null);

    if (!validate()) {
      setStatus("Verifique os campos destacados.", "is-error");
      return;
    }

    setLoading(true);

    // Front e backend são servidos pela mesma origem, então um caminho
    // relativo já resolve certo em dev e produção.
    const API_BASE_URL = window.FRANC_API_BASE_URL || "";
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      const createResponse = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const createData = await createResponse.json().catch(() => ({}));

      if (!createResponse.ok) {
        // Ex.: e-mail já cadastrado (o errorHandler devolve isso em "error")
        throw new Error(createData.error || "Não foi possível criar a conta.");
      }

      setStatus(`Conta criada, ${name}! Entrando...`, "is-success");
      if (window.__francCelebrate) window.__francCelebrate();

      // Login automático: reaproveita a senha que a pessoa acabou de digitar
      // pra já entrar direto, sem pedir de novo.
      try {
        const loginResponse = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginResponse.json().catch(() => ({}));
        if (!loginResponse.ok) throw new Error("login automático falhou");

        const { user, token } = loginData;
        window.localStorage.setItem("franc_token", token);
        window.localStorage.setItem("franc_user", JSON.stringify(user));

        window.setTimeout(() => {
          window.location.href = "/dashboard.html";
        }, 900);
      } catch (loginErr) {
        // Conta foi criada com sucesso; só o login automático que falhou
        // (ex.: rate limit de /login). Manda pra tela de login normal.
        setStatus(`Conta criada, ${name}! Faça login para continuar.`, "is-success");
        window.setTimeout(() => {
          window.location.href = "/index.html";
        }, 1400);
      }
    } catch (err) {
      setStatus(err.message || "Não foi possível criar a conta. Tente novamente.", "is-error");
    } finally {
      setLoading(false);
    }
  });
})();
