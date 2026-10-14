(() => {
  'use strict';
  const root = document.querySelector('.faynt-page');
  if (!root || typeof FAYNT_DATA === 'undefined' || typeof TRAINING_CURVES === 'undefined') return;
  const $ = selector => root.querySelector(selector);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function controls(attribute, onChange) {
    const buttons = [...root.querySelectorAll(`[${attribute}]`)];
    buttons.forEach(button => button.addEventListener('click', () => {
      buttons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      onChange(button.getAttribute(attribute));
    }));
  }

  const stages = [
    {
      title: 'Learn from human replays',
      body: 'Pretraining predicts human controller inputs from structured game state. About 840,000 replays supply movement, positioning, attacks, and recovery examples across all 26 characters.',
      fact: '17.48 billion training targets · 256-frame context'
    },
    {
      title: 'Focus on strong, winning demonstrations',
      body: 'The curriculum moves from the full replay distribution to winners, then to Master and Diamond winners. The final supervised mixture draws about 90% of replay visits from Master wins and 10% from Diamond wins.',
      fact: 'Final supervised mixture: 90% Master wins / 10% Diamond wins'
    },
    {
      title: 'Teach the compact policy with the larger one',
      body: 'The 75M policy supplies action probabilities to the 10M student. Training gives equal weight to the human command and the teacher distribution. Two distillation rounds each process 900 million targets; the second uses a lower learning rate.',
      fact: '10M weighted validation loss: 0.76443 → 0.75746'
    },
    {
      title: 'Improve decisions through gameplay',
      body: 'PPO continues from the supervised policies in Fox mirror matches across six stages. Rewards combine stocks, damage, and movement. The second 10M run uses full self-play and an eight-second reward half-life.',
      fact: 'Zero-delay evaluation: 68/68 wins against one Slippi-AI checkpoint'
    }
  ];
  function renderStage(index) {
    const stage = stages[Number(index)];
    $('#faynt-stage-panel').innerHTML = `<h3>${stage.title}</h3><p>${stage.body}</p><p class="faynt-stage-fact">${stage.fact}</p>`;
  }
  controls('data-faynt-stage', renderStage);
  renderStage(0);

  let lossModel = '10M';
  const slider = $('#faynt-loss-progress');
  const lossHost = $('#faynt-loss-chart');
  let lossState;
  function renderLoss() {
    const model = TRAINING_CURVES.models.find(item => item.model === lossModel);
    const runs = model.runs.filter(run => !run.stopped);
    const end = runs.at(-1).endTargets;
    const metrics = ['weightedNll', 'overallNll'];
    const values = runs.flatMap(run => [run.sourcePoint, ...run.points]).flatMap(point => metrics.map(metric => point[metric])).filter(value => Number.isFinite(value));
    const low = Math.floor((Math.min(...values) - .004) * 1000) / 1000;
    const high = Math.ceil((Math.max(...values) + .004) * 1000) / 1000;
    const width = lossHost.clientWidth < 560 ? 380 : 760;
    const height = 300;
    const left = 44, right = 18, top = 20, bottom = 48;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const x = value => left + value / end * plotWidth;
    const y = value => top + (high - value) / (high - low) * plotHeight;
    let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${lossModel} validation loss across selected post-training runs. Weighted winning-play loss and overall loss; lower is better.">`;
    for (let tick = 0; tick <= 4; tick++) {
      const value = low + (high - low) * tick / 4;
      svg += `<line class="faynt-grid-line" x1="${left}" x2="${width-right}" y1="${y(value)}" y2="${y(value)}"/><text class="faynt-axis-label" x="${left-8}" y="${y(value)+4}" text-anchor="end">${value.toFixed(3)}</text>`;
      const targets = end * tick / 4;
      svg += `<text class="faynt-axis-label" x="${x(targets)}" y="${height-26}" text-anchor="middle">${(targets/1e9).toFixed(1)}</text>`;
    }
    svg += `<text class="faynt-axis-label" x="${left+plotWidth/2}" y="${height-5}" text-anchor="middle">Post-training targets (billions)</text>`;
    runs.slice(1).forEach(run => {
      svg += `<line class="faynt-grid-line" stroke-dasharray="3 5" x1="${x(run.startTargets)}" x2="${x(run.startTargets)}" y1="${top}" y2="${top+plotHeight}"/>`;
    });
    for (const metric of metrics) {
      for (const run of runs) {
        const points = [run.sourcePoint, ...run.points].filter(point => Number.isFinite(point[metric]));
        const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(point.targets).toFixed(2)},${y(point[metric]).toFixed(2)}`).join(' ');
        svg += `<path class="faynt-curve-${metric==='weightedNll'?'weighted':'overall'}" d="${path}" fill="none" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
      }
    }
    svg += '<g id="faynt-loss-cursor"></g></svg>';
    lossHost.innerHTML = svg;
    const observations = [{...model.pretrained, stage:'Pretrained'}, ...runs.flatMap(run => run.points.map(point => ({...point, stage:run.label})))];
    lossState = {x, y, end, top, plotHeight, observations};
    updateLossCursor();
  }
  function updateLossCursor() {
    const {x, y, end, top, plotHeight, observations} = lossState;
    const targets = Number(slider.value) / 1000 * end;
    const point = observations.reduce((last, current) => current.targets <= targets ? current : last, observations[0]);
    const stage = {'Mixture':'Winner mixture','Lower-rate KD':'Lower-rate distillation'}[point.stage] || point.stage;
    $('#faynt-loss-cursor').innerHTML = `<line class="faynt-cursor" x1="${x(point.targets)}" x2="${x(point.targets)}" y1="${top}" y2="${top+plotHeight}" stroke-dasharray="3 4"/>` + ['weightedNll','overallNll'].map(metric => `<circle class="faynt-curve-${metric==='weightedNll'?'weighted':'overall'}" cx="${x(point.targets)}" cy="${y(point[metric])}" r="4" stroke-width="2"/>`).join('');
    $('#faynt-loss-readout').innerHTML = `<div class="faynt-readout-item"><span>${escape(stage)}</span><strong>${(point.targets/1e9).toFixed(2)}B targets</strong></div><div class="faynt-readout-item"><span>Weighted loss</span><strong>${point.weightedNll.toFixed(5)}</strong></div><div class="faynt-readout-item"><span>Overall loss</span><strong>${point.overallNll.toFixed(5)}</strong></div>`;
    slider.setAttribute('aria-valuetext', `${lossModel}, ${stage}, ${(point.targets/1e9).toFixed(2)} billion targets, weighted loss ${point.weightedNll.toFixed(5)}, overall loss ${point.overallNll.toFixed(5)}`);
  }
  controls('data-faynt-loss-model', model => { lossModel = model; slider.value = '1000'; renderLoss(); });
  slider.addEventListener('input', updateLossCursor);
  renderLoss();
  let lossWidth = lossHost.clientWidth;
  new ResizeObserver(() => {
    if (Math.abs(lossHost.clientWidth - lossWidth) > 2) {
      lossWidth = lossHost.clientWidth;
      renderLoss();
    }
  }).observe(lossHost);

  function bar(label, value, maximum, valueLabel, secondary = false) {
    return `<div class="faynt-bar-row"><span class="faynt-bar-label">${escape(label)}</span><div class="faynt-bar-track" aria-hidden="true"><div class="faynt-bar-fill${secondary?' is-secondary':''}" style="width:${Math.max(0,Math.min(100,value/maximum*100))}%"></div></div><span class="faynt-bar-value">${escape(valueLabel)}</span></div>`;
  }
  function renderGameplay(metric) {
    const config = {
      win: {key:'winPercent', max:100, label:'Win rate · higher is better', format:row => `${row.winPercent.toFixed(1)}% (${row.wins}/152)`},
      overall: {key:'validationNll', max:1, label:'Overall validation loss · lower is better', format:row => row.validationNll.toFixed(5)},
      weighted: {key:'weightedValidationNll', max:1, label:'Weighted winning-play loss · lower is better', format:row => row.weightedValidationNll.toFixed(5)}
    }[metric];
    $('#faynt-gameplay-chart').innerHTML = `<p class="faynt-chart-note">${config.label}</p>` + FAYNT_DATA.initialSuite.rows.map(row => bar(`${row.model} ${row.stage.toLowerCase()}`, row[config.key], config.max, config.format(row), row.stage==='Pretrained')).join('');
  }
  controls('data-faynt-gameplay-metric', renderGameplay);
  renderGameplay('win');

  function renderLatency(gpu) {
    const rows = FAYNT_DATA.latency.rows.filter(row => row.gpu === gpu);
    $('#faynt-latency-chart').innerHTML = '<p class="faynt-chart-note">One full track = 16.67 ms, the budget for a 60 Hz frame</p>' + rows.flatMap(row => [
      bar(`${row.model} mean`, row.meanMs, FAYNT_DATA.latency.frameBudgetMs, `${row.meanMs.toFixed(1)} ms`),
      bar(`${row.model} p99`, row.p99Ms, FAYNT_DATA.latency.frameBudgetMs, `${row.p99Ms.toFixed(1)} ms`, true)
    ]).join('');
  }
  controls('data-faynt-gpu', renderLatency);
  renderLatency('NVIDIA T4');
})();
