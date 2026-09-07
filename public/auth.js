/* ==========================================================
   Franc Money — auth.js
   1) Chuva de moedas 3D (fundo decorativo)
   2) Lógica do formulário de login
   ========================================================== */

(function coinRain() {
  const field = document.getElementById("coinField");
  if (!field) return;

  // Respeita usuários que pediram menos animação no sistema operacional
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) return;

  const MAX_COINS = 42; // limite para manter a performance estável
  const SPAWN_INTERVAL_MS = 260;

  function spawnCoin() {
    if (field.childElementCount >= MAX_COINS) return;

    const coin = document.createElement("span");
    coin.className = "coin";
    coin.textContent = "$";
    coin.setAttribute("aria-hidden", "true");

    // Variações aleatórias: posição, tamanho, velocidade e atraso
    const size = 18 + Math.random() * 22; // 18px a 40px
    const left = Math.random() * 100; // % da largura da tela
    const fallDuration = 6 + Math.random() * 7; // 6s a 13s
    const spinDuration = 1.2 + Math.random() * 2; // 1.2s a 3.2s
    const spinDelay = Math.random() * 2;
    const drift = (Math.random() - 0.5) * 120; // leve deriva horizontal em px
    const opacity = 0.55 + Math.random() * 0.45;

    coin.style.left = left + "vw";
    coin.style.width = size + "px";
    coin.style.height = size + "px";
    coin.style.fontSize = size * 0.5 + "px";
    coin.style.opacity = opacity.toFixed(2);
    coin.style.setProperty("--drift", drift + "px");
    coin.style.animationDuration = `${fallDuration}s, ${spinDuration}s`;
    coin.style.animationDelay = `0s, ${spinDelay}s`;

    // Pequena deriva horizontal usando transform combinado ao keyframe de queda
    coin.style.transform = `translateX(var(--drift, 0px))`;

    field.appendChild(coin);

    // Remove a moeda do DOM assim que ela termina de cair, evitando acúmulo
    window.setTimeout(() => {
      coin.remove();
    }, fallDuration * 1000 + 200);
  }

  // Gera moedas continuamente em intervalos levemente aleatórios
  function loop() {
    spawnCoin();
    const nextDelay = SPAWN_INTERVAL_MS + Math.random() * 260;
    window.setTimeout(loop, nextDelay);
  }

  loop();
})();

/* ==========================================================
   Gráfico de evolução de lucros (fundo animado)
   ========================================================== */
(function profitChart() {
  const lineEl = document.getElementById("chartLine");
  const areaEl = document.getElementById("chartArea");
  const dotEl = document.getElementById("chartDot");
  if (!lineEl || !areaEl || !dotEl) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const VIEW_WIDTH = 1440;
  const VIEW_HEIGHT = 500;
  const BASELINE_Y = VIEW_HEIGHT; // base do preenchimento (parte de baixo do SVG)
  const NUM_POINTS = 26;

  // Curva-base: começa mais embaixo (valores menores) e sobe para a direita,
  // simulando uma evolução de lucro no tempo.
  const basePoints = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const progress = i / (NUM_POINTS - 1);
    const x = progress * VIEW_WIDTH;
    // Sobe de ~430 (quase no fundo) até ~120 (perto do topo), com leve curvatura
    const y = 430 - Math.pow(progress, 1.15) * 300;
    basePoints.push({ x, y });
  }

  function buildPathData(time) {
    const coords = basePoints.map((p, i) => {
      // Duas ondas de frequências diferentes somadas = oscilação mais orgânica,
      // sem sair de uma faixa previsível ao redor da curva de tendência.
      const wave1 = Math.sin(time * 0.55 + i * 0.55) * 14;
      const wave2 = Math.sin(time * 0.21 + i * 1.1) * 8;
      const y = p.y + wave1 + wave2;
      return { x: p.x, y };
    });

    const linePath = coords
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
      .join(" ");

    const areaPath =
      linePath +
      ` L ${VIEW_WIDTH},${BASELINE_Y} L 0,${BASELINE_Y} Z`;

    return { linePath, areaPath, lastPoint: coords[coords.length - 1] };
  }

  function render(time) {
    const { linePath, areaPath, lastPoint } = buildPathData(time);
    lineEl.setAttribute("d", linePath);
    areaEl.setAttribute("d", areaPath);
    dotEl.setAttribute("cx", lastPoint.x.toFixed(1));
    dotEl.setAttribute("cy", lastPoint.y.toFixed(1));
  }

  // Usuários que pedem menos animação ainda veem o gráfico, só que parado
  if (prefersReducedMotion) {
    render(0);
    return;
  }

  let start = null;
  function frame(timestamp) {
    if (start === null) start = timestamp;
    const elapsedSeconds = (timestamp - start) / 1000;
    render(elapsedSeconds);
    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
})();

/* ==========================================================
   Formulário de login
   ========================================================== */
(function loginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const formStatus = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");
  const toggleBtn = document.getElementById("togglePassword");

  // Mostrar/ocultar senha
  toggleBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
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
    // Validação simples o suficiente para feedback em tempo real no cliente
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate() {
    let valid = true;

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
      setFieldError(passwordInput, passwordError, "Informe a sua senha.");
      valid = false;
    } else if (passwordInput.value.length < 6) {
      setFieldError(passwordInput, passwordError, "A senha deve ter ao menos 6 caracteres.");
      valid = false;
    } else {
      setFieldError(passwordInput, passwordError, "");
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

  // Limpa o erro do campo assim que o usuário começa a corrigi-lo
  emailInput.addEventListener("input", () => setFieldError(emailInput, emailError, ""));
  passwordInput.addEventListener("input", () => setFieldError(passwordInput, passwordError, ""));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("", null);

    if (!validate()) {
      setStatus("Verifique os campos destacados.", "is-error");
      return;
    }

    setLoading(true);

    try {
      // Front e backend são servidos pela mesma origem (Express serve /public),
      // então um caminho relativo já resolve certo em dev e produção.
      const API_BASE_URL = window.FRANC_API_BASE_URL || "";

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value,
        }),
      });

      // O backend usa express-rate-limit: após 5 tentativas em 15 minutos,
      // a API responde 429 com uma mensagem própria em "error".
      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error ||
            "Muitas tentativas de login. Aguarde alguns minutos e tente novamente."
        );
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // O UserController responde 401 com { error: "E-mail ou senha inválidos." }
        throw new Error(data.error || "E-mail ou senha inválidos.");
      }

      // Sucesso: a API retorna { user: { id, name, email }, token }
      const { user, token } = data;
      const remember = document.getElementById("remember").checked;

      // sessionStorage dura só a aba/sessão; localStorage persiste entre sessões.
      // Isso respeita a escolha do usuário no checkbox "Manter conectado".
      const storage = remember ? window.localStorage : window.sessionStorage;
      storage.setItem("franc_token", token);
      storage.setItem("franc_user", JSON.stringify(user));

      setStatus(`Bem-vindo(a), ${user.name}. Redirecionando...`, "is-success");

      window.setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 600);
    } catch (err) {
      setStatus(err.message || "Não foi possível entrar. Tente novamente.", "is-error");
    } finally {
      setLoading(false);
    }
  });
})();