/* ==========================================================
   Franc Money — investments.js
   Simulador de juros compostos: só matemática no navegador,
   sem chamada nenhuma ao backend.
   Depende de session.js já ter sido carregado antes deste
   arquivo (getStoredAuth, currencyFormatter etc.)
   ========================================================== */

const initialInput = document.getElementById("invInitial");
const monthlyInput = document.getElementById("invMonthly");
const rateInput = document.getElementById("invRate");
const yearsInput = document.getElementById("invYears");
const rateHint = document.getElementById("invRateHint");

const finalValueEl = document.getElementById("invFinalValue");
const finalHintEl = document.getElementById("invFinalHint");
const totalInvestedEl = document.getElementById("invTotalInvested");
const totalInterestEl = document.getElementById("invTotalInterest");

/* ----------------------------------------------------------
   Monta, mês a mês, o valor total investido (linear: só soma
   os aportes) e o valor total com juros (juros compostos).
   Retorna um ponto por mês, do mês 0 até o fim do período.
   ---------------------------------------------------------- */
function buildProjection(initial, monthly, monthlyRate, months) {
  const investedSeries = [];
  const valueSeries = [];

  for (let m = 0; m <= months; m++) {
    investedSeries.push(initial + monthly * m);

    // Juros compostos com aporte mensal:
    // FV = P(1+i)^n + PMT * [((1+i)^n - 1) / i]
    let value;
    if (monthlyRate === 0) {
      value = initial + monthly * m;
    } else {
      const growth = Math.pow(1 + monthlyRate, m);
      value = initial * growth + monthly * ((growth - 1) / monthlyRate);
    }
    valueSeries.push(value);
  }

  return { investedSeries, valueSeries };
}

/* ----------------------------------------------------------
   Reduz a série mensal a no máximo ~24 pontos, pra manter o
   gráfico legível mesmo com períodos longos (ex.: 30 anos)
   ---------------------------------------------------------- */
function sampleSeries(series, maxPoints = 24) {
  const step = Math.max(1, Math.ceil((series.length - 1) / maxPoints));
  const sampled = [];
  for (let i = 0; i < series.length; i += step) {
    sampled.push(series[i]);
  }
  // Garante que o último ponto (fim do período) sempre apareça
  if (sampled[sampled.length - 1] !== series[series.length - 1]) {
    sampled.push(series[series.length - 1]);
  }
  return sampled;
}

/* ----------------------------------------------------------
   Desenha o gráfico SVG: linha cheia (valor total) + linha
   tracejada (total investido), na mesma escala/eixo
   ---------------------------------------------------------- */
