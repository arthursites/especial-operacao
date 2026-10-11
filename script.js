
"use strict";

/*
  OPERAÇÃO: CONQUISTAR VOCÊ
  Personalize as opções abaixo antes de publicar.
*/

const CONFIG = {
  // Troque pelo código secreto que você escolher.
  // Use letras e números. A senha não diferencia maiúsculas de minúsculas.
  password: "15052012",

  // Coloque sua gravação em audio/voz.mp3.
  voicePath: "voz.mp3",

  // Personalize esta declaração quando quiser.
  // Não há nomes ou memórias pessoais inventadas neste texto.
  declaration: `Se você chegou até aqui, completou uma missão que foi preparada especialmente para você.

  Talvez os desafios tenham exigido atenção, paciência e algumas tentativas. Mas existe algo que eu queria que você encontrasse no final: uma mensagem sincera.

  Eu não preciso de uma ocasião extraordinária para demonstrar o quanto você é especial para mim. Quero continuar construindo momentos, aprendendo, rindo e descobrindo novas partes da nossa história.

  Este pequeno jogo é apenas uma forma diferente de dizer que você importa para mim.

  Obrigado por fazer parte da minha vida. ❤️`
};

// Não altere os valores abaixo se quiser manter os enigmas funcionando.
const TOTAL_PHASES = 5;
const CIPHER_ANSWER = "AMOR";
const LOGIC_ANSWER = "042";
const FINAL_ANSWER = "AMOR";

let currentPhase = 0; // 0 = acesso; 1 a 5 = fases do jogo
let completedPhases = new Set();
let musicEnabled = false;
let romanticMode = false;
let audioContext = null;
let musicTimer = null;
let musicStep = 0;
let sequenceBusy = false;
let sequenceInput = [];
let hintShown = new Set();
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);

const gameContent = $("#gameContent");
const feedback = $("#feedback");
const phaseLabel = $("#phaseLabel");
const progressFill = $("#progressFill");
const progressText = $("#progressText");
const sideCompleted = $("#sideCompleted");
const missionStatus = $("#missionStatus");
const phaseMarkers = [...document.querySelectorAll(".phase-marker")];
const musicButton = $("#musicButton");
const musicLabel = $("#musicLabel");
const toast = $("#toast");

$("#year").textContent = new Date().getFullYear();

