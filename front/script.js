const urlParams = new URLSearchParams(window.location.search);
let participant_id = urlParams.get("id");

if (!participant_id) {
  participant_id = "P" + Math.floor(Math.random() * 1000000);
}

// Tempo total
const inicio = Date.now();

// Gerar estímulos
function generateStimuli(size, targetPresent, difficulty) {
  let letters = [];

  for (let i = 0; i < size; i++) {
    letters.push(difficulty === "hard" ? "I" : "L");
  }

  if (targetPresent) {
    const index = Math.floor(Math.random() * size);
    letters[index] = "T";
  }

  return `
  <div style="
    display:flex;
    justify-content:center;
    align-items:center;
    height:80vh;
    font-size:32px;
    letter-spacing:10px;
  ">
    ${letters.join(" ")}
  </div>`;
}

// Criar trial
function createTrial(setSize, target, difficulty) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: generateStimuli(setSize, target, difficulty),
    choices: ["f", "j"],
    trial_duration: 4000,
    data: {
      participant: participant_id,
      set_size: setSize,
      target: target,
      difficulty: difficulty
    },
    on_finish: function(data) {
      data.correct = (data.response === "j" && target) ||
                     (data.response === "f" && !target);

      if (data.rt < 200) {
        data.invalid = true;
      }
    }
  };
}

let timeline = [];

// Tela de instruções
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: `
    <h2>Experimento de Busca Visual</h2>
    <p>Pressione <b>J</b> se encontrar a letra T</p>
    <p>Pressione <b>F</b> se NÃO encontrar</p>
    <p>Responda o mais rápido possível</p>
    <p><b>Pressione qualquer tecla para começar</b></p>
  `
});

// Treino
timeline.push({
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "<p>Treino: pressione J se tiver T, F se não tiver</p>"
});

timeline.push(createTrial(10, true, "easy"));
timeline.push(createTrial(10, false, "easy"));

// Trials principais
const setSizes = [10, 30, 60];
const difficulties = ["easy", "hard"];
const repeticoes = 5;

setSizes.forEach(size => {
  difficulties.forEach(diff => {
    for (let i = 0; i < repeticoes; i++) {
      timeline.push(createTrial(size, true, diff));
      timeline.push(createTrial(size, false, diff));
    }
  });
});

// Randomização
timeline = jsPsych.randomization.shuffle(timeline);

// Finalização
jsPsych.init({
  timeline: timeline,
  on_finish: function() {

    const fim = Date.now();
    const duracao = fim - inicio;

    let dados = jsPsych.data.get().values();

    dados = dados.map(d => ({
      ...d,
      total_time: duracao
    }));

    fetch("https://buscavisual.onrender.com/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dados)
    })
    .then(() => {
      document.body.innerHTML = "<h2>Obrigado pela participação!</h2>";
    })
    .catch(() => {
      document.body.innerHTML = "<h2>Erro ao salvar os dados</h2>";
    });
  }
});