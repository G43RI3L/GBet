const tiposDeAposta = [
  "Time A vence",
  "Time B vence",
  "Empate",
  "Ambos marcam",
  "Ambos marcam e Time A vence",
  "Ambos marcam e Time B vence",
  "Ambos marcam e Empate final",
  "Mais que X gols",
  "Menos que X gols"
];

const gamesContainer = document.getElementById("games-container");
const acertosContainer = document.getElementById("acertos-container");
const opcoesContainer = document.getElementById("opcoes-principais");
const opcoesDoisErrosContainer = document.getElementById("opcoes-dois-erros");
const resumoContainer = document.getElementById("resumo-resultado");
const historicoLista = document.getElementById("historico-lista");
const totalAmountInput = document.getElementById("totalAmount");
const btnDoisErros = document.getElementById("gerar-dois-erros");
const graficoCanvas = document.getElementById("graficoLucro");
const resetarBtn = document.getElementById("resetar-apostas");

let historico = [];
let jogosAtuais = [];        // jogos válidos da última geração
let combinations = [];       // combinações 7 de 8 (palpites originais)
let combinacoesDoisErros = []; // 7 jogos com 1 palpite invertido (usa a odd reversa)
let lucroAcumulado = 0;

// ---------- utilidades ----------
const esc = s => String(s).replace(/[&<>"']/g, c => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));
const brl = n => "R$ " + n.toFixed(2).replace(".", ",");

// ---------- campos dos 8 jogos ----------
for (let i = 0; i < 8; i++) {
  const div = document.createElement("div");
  div.className = "game-block";
  div.innerHTML = `
    <label>Jogo ${i + 1}</label>
    <input type="text" placeholder="Ex: Flamengo x Palmeiras" class="jogo">
    <select class="tipo">
      ${tiposDeAposta.map(tipo => `<option value="${tipo}">${tipo}</option>`).join("")}
    </select>
    <div class="odds-linha">
      <input type="number" class="odd" step="0.01" placeholder="Odd">
      <input type="number" class="odd-reversa" step="0.01" placeholder="Odd reversa">
    </div>
  `;
  gamesContainer.appendChild(div);
}

// Lê os jogos preenchidos (nome + odd válida). A odd reversa é opcional.
function lerJogos() {
  return [...document.querySelectorAll(".game-block")].map(el => {
    const nome = el.querySelector(".jogo").value.trim();
    const tipo = el.querySelector(".tipo").value;
    const odd = parseFloat(el.querySelector(".odd").value);
    const oddReversaBruta = parseFloat(el.querySelector(".odd-reversa").value);
    if (nome && !isNaN(odd)) {
      return {
        nome,
        tipo,
        odd,
        oddReversa: isNaN(oddReversaBruta) ? null : oddReversaBruta,
        palpiteReverso: inverterPalpite(tipo)
      };
    }
    return null;
  }).filter(j => j !== null).map((j, id) => ({ ...j, id }));
}

// Inverte palpites (label descritivo; a odd real vem do campo "Odd reversa")
function inverterPalpite(palpite) {
  if (palpite === "Empate") return "Mais 1.5 gols";
  if (palpite === "Ambos marcam") return "Menos 1.5 gols";
  if (palpite === "Ambos marcam e Time A") return "Ambos marcam e Time B";
  if (palpite.includes("Time A")) return palpite.replace("Time A", "Time B");
  if (palpite.includes("Time B")) return palpite.replace("Time B", "Time A");
  if (palpite.includes("Mais que")) return palpite.replace("Mais", "Menos");
  if (palpite.includes("Menos que")) return palpite.replace("Menos", "Mais");
  return palpite;
}

// ---------- combinatória ----------
// Combinações "7 de 8": remove um jogo por vez
function gerarCombinacoes(jogos) {
  return jogos.map((_, i) => ({
    jogos: jogos.filter((_, idx) => idx !== i).map(j => ({ ...j, reverso: false }))
  }));
}

function finalizarCombinacao(comb, valor) {
  comb.oddTotal = comb.jogos.reduce(
    (acc, j) => acc * (j.reverso ? j.oddReversa : j.odd), 1
  );
  comb.valor = valor;
  comb.retorno = valor * comb.oddTotal;
  comb.status = null; // null = ainda não calculado
  return comb;
}

// ---------- renderização legível ----------
function renderOpcoes(lista, container) {
  if (!lista.length) {
    container.innerHTML = "<p class='vazio'>Nenhuma opção gerada.</p>";
    return;
  }
  container.innerHTML = lista.map((comb, idx) => {
    const classe = comb.status === true ? "ganhou" : comb.status === false ? "perdeu" : "";
    const selo = comb.status === true ? "<span class='selo verde'>GREEN</span>"
      : comb.status === false ? "<span class='selo vermelho'>RED</span>" : "";
    const itens = comb.jogos.map(j => {
      const palpite = j.reverso ? j.palpiteReverso : j.tipo;
      const odd = j.reverso ? j.oddReversa : j.odd;
      return `<li class="${j.reverso ? "reverso" : ""}">
        <span class="jogo-nome">${esc(j.nome)}</span>
        <span class="jogo-palpite">${esc(palpite)}${j.reverso ? " (reversa)" : ""}</span>
        <span class="jogo-odd">@ ${odd.toFixed(2)}</span>
      </li>`;
    }).join("");
    return `<div class="opcao ${classe}">
      <div class="opcao-titulo"><strong>Opção #${idx + 1}</strong> ${selo}</div>
      <ul>${itens}</ul>
      <div class="opcao-resumo">
        Odd total <strong>${comb.oddTotal.toFixed(2)}</strong> ·
        Apostar <strong>${brl(comb.valor)}</strong> ·
        Retorno <strong>${brl(comb.retorno)}</strong>
      </div>
    </div>`;
  }).join("");
}

// Um par de checkboxes por jogo: "palpite acertou" e "reversa acertou"
function atualizarCheckboxes(jogos) {
  acertosContainer.innerHTML = "";
  jogos.forEach(jogo => {
    const bloco = document.createElement("div");
    bloco.className = "acerto-bloco";
    const temReversa = jogo.oddReversa !== null;
    bloco.innerHTML = `
      <strong>${esc(jogo.nome)}</strong>
      <label><input type="checkbox" class="acerto" data-id="${jogo.id}"> Palpite: ${esc(jogo.tipo)} (@ ${jogo.odd.toFixed(2)})</label>
      <label class="${temReversa ? "" : "desativado"}">
        <input type="checkbox" class="acerto-reversa" data-id="${jogo.id}" ${temReversa ? "" : "disabled"}>
        Reversa: ${esc(jogo.palpiteReverso)} ${temReversa ? `(@ ${jogo.oddReversa.toFixed(2)})` : "(informe a odd reversa)"}
      </label>`;
    acertosContainer.appendChild(bloco);
  });
}

// Palpite e reversa do mesmo jogo são mutuamente exclusivos
acertosContainer.addEventListener("change", e => {
  const el = e.target;
  if (!el.checked) return;
  const outraClasse = el.classList.contains("acerto") ? ".acerto-reversa" : ".acerto";
  const outra = acertosContainer.querySelector(`${outraClasse}[data-id="${el.dataset.id}"]`);
  if (outra) outra.checked = false;
});

// ---------- gerar apostas ----------
document.getElementById("bet-form").addEventListener("submit", e => {
  e.preventDefault();

  const jogos = lerJogos();
  if (jogos.length < 3) {
    alert("Preencha pelo menos 3 jogos para gerar combinações.");
    return;
  }

  const totalAmount = parseFloat(totalAmountInput.value);
  jogosAtuais = jogos;
  combinations = gerarCombinacoes(jogos);
  const valorPorAposta = totalAmount / combinations.length;
  combinations.forEach(c => finalizarCombinacao(c, valorPorAposta));

  combinacoesDoisErros = [];
  opcoesDoisErrosContainer.innerHTML = "";
  resumoContainer.innerHTML = "";

  renderOpcoes(combinations, opcoesContainer);
  atualizarCheckboxes(jogos);
});

// ---------- 2 erros: 1 jogo removido + 1 palpite invertido ----------
btnDoisErros.addEventListener("click", () => {
  const jogos = lerJogos();
  if (jogos.length < 3) {
    alert("Preencha pelo menos 3 jogos para gerar combinações.");
    return;
  }
  const semReversa = jogos.filter(j => j.oddReversa === null);
  if (semReversa.length === jogos.length) {
    alert("Informe a 'Odd reversa' de pelo menos um jogo para gerar as combinações com 2 erros.");
    return;
  }

  const totalAmount = parseFloat(totalAmountInput.value);
  const base = gerarCombinacoes(jogos);
  const valorPorAposta = totalAmount / base.length;

  jogosAtuais = jogos;
  combinacoesDoisErros = [];
  base.forEach(comb => {
    comb.jogos.forEach((jogo, k) => {
      if (jogo.oddReversa === null) return; // só inverte jogos com odd reversa
      const novos = comb.jogos.map((j, idx) => ({ ...j, reverso: idx === k }));
      combinacoesDoisErros.push(finalizarCombinacao({ jogos: novos }, valorPorAposta));
    });
  });

  renderOpcoes(combinacoesDoisErros, opcoesDoisErrosContainer);
  atualizarCheckboxes(jogos); // garante checkboxes de palpite + reversa atualizados
  if (semReversa.length) {
    opcoesDoisErrosContainer.insertAdjacentHTML("afterbegin",
      `<p class="aviso">Sem odd reversa (não invertidos): ${semReversa.map(j => esc(j.nome)).join(", ")}</p>`);
  }
});

// ---------- cálculo de lucro ----------
document.getElementById("calcular-lucro").addEventListener("click", () => {
  if (!combinations.length && !combinacoesDoisErros.length) {
    alert("Gere as apostas primeiro.");
    return;
  }

  const ids = seletor => new Set(
    [...document.querySelectorAll(seletor)].filter(c => c.checked).map(c => parseInt(c.dataset.id))
  );
  const acertos = ids(".acerto");
  const acertosReversa = ids(".acerto-reversa");

  const todas = [...combinations, ...combinacoesDoisErros];
  let totalInvestido = 0;
  let totalGanho = 0;
  let greens = 0;

  todas.forEach(comb => {
    totalInvestido += comb.valor;
    comb.status = comb.jogos.every(j => j.reverso ? acertosReversa.has(j.id) : acertos.has(j.id));
    if (comb.status) {
      totalGanho += comb.retorno;
      greens++;
    }
  });

  const lucro = totalGanho - totalInvestido;
  lucroAcumulado += lucro;
  historico.push(lucro);

  renderOpcoes(combinations, opcoesContainer);
  if (combinacoesDoisErros.length) renderOpcoes(combinacoesDoisErros, opcoesDoisErrosContainer);

  resumoContainer.innerHTML = `
    <div class="resumo ${lucro >= 0 ? "ganhou" : "perdeu"}">
      ${greens} de ${todas.length} apostas bateram ·
      Investido <strong>${brl(totalInvestido)}</strong> ·
      Retorno <strong>${brl(totalGanho)}</strong> ·
      Lucro <strong>${brl(lucro)}</strong>
    </div>`;

  const li = document.createElement("li");
  li.textContent = `Lucro da semana: ${brl(lucro)} (Acumulado: ${brl(lucroAcumulado)})`;
  historicoLista.appendChild(li);

  desenharGrafico();
});

// ---------- resetar ----------
resetarBtn.addEventListener("click", () => {
  document.getElementById("bet-form").reset();
  opcoesContainer.innerHTML = "";
  opcoesDoisErrosContainer.innerHTML = "";
  resumoContainer.innerHTML = "";
  acertosContainer.innerHTML = "";
  historicoLista.innerHTML = "";
  historico = [];
  jogosAtuais = [];
  combinations = [];
  combinacoesDoisErros = [];
  lucroAcumulado = 0;
  if (window.meuGrafico) window.meuGrafico.destroy();
});

// ---------- gráfico (Chart.js) ----------
function desenharGrafico() {
  if (typeof Chart === "undefined") return;
  if (window.meuGrafico) window.meuGrafico.destroy();
  window.meuGrafico = new Chart(graficoCanvas, {
    type: "bar",
    data: {
      labels: historico.map((_, i) => `Semana ${i + 1}`),
      datasets: [{
        label: "Lucro por semana (R$)",
        data: historico,
        backgroundColor: historico.map(v => v >= 0 ? "green" : "red")
      }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}