function normalize(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function setFeedback(message, type = "") {
  feedback.textContent = message;
  feedback.className = "feedback";
  if (type) feedback.classList.add(type);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function updateProgress() {
  const done = completedPhases.size;
  progressText.textContent = `${done} / ${TOTAL_PHASES} FASES`;
  sideCompleted.innerHTML = `${String(done).padStart(2, "0")} <small>/ 05</small>`;
  progressFill.style.width = `${(done / TOTAL_PHASES) * 100}%`;

  phaseMarkers.forEach((marker, index) => {
    const phase = index + 1;
    marker.classList.toggle("done", completedPhases.has(phase));
    marker.classList.toggle(
      "active",
      currentPhase === phase && !completedPhases.has(phase)
    );
    marker.classList.toggle(
      "locked",
      phase > currentPhase && !completedPhases.has(phase)
    );
    marker.setAttribute(
      "aria-label",
      `Fase ${phase}${completedPhases.has(phase) ? ", concluída" : ""}`
    );
  });

  if (done === TOTAL_PHASES) {
    missionStatus.textContent = "CONCLUÍDA";
    missionStatus.style.color = "var(--green)";
  } else if (currentPhase === 0) {
    missionStatus.textContent = "AGUARDANDO";
    missionStatus.style.color = "var(--purple-bright)";
  } else {
    missionStatus.textContent = "EM ANDAMENTO";
    missionStatus.style.color = "var(--cyan)";
  }
}

function hintButton(phase, message) {
  const hintId = `hint-${phase}`;
  const alreadyShown = hintShown.has(phase);

  return `
    <div class="button-row">
      <button class="secondary-button" type="button"
        data-action="hint" data-phase="${phase}">
        ${alreadyShown ? "OCULTAR DICA" : "SOLICITAR DICA"}
      </button>
    </div>
    <div id="${hintId}" class="hint-box ${alreadyShown ? "visible" : ""}">
      ${message}
    </div>
  `;
}

function toggleHint(phase) {
  const hint = $(`#hint-${phase}`);
  if (!hint) return;

  if (hint.classList.contains("visible")) {
    hint.classList.remove("visible");
    hintShown.delete(phase);
    const button = document.querySelector(
      `[data-action="hint"][data-phase="${phase}"]`
    );
    if (button) button.textContent = "SOLICITAR DICA";
  } else {
    hint.classList.add("visible");
    hintShown.add(phase);
    const button = document.querySelector(
      `[data-action="hint"][data-phase="${phase}"]`
    );
    if (button) button.textContent = "OCULTAR DICA";
  }
}

function renderAccess() {
  currentPhase = 0;
  updateProgress();
  phaseLabel.textContent = "ACESSO RESTRITO // AUTENTICAÇÃO";

  gameContent.innerHTML = `
    <div class="terminal-line">
      &gt; CONEXÃO SEGURA ESTABELECIDA<br>
      &gt; IDENTIDADE DO AGENTE: PENDENTE<br>
      &gt; INSIRA A CHAVE DE AUTORIZAÇÃO
    </div>

    <h2 class="mission-title">Você foi convocado.</h2>
    <p class="mission-description">
      Esta missão está protegida por uma senha. Insira a chave de acesso
      escolhida pelo responsável pela operação para liberar os cinco desafios.
    </p>

    <form id="accessForm">
      <label class="input-label" for="accessCode">CHAVE DE AUTORIZAÇÃO</label>
      <input class="game-input" id="accessCode" name="accessCode"
        type="password" autocomplete="off" autocapitalize="characters"
        placeholder="Digite a senha..." required>
      <div class="button-row">
        <button class="primary-button" type="submit">AUTENTICAR AGENTE ↗</button>
      </div>
    </form>

    <div class="hint-box visible">
      <strong>AVISO:</strong> o acesso é parte da experiência do jogo.
      Como este projeto funciona sem servidor, a senha não é uma proteção
      real contra alguém que inspecione o código-fonte.
    </div>
  `;

  $("#accessForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const entered = normalize($("#accessCode").value);
    const expected = normalize(CONFIG.password);

    if (!expected || expected === "ESCOLHA-SUA-SENHA") {
      setFeedback(
        "CONFIGURAÇÃO PENDENTE: altere CONFIG.password no script.js antes de jogar.",
        "error"
      );
      return;
    }

    if (entered !== expected) {
      setFeedback("ACESSO NEGADO. A chave informada não foi reconhecida.", "error");
      $("#accessCode").select();
      return;
    }

    setFeedback("IDENTIDADE VALIDADA. ACESSO AUTORIZADO.", "success");
    showToast("Acesso liberado. A missão começa agora.");

    setTimeout(() => {
      currentPhase = 1;
      renderPhase();
    }, 500);
  });

  setFeedback("");
}

function renderPhase() {
  updateProgress();
  setFeedback("");

  switch (currentPhase) {
    case 1:
      renderPhaseOne();
      break;
    case 2:
      renderPhaseTwo();
      break;
    case 3:
      renderPhaseThree();
      break;
    case 4:
      renderPhaseFour();
      break;
    case 5:
      renderPhaseFive();
      break;
    default:
      renderAccess();
  }

  // Volta ao início do painel de jogo ao mudar de fase.
  $("#gameContent").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function completePhase(phase, message) {
  if (completedPhases.has(phase)) return;

  completedPhases.add(phase);
  updateProgress();
  setFeedback(message || "DESAFIO CONCLUÍDO. ACESSO À PRÓXIMA FASE LIBERADO.", "success");
  showToast(`Fase ${phase} concluída.`);

  if (phase < TOTAL_PHASES) {
    const nextButton = $("#nextPhaseButton");
    if (nextButton) {
      nextButton.classList.remove("hidden");
      nextButton.focus();
    }
  } else {
    setTimeout(() => {
      romanticMode = true;
      document.body.classList.add("romantic-mode");
      startMusic(true);
      renderFinal();
    }, 1100);
  }
}

function nextPhase() {
  if (currentPhase >= TOTAL_PHASES || !completedPhases.has(currentPhase)) return;

  currentPhase += 1;
  renderPhase();
}

function nextPhaseButton() {
  return `
    <div class="button-row">
      <button id="nextPhaseButton" class="primary-button hidden" type="button">
        DESBLOQUEAR PRÓXIMA FASE ↗
      </button>
    </div>
  `;
}

function attachNextPhaseButton() {
  const button = $("#nextPhaseButton");
  if (button) button.addEventListener("click", nextPhase);
}

/* FASE 1 — sequência numérica */

function renderPhaseOne() {
  phaseLabel.textContent = "FASE 01 // ANÁLISE DE PADRÃO";

  gameContent.innerHTML = `
    <div class="terminal-line">
      &gt; ARQUIVO 01 RECUPERADO<br>
      &gt; ANÁLISE DE PADRÕES NECESSÁRIA
    </div>

    <h2 class="mission-title">O padrão oculto</h2>
    <p class="mission-description">
      Um arquivo foi protegido por uma sequência numérica. Descubra a regra
      que conecta os números e informe o próximo elemento.
    </p>

    <div class="document">
      <div class="document-head"><span>DOCUMENTO 01-A</span><span>CONFIDENCIAL</span></div>
      <p>SEQUÊNCIA DETECTADA:</p>
      <div class="cipher" style="letter-spacing: 3px">3 — 6 — 11 — 18 — 27 — ?</div>
      <p>O sistema espera um número. Não existe limite de tentativas.</p>
    </div>

    <form id="phaseOneForm">
      <label class="input-label" for="phaseOneAnswer">PRÓXIMO NÚMERO</label>
      <input class="game-input" id="phaseOneAnswer" type="number"
        inputmode="numeric" placeholder="Digite o resultado..." required>
      <div class="button-row">
        <button class="primary-button" type="submit">VALIDAR RESPOSTA ↗</button>
      </div>
    </form>

    ${hintButton(1, "Observe as diferenças entre números consecutivos. Elas não são iguais: aumentam de dois em dois.")}

    ${nextPhaseButton()}
  `;

  attachNextPhaseButton();

  $("#phaseOneForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const answer = $("#phaseOneAnswer").value.trim();

    if (answer !== "" && Number(answer) === 38) {
      completePhase(1, "PADRÃO IDENTIFICADO. O ARQUIVO 01 FOI DESBLOQUEADO.");
      $("#phaseOneAnswer").disabled = true;
      $("#phaseOneForm button").disabled = true;
    } else {
      setFeedback("RESPOSTA INCORRETA. Revise a diferença entre cada par de números.", "error");
    }
  });
}

/* FASE 2 — cifra de César */

function renderPhaseTwo() {
  phaseLabel.textContent = "FASE 02 // CRIPTOGRAFIA";

  gameContent.innerHTML = `
    <div class="terminal-line">
      &gt; INTERCEPTAÇÃO DE MENSAGEM<br>
      &gt; CIFRA DE SUBSTITUIÇÃO DETECTADA
    </div>

    <h2 class="mission-title">Mensagem interceptada</h2>
    <p class="mission-description">
      Um agente deixou uma mensagem criptografada. Para recuperá-la, cada
      letra foi avançada três posições no alfabeto. Reverta esse movimento
      para encontrar a palavra original.
    </p>

    <div class="document">
      <div class="document-head"><span>TRANSMISSÃO 02-B</span><span>CRIPTOGRAFADA</span></div>
      <p>REGRA: mova cada letra três posições para trás.</p>
      <div class="cipher">DPRU</div>
      <p>Exemplo: D volta para A. Continue usando a mesma regra.</p>
    </div>

    <form id="phaseTwoForm">
      <label class="input-label" for="phaseTwoAnswer">MENSAGEM DECODIFICADA</label>
      <input class="game-input" id="phaseTwoAnswer" type="text"
        maxlength="12" autocomplete="off" placeholder="Digite a palavra..." required>
      <div class="button-row">
        <button class="primary-button" type="submit">DECODIFICAR ↗</button>
      </div>
    </form>

    ${hintButton(2, "D → A, P → M, R → O. Aplique o mesmo deslocamento à última letra.")}

    ${nextPhaseButton()}
  `;

  attachNextPhaseButton();

  $("#phaseTwoForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if (normalize($("#phaseTwoAnswer").value) === CIPHER_ANSWER) {
      completePhase(2, "MENSAGEM RECUPERADA. O ARQUIVO 02 FOI DESBLOQUEADO.");
      $("#phaseTwoAnswer").disabled = true;
      $("#phaseTwoForm button").disabled = true;
    } else {
      setFeedback("CÓDIGO NÃO RECONHECIDO. Verifique o deslocamento das letras.", "error");
    }
  });
}

