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

  [initialInput, monthlyInput, rateInput, yearsInput].forEach((input) => {
    input.addEventListener("input", recalculate);
  });

  recalculate();
}

document.addEventListener("DOMContentLoaded", initInvestmentsPage);
