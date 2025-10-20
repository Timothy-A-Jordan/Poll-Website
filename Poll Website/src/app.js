/* QuickPolls app logic */
(function(){
  const STORAGE_KEY = 'quickpolls.polls.v1';
  const VOTES_KEY = 'quickpolls.votes.v1'; // map of { [pollId]: optionId }
  const DAY_MS = 24 * 60 * 60 * 1000;

  const el = {
    question: document.getElementById('question'),
    description: document.getElementById('description'),
    optionsList: document.getElementById('options-list'),
    addOptionBtn: document.getElementById('addOptionBtn'),
    createPollBtn: document.getElementById('createPollBtn'),
    pollsList: document.getElementById('pollsList'),
  };

  // Utilities
  function uid(){
    return 'p_' + Math.random().toString(36).slice(2,8) + Date.now().toString(36);
  }
  function loadPolls(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  }
  function savePolls(polls){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(polls));
  }
  function loadVotes(){
    try { return JSON.parse(localStorage.getItem(VOTES_KEY) || '{}'); } catch { return {}; }
  }
  function saveVotes(votes){
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function fmtTime(ms){
    if(ms <= 0) return 'Ended';
    const s = Math.floor(ms/1000);
    const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60);
    if(d>0) return `${d}d ${h}h ${m}m`;
    if(h>0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  // Form - dynamic options
  function addOptionInput(value=''){
    const row = document.createElement('div');
    row.className = 'option-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Option';
    input.value = value;
    input.maxLength = 80;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn ghost small';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', ()=>{
      row.remove();
      ensureAtLeastTwo();
    });
    row.appendChild(input);
    row.appendChild(removeBtn);
    el.optionsList.appendChild(row);
  }
  function ensureAtLeastTwo(){
    const count = el.optionsList.querySelectorAll('input[type="text"]').length;
    el.createPollBtn.disabled = count < 2;
  }
  function collectOptions(){
    const vals = Array.from(el.optionsList.querySelectorAll('input[type="text"]'))
      .map(i => i.value.trim()).filter(Boolean);
    // limit to 6 options
    return vals.slice(0,6);
  }

  // Poll CRUD
  function createPoll(){
    const question = el.question.value.trim();
    const description = el.description.value.trim();
    const options = collectOptions();
    if(!question || options.length < 2) return;
    const now = Date.now();
    const poll = {
      id: uid(),
      question,
      description,
      options: options.map((text, idx) => ({ id: 'o'+idx, text, votes: 0 })),
      createdAt: now,
      endsAt: now + DAY_MS,
    };
    const polls = loadPolls();
    polls.unshift(poll);
    savePolls(polls);
    resetForm();
    render();
  }
  function resetForm(){
    el.question.value='';
    el.description.value='';
    el.optionsList.innerHTML='';
    addOptionInput('Yes');
    addOptionInput('No');
    ensureAtLeastTwo();
  }

  function vote(pollId, optionId){
    const polls = loadPolls();
    const poll = polls.find(p=>p.id===pollId);
    if(!poll) return;
    const now = Date.now();
    const ended = now >= poll.endsAt;
    if(ended) return;

    const votes = loadVotes();
    if(votes[pollId]) return; // already voted on this device

    const opt = poll.options.find(o=>o.id===optionId);
    if(!opt) return;
    opt.votes += 1;
    votes[pollId] = optionId;
    saveVotes(votes);
    savePolls(polls);
    render();
  }

  // Rendering
  function render(){
    const polls = loadPolls();
    const votes = loadVotes();
    el.pollsList.innerHTML = '';
    if(polls.length === 0){
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No polls yet. Create your first poll above!';
      el.pollsList.appendChild(empty);
      return;
    }

    for(const poll of polls){
      const now = Date.now();
      const ended = now >= poll.endsAt;
      const total = poll.options.reduce((s,o)=>s+o.votes,0) || 0;

      const card = document.createElement('div');
      card.className = 'poll-card';

      const header = document.createElement('div');
      header.className = 'poll-header';
      const status = document.createElement('span');
      status.className = 'status badge ' + (ended ? 'ended' : 'active');
      status.textContent = ended ? 'Ended' : 'Active';
      const countdown = document.createElement('span');
      countdown.className = 'countdown';
      countdown.textContent = ended ? 'Ended' : ('Ends in ' + fmtTime(poll.endsAt - now));
      header.appendChild(status);
      header.appendChild(countdown);

      const q = document.createElement('div');
      q.className = 'question';
      q.textContent = poll.question;

      const d = document.createElement('div');
      d.className = 'desc';
      d.textContent = poll.description || '';

      const optionsEl = document.createElement('div');
      optionsEl.className = 'options';

      for(const opt of poll.options){
        const row = document.createElement('div');
        row.className = 'option-row';

        const label = document.createElement('div');
        label.className = 'option-label';
        label.textContent = opt.text;

        if(ended){
          const pct = total === 0 ? 0 : Math.round((opt.votes/total)*100);
          const progress = document.createElement('div');
          progress.className = 'progress';
          const bar = document.createElement('div');
          bar.className = 'bar';
          bar.style.width = pct + '%';
          progress.appendChild(bar);

          const pctLabel = document.createElement('div');
          pctLabel.style.minWidth = '36px';
          pctLabel.style.textAlign = 'right';
          pctLabel.textContent = pct + '%';

          row.appendChild(label);
          row.appendChild(progress);
          row.appendChild(pctLabel);
        } else {
          const alreadyVoted = !!votes[poll.id];
          const voteBtn = document.createElement('button');
          voteBtn.className = 'btn small ' + (alreadyVoted ? 'ghost' : 'primary');
          voteBtn.textContent = alreadyVoted ? 'Voted' : 'Vote';
          voteBtn.disabled = alreadyVoted;
          voteBtn.addEventListener('click', ()=> vote(poll.id, opt.id));
          row.appendChild(label);
          row.appendChild(voteBtn);
        }

        optionsEl.appendChild(row);
      }

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `<span>${new Date(poll.createdAt).toLocaleString()}</span><span>Total votes: ${total}</span>`;

      card.appendChild(header);
      card.appendChild(q);
      if(poll.description) card.appendChild(d);
      card.appendChild(optionsEl);
      card.appendChild(meta);
      el.pollsList.appendChild(card);
    }
  }

  function tick(){
    // Update countdown text efficiently without full re-render
    const polls = loadPolls();
    const cards = el.pollsList.querySelectorAll('.poll-card');
    const now = Date.now();
    cards.forEach((card, idx)=>{
      const poll = polls[idx];
      if(!poll) return;
      const countdown = card.querySelector('.countdown');
      const status = card.querySelector('.status');
      const ended = now >= poll.endsAt;
      if(ended){
        if(!status.classList.contains('ended')){
          // Re-render to swap vote buttons with results
          render();
        } else {
          countdown.textContent = 'Ended';
        }
      } else {
        countdown.textContent = 'Ends in ' + fmtTime(poll.endsAt - now);
      }
    });
  }

  // Wire up
  el.addOptionBtn.addEventListener('click', ()=>{
    if(el.optionsList.querySelectorAll('input[type="text"]').length >= 6) return;
    addOptionInput('');
    ensureAtLeastTwo();
  });
  el.createPollBtn.addEventListener('click', createPoll);

  // Initial form state
  resetForm();
  // Initial render
  render();
  // Countdown updates
  setInterval(tick, 30 * 1000);
})();