/* FASE 3 — dedução lógica */

function renderPhaseThree() {
  phaseLabel.textContent = "FASE 03 // COFRE DE SEGURANÇA";

  gameContent.innerHTML = `
    <div class="terminal-line">
      &gt; COFRE LOCALIZADO<br>
      &gt; TRÊS DÍGITOS NECESSÁRIOS
    </div>

    <h2 class="mission-title">O código do cofre</h2>
    <p class="mission-description">
      Use as cinco pistas para descobrir o código de três dígitos. Os dígitos
      não se repetem. Cada pista descreve exatamente quantos dígitos estão
      corretos e se estão na posição certa.
    </p>

    <div class="document">
      <div class="document-head"><span>RELATÓRIO 03-C</span><span>ACESSO RESTRITO</span></div>
      <p><strong>682</strong> — Um dígito está correto e na posição certa.</p>
      <p><strong>614</strong> — Um dígito está correto, mas na posição errada.</p>
      <p><strong>206</strong> — Dois dígitos estão corretos, mas nas posições erradas.</p>
      <p><strong>738</strong> — Nenhum dígito está correto.</p>
      <p><strong>780</strong> — Um dígito está correto, mas na posição errada.</p>
    </div>

    <form id="phaseThreeForm">
      <label class="input-label" for="phaseThreeAnswer">CÓDIGO DE TRÊS DÍGITOS</label>
      <input class="game-input" id="phaseThreeAnswer" type="text"
        inputmode="numeric" pattern="[0-9]{3}" maxlength="3"
        autocomplete="off" placeholder="000" required>
      <div class="button-row">
        <button class="primary-button" type="submit">ABRIR COFRE ↗</button>
      </div>
    </form>

    ${hintButton(3, "Comece pela pista 738 para eliminar dígitos. Depois use 780 para descobrir qual dos dígitos restantes aparece no código, mas não naquela posição.")}

    ${nextPhaseButton()}
  `;

  attachNextPhaseButton();

  $("#phaseThreeForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if ($("#phaseThreeAnswer").value.trim() === LOGIC_ANSWER) {
      completePhase(3, "COFRE ABERTO. O ARQUIVO 03 FOI RECUPERADO.");
      $("#phaseThreeAnswer").disabled = true;
      $("#phaseThreeForm button").disabled = true;
    } else {
      setFeedback("CÓDIGO INCORRETO. Compare todas as pistas antes de tentar novamente.", "error");
    }
  });
}

