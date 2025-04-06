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
const graficoCanvas = document.getElementById("graficoLucro");
let historico = [];
let combinations = [];
let lucroAcumulado = 0;
const resetarBtn = document.getElementById("resetar-apostas");


// Cria os campos dos 8 jogos
for (let i = 0; i < 8; i++) {
  const div = document.createElement("div");
  div.className = "game-block";

  div.innerHTML = `
    <label>Jogo ${i + 1}</label>
    <input type="text" placeholder="Ex: Flamengo x Palmeiras" class="jogo" required>
    <select class="tipo">
      ${tiposDeAposta.map(tipo => `<option value="${tipo}">${tipo}</option>`).join('')}
    </select>
    <input type="number" class="odd" step="0.01" placeholder="Odd" required>
  `;

  gamesContainer.appendChild(div);
}

// Cria checkboxes para acertar
function atualizarCheckboxes(jogos) {
  acertosContainer.innerHTML = "";
  jogos.forEach((jogo, i) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type='checkbox' class='acerto' value='${i}'> ${jogo}`;
    acertosContainer.appendChild(label);
  });
}

// Combinações de 7 entre 8
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

// Calcular odds combinadas
function calcularOddTotal(combinacao) {
  return combinacao.reduce((acc, jogo) => acc * parseFloat(jogo.odd), 1).toFixed(2);
}

// Submissão do formulário
document.getElementById("bet-form").addEventListener("submit", e => {
  e.preventDefault();

  const jogos = [...document.querySelectorAll(".game-block")].map((el, i) => {
    return {
      nome: el.querySelector(".jogo").value,
      tipo: el.querySelector(".tipo").value,
      odd: parseFloat(el.querySelector(".odd").value)
    };
  });

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

// Calcular lucro
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

// Gráfico com Chart.js
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
        y: {
          beginAtZero: true
        }
      }
    }
  });
}
