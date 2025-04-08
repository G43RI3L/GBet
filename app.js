// app.js

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
const combinationsTableBody = document.querySelector("#combinations-table tbody");
const historicoLista = document.getElementById("historico-lista");
const totalAmountInput = document.getElementById("totalAmount");
const btnDoisErros = document.getElementById("gerar-dois-erros");
const tabelaDoisErros = document.getElementById("tabelaDoisErros").querySelector("tbody");
const graficoCanvas = document.getElementById("graficoLucro");
const resetarBtn = document.getElementById("resetar-apostas");
let historico = [];
let combinations = [];
let lucroAcumulado = 0;

function inverterPalpite(palpite) {
  switch (palpite) {
    case "Time A vence": return "Time B vence";
    case "Time B vence": return "Time A vence";
    case "Mais que X gols": return "Menos que X gols";
    case "Menos que X gols": return "Mais que X gols";
    case "Empate": return "Mais que 1 gol";
    case "Ambos marcam e Time A vence": return "Ambos marcam e Time B vence";
    case "Ambos marcam e Time B vence": return "Ambos marcam e Time A vence";
    case "Ambos marcam e Empate final": return "Ambos marcam";
    case "Ambos marcam": return "Ambos marcam e Empate final";
    default: return palpite;
  }
}

function criarCamposJogo(qtd = 8) {
  gamesContainer.innerHTML = "";
  for (let i = 0; i < qtd; i++) {
    const div = document.createElement("div");
    div.className = "game-block";
    div.innerHTML = `
      <label>Jogo ${i + 1}</label>
      <input type="text" placeholder="Ex: Flamengo x Palmeiras" class="jogo">
      <select class="tipo">
        ${tiposDeAposta.map(tipo => `<option value="${tipo}">${tipo}</option>`).join('')}
      </select>
      <input type="number" class="odd" step="0.01" placeholder="Odd">
    `;
    gamesContainer.appendChild(div);
  }
}

criarCamposJogo();

function atualizarCheckboxes(jogos) {
  acertosContainer.innerHTML = "";
  jogos.forEach((jogo, i) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type='checkbox' class='acerto' value='${i}'> ${jogo}`;
    acertosContainer.appendChild(label);
  });
}

function gerarCombinacoes(arr) {
  const resultado = [];
  for (let i = 0; i < arr.length; i++) {
    const copia = [...arr];
    copia.splice(i, 1);
    resultado.push({
      ids: copia.map((_, idx) => idx >= i ? idx + 1 : idx),
      jogos: copia
    });
  }
  return resultado;
}

function calcularOddTotal(combinacao) {
  return combinacao.reduce((acc, jogo) => acc * parseFloat(jogo.odd), 1).toFixed(2);
}

document.getElementById("bet-form").addEventListener("submit", e => {
  e.preventDefault();

  const jogos = [...document.querySelectorAll(".game-block")].map(el => {
    return {
      nome: el.querySelector(".jogo").value,
      tipo: el.querySelector(".tipo").value,
      odd: parseFloat(el.querySelector(".odd").value)
    };
  }).filter(j => j.nome && j.tipo && !isNaN(j.odd));

  if (jogos.length < 3) {
    alert("Preencha ao menos 3 jogos para gerar apostas.");
    return;
  }

  const totalAmount = parseFloat(totalAmountInput.value);
  combinations = gerarCombinacoes(jogos);
  const valorPorAposta = (totalAmount / combinations.length).toFixed(2);

  combinationsTableBody.innerHTML = "";
  combinations.forEach((comb, idx) => {
    const oddTotal = calcularOddTotal(comb.jogos);
    const retorno = (valorPorAposta * oddTotal).toFixed(2);
    comb.oddTotal = oddTotal;
    comb.valor = valorPorAposta;
    comb.retorno = retorno;
    comb.idx = idx + 1;

    const row = `<tr>
      <td>#${idx + 1}</td>
      <td>${comb.jogos.map(j => j.nome).join(", ")}</td>
      <td>${oddTotal}</td>
      <td>R$ ${valorPorAposta}</td>
      <td>R$ ${retorno}</td>
    </tr>`;
    combinationsTableBody.innerHTML += row;
  });

  atualizarCheckboxes(jogos.map(j => j.nome));
});

document.getElementById("calcular-lucro").addEventListener("click", () => {
  const acertos = [...document.querySelectorAll(".acerto")]
    .filter(c => c.checked)
    .map(c => parseInt(c.value));

  const totalInvestido = parseFloat(totalAmountInput.value);
  let totalGanho = 0;

  combinations.forEach(comb => {
    const jogosIncluidos = comb.ids;
    const acertouTodos = jogosIncluidos.every(id => acertos.includes(id));
    if (acertouTodos) {
      totalGanho += parseFloat(comb.retorno);
    }
  });

  const lucro = totalGanho - totalInvestido;
  lucroAcumulado += lucro;

  historico.push(lucro);
  const li = document.createElement("li");
  li.textContent = `Lucro da semana: R$ ${lucro.toFixed(2)} (Acumulado: R$ ${lucroAcumulado.toFixed(2)})`;
  historicoLista.appendChild(li);
  desenharGrafico();
});

btnDoisErros.addEventListener("click", () => {
  tabelaDoisErros.innerHTML = "";

  const jogos = [...document.querySelectorAll(".game-block")].map(el => {
    const nome = el.querySelector(".jogo").value;
    const tipo = el.querySelector(".tipo").value;
    const odd = parseFloat(el.querySelector(".odd").value);
    return nome && tipo && !isNaN(odd) ? { nome, tipo, odd } : null;
  }).filter(j => j);

  if (jogos.length < 3) {
    alert("Preencha pelo menos 3 jogos.");
    return;
  }

  const totalAmount = parseFloat(totalAmountInput.value);
  const combinacoes = gerarCombinacoes(jogos);
  const valorPorAposta = (totalAmount / (combinacoes.length * jogos.length)).toFixed(2);

  combinacoes.forEach((comb, idx) => {
    comb.jogos.forEach((jogo, i) => {
      const novaComb = [...comb.jogos];
      novaComb[i] = { ...jogo, tipo: inverterPalpite(jogo.tipo) };

      const oddTotal = calcularOddTotal(novaComb);
      const retorno = (valorPorAposta * oddTotal).toFixed(2);

      const row = tabelaDoisErros.insertRow();
      row.insertCell().textContent = `#${idx + 1}.${i + 1}`;
      row.insertCell().textContent = novaComb.map(j => j.nome).join(", ");
      row.insertCell().textContent = novaComb.map(j => j.tipo).join(", ");
      row.insertCell().textContent = oddTotal;
      row.insertCell().textContent = `R$ ${valorPorAposta}`;
      row.insertCell().textContent = `R$ ${retorno}`;
    });
  });
});

resetarBtn.addEventListener("click", () => {
  criarCamposJogo();
});

document.getElementById("criar-campos").addEventListener("click", () => {
  const qtd = parseInt(prompt("Quantos jogos você deseja? (mínimo 3, máximo 12)"));
  if (qtd >= 3 && qtd <= 12) criarCamposJogo(qtd);
  else alert("Número inválido.");
});

function desenharGrafico() {
  if (window.meuGrafico) window.meuGrafico.destroy();
  window.meuGrafico = new Chart(graficoCanvas, {
    type: 'bar',
    data: {
      labels: historico.map((_, i) => `Semana ${i + 1}`),
      datasets: [{
        label: 'Lucro por semana (R$)',
        data: historico,
        backgroundColor: historico.map(v => v >= 0 ? 'green' : 'red')
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