/* FASE 4 — memória visual */

const SYMBOLS = ["◆", "▲", "●", "■"];
const MEMORY_SEQUENCE = [2, 0, 3, 1, 2];

function renderPhaseFour() {
  phaseLabel.textContent = "FASE 04 // MEMÓRIA OPERACIONAL";
  sequenceInput = [];
  sequenceBusy = false;

  gameContent.innerHTML = `
    <div class="terminal-line">
      &gt; SIMULAÇÃO NEURAL INICIADA<br>
      &gt; MEMORIZE A SEQUÊNCIA DE SÍMBOLOS
    </div>

    <h2 class="mission-title">Memória de agente</h2>
    <p class="mission-description">
      O painel exibirá uma sequência de cinco símbolos. Memorize a ordem
      e repita-a usando os quatro botões abaixo. Se errar, poderá tentar
      novamente. Use a opção de visualizar a sequência quando precisar.
    </p>

    <div class="sequence-display" id="sequenceDisplay" aria-label="Sequência de símbolos">
      ${MEMORY_SEQUENCE.map(() => '<span class="sequence-tile">?</span>').join("")}
    </div>

    <div class="button-row" style="justify-content:center;margin-bottom:18px">
      <button id="showSequenceButton" class="secondary-button" type="button">
        VISUALIZAR SEQUÊNCIA
      </button>
      <button id="clearSequenceButton" class="secondary-button" type="button">
        LIMPAR RESPOSTA
      </button>
    </div>

    <div class="sequence-pad" aria-label="Painel de símbolos">
      ${SYMBOLS.map((symbol, index) => `
        <button class="pad-button" type="button" data-symbol="${index}"
          aria-label="Símbolo ${symbol}">${symbol}</button>
      `).join("")}
    </div>

    <p class="mission-description" id="sequenceStatus" style="text-align:center;margin:17px auto 0">
      Visualize a sequência para começar.
    </p>

    ${hintButton(4, "A sequência tem cinco símbolos. Você pode rever a demonstração sempre que quiser. Após cada erro, a resposta é reiniciada.")}

    ${nextPhaseButton()}
  `;

  attachNextPhaseButton();

  const padButtons = [...document.querySelectorAll("[data-symbol]")];
  const showButton = $("#showSequenceButton");
  const clearButton = $("#clearSequenceButton");
  const display = $("#sequenceDisplay");
  const status = $("#sequenceStatus");

  function updateSequenceDisplay(values) {
    const shown = values.length
      ? values
      : Array(MEMORY_SEQUENCE.length).fill(null);

    display.innerHTML = shown.map((value) => `
      <span class="sequence-tile">${value === null ? "?" : SYMBOLS[value]}</span>
    `).join("");
  }

  function setPadDisabled(disabled) {
    padButtons.forEach((button) => button.disabled = disabled);
    showButton.disabled = disabled;
    clearButton.disabled = disabled;
  }

  function showSequence() {
    if (sequenceBusy || completedPhases.has(4)) return;

    sequenceBusy = true;
    sequenceInput = [];
    updateSequenceDisplay([]);
    setPadDisabled(true);
    status.textContent = "OBSERVE COM ATENÇÃO...";

    let step = 0;

    function flashNext() {
      if (step >= MEMORY_SEQUENCE.length) {
        display.querySelectorAll(".sequence-tile").forEach((tile) => {
          tile.classList.remove("active");
        });
        sequenceBusy = false;
        setPadDisabled(false);
        status.textContent = "Agora repita os cinco símbolos na ordem correta.";
        updateSequenceDisplay([]);
        return;
      }

      const tiles = [...display.querySelectorAll(".sequence-tile")];
      tiles.forEach((tile) => tile.classList.remove("active"));

      const tile = tiles[step];
      if (tile) {
        tile.textContent = SYMBOLS[MEMORY_SEQUENCE[step]];
        tile.classList.add("active");
      }

      setTimeout(() => {
        if (tile) {
          tile.classList.remove("active");
          tile.textContent = "?";
        }
        step += 1;
        setTimeout(flashNext, 260);
      }, 600);
    }

    flashNext();
  }

  function handleSymbol(index) {
    if (sequenceBusy || completedPhases.has(4)) return;

    sequenceInput.push(index);
    const position = sequenceInput.length - 1;

    const tiles = [...display.querySelectorAll(".sequence-tile")];
    if (tiles[position]) {
      tiles[position].textContent = SYMBOLS[index];
      tiles[position].classList.add("active");
    }

    if (index !== MEMORY_SEQUENCE[position]) {
      status.textContent = "Sequência incorreta. Limpe a resposta e tente novamente.";
      setFeedback("PADRÃO INCORRETO. A sequência foi reiniciada.", "error");

      padButtons.forEach((button) => button.disabled = true);
      setTimeout(() => {
        sequenceInput = [];
        updateSequenceDisplay([]);
        padButtons.forEach((button) => button.disabled = false);
        status.textContent = "Você pode rever a sequência e tentar novamente.";
      }, 750);
      return;
    }

    if (sequenceInput.length === MEMORY_SEQUENCE.length) {
      padButtons.forEach((button) => button.disabled = true);
      showButton.disabled = true;
      clearButton.disabled = true;
      status.textContent = "Sequência correta!";
      completePhase(4, "MEMÓRIA VALIDADA. O ARQUIVO 04 FOI DESBLOQUEADO.");
    }
  }

  showButton.addEventListener("click", showSequence);

  clearButton.addEventListener("click", () => {
    if (sequenceBusy || completedPhases.has(4)) return;
    sequenceInput = [];
    updateSequenceDisplay([]);
    setFeedback("");
    status.textContent = "Resposta limpa. Continue quando estiver pronto.";
  });

  padButtons.forEach((button) => {
    button.addEventListener("click", () => {
      handleSymbol(Number(button.dataset.symbol));
    });
  });
}