function renderChart(investedPoints, valuePoints, months) {
  const areaEl = document.getElementById("invArea");
  const valueLineEl = document.getElementById("invValueLine");
  const investedLineEl = document.getElementById("invInvestedLine");
  const labelsEl = document.getElementById("invChartLabels");

  const VIEW_WIDTH = 600;
  const VIEW_HEIGHT = 220;
  const PADDING_TOP = 16;
  const PADDING_BOTTOM = 16;

  // As duas séries dividem a mesma escala (mesmo min/max), senão a
  // comparação visual entre elas ficaria enganosa
  const allValues = [...investedPoints, ...valuePoints];
  const max = Math.max(...allValues);
  const min = 0; // sempre começa do zero, pra área do gráfico fazer sentido
  const range = max - min || 1;

  function toPath(points) {
    return points
      .map((value, i) => {
        const x = (i / (points.length - 1)) * VIEW_WIDTH;
        const normalized = (value - min) / range;
        const y =
          VIEW_HEIGHT -
          PADDING_BOTTOM -
          normalized * (VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  const valuePath = toPath(valuePoints);
  const investedPath = toPath(investedPoints);

  valueLineEl.setAttribute("d", valuePath);
  investedLineEl.setAttribute("d", investedPath);
  areaEl.setAttribute("d", `${valuePath} L ${VIEW_WIDTH},${VIEW_HEIGHT} L 0,${VIEW_HEIGHT} Z`);

  // Rótulos do eixo X em anos, espalhados pelos pontos amostrados
  const yearsTotal = months / 12;
  const labelCount = Math.min(6, Math.ceil(yearsTotal) + 1);
  const labels = [];
  for (let i = 0; i < labelCount; i++) {
    const year = Math.round((i / (labelCount - 1)) * yearsTotal);
    labels.push(`Ano ${year}`);
  }
  labelsEl.innerHTML = labels.map((label) => `<span>${label}</span>`).join("");
}

/* ----------------------------------------------------------
   Lê os campos, calcula e atualiza tudo na tela
   ---------------------------------------------------------- */
function recalculate() {
  const initial = Math.max(0, Number(initialInput.value) || 0);
  const monthly = Math.max(0, Number(monthlyInput.value) || 0);
  const ratePercent = Math.max(0, Number(rateInput.value) || 0);
  const years = Math.max(1, Number(yearsInput.value) || 1);

  const monthlyRate = ratePercent / 100;
  const months = years * 12;

  const annualEquivalent = (Math.pow(1 + monthlyRate, 12) - 1) * 100;
  rateHint.textContent = `Equivale a ${annualEquivalent.toFixed(2).replace(".", ",")}% ao ano`;

  const { investedSeries, valueSeries } = buildProjection(initial, monthly, monthlyRate, months);

  const finalValue = valueSeries[valueSeries.length - 1];
  const totalInvested = investedSeries[investedSeries.length - 1];
  const totalInterest = finalValue - totalInvested;

  finalValueEl.textContent = currencyFormatter.format(finalValue);
  finalHintEl.textContent = `Em ${years} ${years === 1 ? "ano" : "anos"}`;
  totalInvestedEl.textContent = currencyFormatter.format(totalInvested);
  totalInterestEl.textContent = currencyFormatter.format(totalInterest);

  const investedPoints = sampleSeries(investedSeries);
  const valuePoints = sampleSeries(valueSeries);
  renderChart(investedPoints, valuePoints, months);
}

/* ==========================================================
   Carteira de investimentos: ativos reais, com cotação buscada
   via brapi.dev (ver InvestmentController no backend)
   ========================================================== */
const portfolioForm = document.getElementById("portfolioForm");
const portfolioTickerInput = document.getElementById("portfolioTicker");
const portfolioQuantityInput = document.getElementById("portfolioQuantity");
const portfolioAvgPriceInput = document.getElementById("portfolioAvgPrice");
const portfolioSubmitBtn = document.getElementById("portfolioSubmitBtn");
const portfolioFormError = document.getElementById("portfolioFormError");
const portfolioBody = document.getElementById("portfolioBody");

function formatSignedPercent(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2).replace(".", ",")}%`;
}

function renderPortfolioSummary(investments) {
  const totalInvested = investments.reduce((sum, inv) => sum + inv.investedValue, 0);
  const totalCurrent = investments.reduce((sum, inv) => sum + (inv.currentValue ?? inv.investedValue), 0);
  const totalGain = totalCurrent - totalInvested;
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const isGain = totalGain >= 0;

  document.getElementById("portfolioInvestedValue").textContent = currencyFormatter.format(totalInvested);
  document.getElementById("portfolioCurrentValue").textContent = currencyFormatter.format(totalCurrent);

  const gainEl = document.getElementById("portfolioGainLoss");
  gainEl.textContent = `${currencyFormatter.format(totalGain)} (${formatSignedPercent(totalGainPercent)})`;
  gainEl.classList.toggle("summary-card__value--income", isGain);
  gainEl.classList.toggle("summary-card__value--expense", !isGain);

  const iconEl = document.getElementById("portfolioGainIcon");
  iconEl.textContent = isGain ? "↑" : "↓";
  iconEl.classList.toggle("summary-card__icon--income", isGain);
  iconEl.classList.toggle("summary-card__icon--expense", !isGain);

  const lastUpdate = investments
    .map((inv) => inv.price_updated_at)
    .filter(Boolean)
    .sort()
    .pop();
  const hintEl = document.getElementById("portfolioUpdatedHint");
  hintEl.textContent = lastUpdate
    ? `Cotação de ${new Date(lastUpdate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "Nenhum ativo cadastrado ainda";
}

function renderPortfolio(investments) {
  renderPortfolioSummary(investments);

  if (!investments.length) {
    portfolioBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 24px 12px;">
          Você ainda não adicionou nenhum ativo à carteira.
        </td>
      </tr>
    `;
    return;
  }

  portfolioBody.innerHTML = investments
    .map((inv) => {
      const quantity = Number(inv.quantity);
      const avgPrice = Number(inv.average_price);
      const currentPrice = inv.current_price !== null ? Number(inv.current_price) : null;
      const isGain = inv.gainLoss !== null && inv.gainLoss >= 0;

      return `
        <tr data-id="${inv.id}">
          <td>
            <div class="tx-desc"><strong>${escapeHtml(inv.ticker)}</strong></div>
            <span style="color: var(--text-secondary); font-size: 12.5px;">${escapeHtml(inv.asset_name || "")}</span>
          </td>
          <td class="align-right">${quantity}</td>
          <td class="align-right">${currencyFormatter.format(avgPrice)}</td>
          <td class="align-right">${currentPrice !== null ? currencyFormatter.format(currentPrice) : "—"}</td>
          <td class="align-right">${inv.currentValue !== null ? currencyFormatter.format(inv.currentValue) : "—"}</td>
          <td class="align-right tx-amount ${inv.gainLoss === null ? "" : isGain ? "tx-amount--income" : "tx-amount--expense"}">
            ${inv.gainLoss !== null ? `${isGain ? "+" : ""}${currencyFormatter.format(inv.gainLoss)} (${formatSignedPercent(inv.gainLossPercent)})` : "Cotação indisponível"}
          </td>
          <td class="align-right">
            <div class="row-actions">
              <button type="button" class="row-actions__btn" data-action="edit" data-id="${inv.id}">Editar</button>
              <button type="button" class="row-actions__btn row-actions__btn--danger" data-action="delete" data-id="${inv.id}">Excluir</button>
            </div>
          </td>
        </tr>
        <tr class="portfolio-edit-row" data-id="${inv.id}" hidden>
          <td colspan="7">
            <form class="budget-row__edit-form" data-id="${inv.id}">
              <input type="number" class="modal-input" min="0.01" step="0.01" value="${quantity}" data-field="quantity" placeholder="Quantidade" />
              <input type="number" class="modal-input" min="0.01" step="0.01" value="${avgPrice}" data-field="average_price" placeholder="Preço médio" />
              <button type="submit" class="btn-gold">Salvar</button>
              <button type="button" class="btn-secondary" data-action="cancel-edit">Cancelar</button>
            </form>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function loadPortfolio(token) {
  try {
    const response = await fetchWithAuth("/investments", token);
    if (!response.ok) return;
    renderPortfolio(await response.json());
  } catch (err) {
    console.error("Erro ao carregar carteira:", err);
  }
}

async function handlePortfolioDelete(id, token) {
  const confirmed = window.confirm("Remover esse ativo da carteira? As transações que você já lançou não são afetadas.");
  if (!confirmed) return;

  try {
    const response = await fetchWithAuth(`/investments/${id}`, token, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(extractErrorMessage(data, "Não foi possível remover o ativo."));
    await loadPortfolio(token);
  } catch (err) {
    window.alert(err.message || "Não foi possível remover o ativo.");
  }
}

async function handlePortfolioEditSubmit(editForm, id, token) {
  const quantity = Number(editForm.querySelector('[data-field="quantity"]').value);
  const average_price = Number(editForm.querySelector('[data-field="average_price"]').value);

  if (!quantity || quantity <= 0 || !average_price || average_price <= 0) {
    window.alert("Informe valores maiores que zero.");
    return;
  }

  try {
    const response = await fetchWithAuth(`/investments/${id}`, token, {
      method: "PUT",
      body: JSON.stringify({ quantity, average_price }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(extractErrorMessage(data, "Não foi possível atualizar o ativo."));
    await loadPortfolio(token);
  } catch (err) {
    window.alert(err.message || "Não foi possível atualizar o ativo.");
  }
}

function initPortfolio(auth) {
  portfolioForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    portfolioFormError.textContent = "";

    const ticker = portfolioTickerInput.value.trim();
    const quantity = Number(portfolioQuantityInput.value);
    const average_price = Number(portfolioAvgPriceInput.value);

    if (!ticker) {
      portfolioFormError.textContent = "Informe o código do ativo.";
      portfolioTickerInput.focus();
      return;
    }
    if (!quantity || quantity <= 0) {
      portfolioFormError.textContent = "Informe uma quantidade maior que zero.";
      portfolioQuantityInput.focus();
      return;
    }
    if (!average_price || average_price <= 0) {
      portfolioFormError.textContent = "Informe um preço médio maior que zero.";
      portfolioAvgPriceInput.focus();
      return;
    }

    portfolioSubmitBtn.disabled = true;
    portfolioSubmitBtn.textContent = "Buscando cotação...";

    try {
      const response = await fetchWithAuth("/investments", auth.token, {
        method: "POST",
        body: JSON.stringify({ ticker, quantity, average_price }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractErrorMessage(data, "Não foi possível adicionar o ativo."));
      }

      portfolioForm.reset();
      await loadPortfolio(auth.token);
    } catch (err) {
      portfolioFormError.textContent = err.message || "Não foi possível adicionar o ativo.";
    } finally {
      portfolioSubmitBtn.disabled = false;
      portfolioSubmitBtn.textContent = "+ Adicionar";
    }
  });

  // Delegação de eventos: cobre Editar/Excluir/Cancelar de qualquer linha,
  // mesmo depois que a tabela é recriada a cada atualização de cotação
  portfolioBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;

    if (action === "delete") {
      handlePortfolioDelete(id, auth.token);
      return;
    }

    if (action === "edit") {
      const editRow = portfolioBody.querySelector(`.portfolio-edit-row[data-id="${id}"]`);
      if (editRow) editRow.hidden = false;
      return;
    }

    if (action === "cancel-edit") {
      const editRow = button.closest(".portfolio-edit-row");
      if (editRow) editRow.hidden = true;
    }
  });

  portfolioBody.addEventListener("submit", (event) => {
    const editForm = event.target.closest(".budget-row__edit-form");
    if (!editForm) return;
    event.preventDefault();
    handlePortfolioEditSubmit(editForm, editForm.dataset.id, auth.token);
  });

  loadPortfolio(auth.token);
}

/* ----------------------------------------------------------
   Inicialização da página
   ---------------------------------------------------------- */
function initInvestmentsPage() {
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

  initPortfolio(auth);

  [initialInput, monthlyInput, rateInput, yearsInput].forEach((input) => {
    input.addEventListener("input", recalculate);
  });

  recalculate();
}

document.addEventListener("DOMContentLoaded", initInvestmentsPage);