/* FASE 5 — enigma final */


function renderPhaseFive() {
  phaseLabel.textContent = "FASE 05 // ÚLTIMA AUTORIZAÇÃO";

  gameContent.innerHTML = `
    <div class="terminal-line">
      &gt; CINCO ARQUIVOS ANALISADOS<br>
      &gt; ÚLTIMO DESAFIO DETECTADO<br>
      &gt; UMA ÚLTIMA PALAVRA É NECESSÁRIA
    </div>

    <h2 class="mission-title">O segredo da missão</h2>

    <p class="mission-description">
      Você chegou ao último arquivo. Leia o enigma com atenção
      e encontre a palavra que libera a transmissão final.
    </p>

    <div class="document">
      <div class="document-head">
        <span>ARQUIVO FINAL 05-Z</span>
        <span>ACESSO MÁXIMO</span>
      </div>

      <p style="color:var(--text);font-size:15px;line-height:2">
        Não sou um objeto que se embrulha.<br>
        Não sou uma senha que se esquece.<br>
        Posso ser demonstrado em gestos,<br>
        fortalecido com cuidado<br>
        e compartilhado sem perder meu valor.<br><br>
        <strong>O que sou?</strong>
      </p>
    </div>

    <form id="phaseFiveForm">
      <label class="input-label" for="phaseFiveAnswer">
        PALAVRA DE AUTORIZAÇÃO
      </label>

      <input
        class="game-input"
        id="phaseFiveAnswer"
        type="text"
        maxlength="30"
        autocomplete="off"
        placeholder="Sua resposta..."
        required
      >

      <div class="button-row">
        <button class="primary-button" type="submit">
          LIBERAR TRANSMISSÃO ↗
        </button>
      </div>
    </form>

    ${hintButton(
      5,
      "Pense no sentimento que pode ser demonstrado por atitudes e que está no próprio título desta experiência."
    )}

    ${nextPhaseButton()}
  `;

  attachNextPhaseButton();

  document
    .getElementById("phaseFiveForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();

      const resposta = normalize(
        document.getElementById("phaseFiveAnswer").value
      );

      if (resposta === "AMOR") {
        completePhase(
          5,
          "TODAS AS FASES CONCLUÍDAS. TRANSMISSÃO FINAL AUTORIZADA."
        );

        document.getElementById("phaseFiveAnswer").disabled = true;

        document.querySelector(
          "#phaseFiveForm button"
        ).disabled = true;
      } else {
        setFeedback(
          "PALAVRA NÃO RECONHECIDA. Releia o enigma e tente novamente.",
          "error"
        );
      }
    });
}

function renderFinal() {
  updateProgress();

  phaseLabel.textContent =
    "MISSÃO CONCLUÍDA // TRANSMISSÃO PESSOAL";

  setFeedback(
    "PROTOCOLO FINAL EXECUTADO. TODAS AS CINCO FASES FORAM CONCLUÍDAS.",
    "success"
  );

  gameContent.innerHTML = `
    <div class="completion-banner">
      ✓ ACESSO TOTAL CONCEDIDO<br>
      ✓ TODOS OS ARQUIVOS RECUPERADOS<br>
      ✓ TRANSMISSÃO PESSOAL DISPONÍVEL
    </div>

    <div class="final-card">
      <div class="final-kicker">
        MENSAGEM CONFIDENCIAL • SOMENTE PARA VOCÊ
      </div>

      <h3>Missão cumprida. <span class="heart">♥</span></h3>

      <p>${escapeHTML(CONFIG.declaration)}</p>

      <p style="color:#ff9fc5;font-size:15px">
        Com carinho, de mim para você. ❤️
      </p>
    </div>

    <div class="audio-card">
      <div class="final-kicker">
        TRANSMISSÃO DE VOZ // 001
      </div>

      <h4>Uma mensagem minha para você</h4>

      <p>
        Esta gravação foi preparada especialmente para este momento.
        Coloque seu arquivo voz.mp3 dentro da pasta audio/.
      </p>

      <audio id="voicePlayer" controls preload="metadata">
        <source src="${escapeAttribute(CONFIG.voicePath)}" type="audio/mpeg">
        Seu navegador não consegue reproduzir este áudio.
      </audio>

      <div id="audioHelp" class="audio-placeholder">
        Sua gravação aparecerá aqui quando o arquivo estiver no lugar certo.
      </div>
    </div>

    <div class="button-row">
      <button
        id="replayButton"
        class="secondary-button"
        type="button"
      >
        OUVIR A TRILHA NOVAMENTE
      </button>

      <button
        id="restartFinalButton"
        class="primary-button"
        type="button"
      >
        RECOMEÇAR A MISSÃO
      </button>
    </div>
  `;

  const player = document.getElementById("voicePlayer");
  const audioHelp = document.getElementById("audioHelp");

  player.addEventListener("error", () => {
    audioHelp.textContent =
      "Áudio não encontrado. Verifique se o arquivo está em audio/voz.mp3.";
  });

  player.addEventListener("loadedmetadata", () => {
    audioHelp.textContent =
      "Gravação carregada. Pressione play para ouvir.";
  });

  document.getElementById("replayButton").addEventListener("click", () => {
    startMusic(true);
    showToast("A trilha romântica foi reiniciada.");
  });

  document
    .getElementById("restartFinalButton")
    .addEventListener("click", resetMission);

  player.load();
          }

/* ===== CORREÇÕES: TRILHA E INICIALIZAÇÃO ===== */

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function stopMusic() {
  if (musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }

  musicEnabled = false;

  if (musicButton) {
    musicButton.setAttribute("aria-pressed", "false");
  }

  if (musicLabel) {
    musicLabel.textContent = "ATIVAR TRILHA";
  }
}

function startMusic(romantic = false) {
  try {
    const AudioEngine =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioEngine) {
      showToast("Seu navegador não suporta a trilha sonora.");
      return;
    }

    if (musicTimer !== null) {
      clearInterval(musicTimer);
      musicTimer = null;
    }

    if (!audioContext) {
      audioContext = new AudioEngine();
    }

    audioContext.resume().then(() => {
      musicEnabled = true;
      romanticMode = romantic || romanticMode;

      if (musicButton) {
        musicButton.setAttribute("aria-pressed", "true");
      }

      if (musicLabel) {
        musicLabel.textContent = "DESATIVAR TRILHA";
      }

      const suspense = [
        220, 261.63, 196, 293.66,
        220, 329.63, 261.63, 196
      ];

      const love = [
        261.63, 329.63, 392, 329.63,
        293.66, 349.23, 440, 392
      ];

      musicStep = 0;

      function playNote() {
        if (!audioContext || !musicEnabled) return;

        const notes = romanticMode ? love : suspense;
        const frequency = notes[musicStep % notes.length];
        musicStep++;

        const oscillator = audioContext.createOscillator();
        const volume = audioContext.createGain();
        const now = audioContext.currentTime;

        oscillator.type = romanticMode ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(frequency, now);

        volume.gain.setValueAtTime(0.0001, now);
        volume.gain.exponentialRampToValueAtTime(0.07, now + 0.06);
        volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

        oscillator.connect(volume);
        volume.connect(audioContext.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.34);
      }

      playNote();
      musicTimer = setInterval(playNote, 380);
    }).catch(() => {
      showToast("Toque em ATIVAR TRILHA para liberar o áudio.");
    });
  } catch (error) {
    showToast("Não foi possível iniciar a trilha neste navegador.");
  }
}

function resetMission() {
  stopMusic();

  completedPhases = new Set();
  hintShown = new Set();
  currentPhase = 0;
  sequenceInput = [];
  sequenceBusy = false;
  romanticMode = false;

  document.body.classList.remove("romantic-mode");

  updateProgress();
  renderAccess();
}

if (musicButton) {
  musicButton.addEventListener("click", () => {
    if (musicEnabled) {
      stopMusic();
    } else {
      startMusic(false);
    }
  });
}

document.addEventListener("click", (event) => {
  const hint = event.target.closest('[data-action="hint"]');

  if (hint) {
    toggleHint(Number(hint.dataset.phase));
  }
});

const restartButton = document.querySelector("#restartButton");

if (restartButton) {
  restartButton.addEventListener("click", resetMission);
}

renderAccess();


     }
