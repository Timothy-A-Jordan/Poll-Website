/* QuickPolls app logic */
(function(){
  const STORAGE_KEY = 'quickpolls.polls.v1';
  const VOTES_KEY = 'quickpolls.votes.v1'; // map of { [pollId]: optionId }
  const REACTIONS_KEY = 'quickpolls.reactions.v1'; // map of { [pollId]: {up,down,shares,comments,myVote} }
  const FAKE_USERS_KEY = 'quickpolls.fake.users.v1';
  const FAKE_INTERESTED_KEY = 'quickpolls.fake.interested.v1';
  const FAKE_FOLLOWING_KEY = 'quickpolls.fake.following.v1'; // map of { [userId]: Poll[] }
  const DAY_MS = 24 * 60 * 60 * 1000;

  const el = {
    question: document.getElementById('question'),
    description: document.getElementById('description'),
    optionsList: document.getElementById('options-list'),
    addOptionBtn: document.getElementById('addOptionBtn'),
    createPollBtn: document.getElementById('createPollBtn'),
    pollsList: document.getElementById('pollsList'),
    storiesBar: document.getElementById('storiesBar'),
    interestedList: document.getElementById('interestedList'),
    storyModal: document.getElementById('storyModal'),
    storyContent: document.getElementById('storyContent'),
    storyClose: document.getElementById('storyClose'),
    storyTitle: document.getElementById('storyTitle'),
    // Sidebar elements
    navToggle: document.getElementById('navToggle'),
    navClose: document.getElementById('navClose'),
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  };

  // Utilities
  function uid(prefix='p_'){
    return prefix + Math.random().toString(36).slice(2,8) + Date.now().toString(36);
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
  function loadReactions(){
    try { return JSON.parse(localStorage.getItem(REACTIONS_KEY) || '{}'); } catch { return {}; }
  }
  function saveReactions(reac){ localStorage.setItem(REACTIONS_KEY, JSON.stringify(reac)); }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function fmtTime(ms){
    if(ms <= 0) return 'Ended';
    const s = Math.floor(ms/1000);
    const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60);
    if(d>0) return `${d}d ${h}h ${m}m`;
    if(h>0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  // Fake data seeding (for testing)
  function seedFake(){
    if(!localStorage.getItem(FAKE_USERS_KEY)){
      const users = [
        { id:'u_al', name:'Alice', color:'#f472b6' },
        { id:'u_be', name:'Ben', color:'#60a5fa' },
        { id:'u_ca', name:'Cara', color:'#34d399' },
        { id:'u_de', name:'Dev', color:'#f59e0b' },
        { id:'u_el', name:'Eli', color:'#a78bfa' },
      ];
      localStorage.setItem(FAKE_USERS_KEY, JSON.stringify(users));
    }
    if(!localStorage.getItem(FAKE_INTERESTED_KEY)){
      const now = Date.now();
      const interested = [
        { id: uid('f_'), question:'Best JS build tool in 2025?', description:'Curious what folks use now', options:['Vite','Rspack','Turbopack','Parcel'].map((t,i)=>({id:'o'+i,text:t,votes:Math.floor(Math.random()*20)})), createdAt: now-3*60*60*1000, endsAt: now + 20*60*60*1000 },
        { id: uid('f_'), question:'Dark mode by default?', description:'Enable on first load?', options:['Yes','No'].map((t,i)=>({id:'o'+i,text:t,votes:Math.floor(Math.random()*10)})), createdAt: now-5*60*60*1000, endsAt: now + 10*60*60*1000 },
        { id: uid('f_'), question:'Favorite DB for side projects?', description:'', options:['SQLite','Postgres','MongoDB','DuckDB'].map((t,i)=>({id:'o'+i,text:t,votes:Math.floor(Math.random()*30)})), createdAt: now-1*60*60*1000, endsAt: now + 30*60*60*1000 },
        { id: uid('f_'), question:'Ship with CI or manual?', description:'', options:['CI','Manual'].map((t,i)=>({id:'o'+i,text:t,votes:Math.floor(Math.random()*15)})), createdAt: now-9*60*60*1000, endsAt: now + 5*60*60*1000 },
      ];
      localStorage.setItem(FAKE_INTERESTED_KEY, JSON.stringify(interested));
    }
    if(!localStorage.getItem(FAKE_FOLLOWING_KEY)){
      const users = JSON.parse(localStorage.getItem(FAKE_USERS_KEY));
      const now = Date.now();
      const map = {};
      for(const u of users){
        map[u.id] = [
          { id: uid('s_'), question:`${u.name}'s latest tool?`, description:'', options:['Tool A','Tool B','Tool C'].map((t,i)=>({id:'o'+i,text:t,votes:Math.floor(Math.random()*12)})), createdAt: now - Math.floor(Math.random()*6)*60*60*1000, endsAt: now + Math.floor(Math.random()*24)*60*60*1000 },
          { id: uid('s_'), question:`${u.name} prefers tabs or spaces?`, description:'Age-old.', options:['Tabs','Spaces'].map((t,i)=>({id:'o'+i,text:t,votes:Math.floor(Math.random()*12)})), createdAt: now - Math.floor(Math.random()*24)*60*60*1000, endsAt: now + Math.floor(Math.random()*10)*60*60*1000 },
        ];
      }
      localStorage.setItem(FAKE_FOLLOWING_KEY, JSON.stringify(map));
    }
  }
  function getFakeUsers(){ try { return JSON.parse(localStorage.getItem(FAKE_USERS_KEY)||'[]'); } catch { return []; } }
  function getInterested(){ try { return JSON.parse(localStorage.getItem(FAKE_INTERESTED_KEY)||'[]'); } catch { return []; } }
  function getFollowingMap(){ try { return JSON.parse(localStorage.getItem(FAKE_FOLLOWING_KEY)||'{}'); } catch { return {}; } }

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
    if(el.createPollBtn) el.createPollBtn.disabled = count < 2;
  }
  function collectOptions(){
    const vals = Array.from(el.optionsList.querySelectorAll('input[type="text"]'))
      .map(i => i.value.trim()).filter(Boolean);
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
      id: uid('p_'),
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
    if(!el.question) return;
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

  // Reactions (fake)
  function getReaction(pollId){
    const r = loadReactions();
    if(!r[pollId]) r[pollId] = { up:0, down:0, shares:0, comments:0, myVote:0 };
    return r[pollId];
  }
  function setReaction(pollId, data){
    const r = loadReactions(); r[pollId] = data; saveReactions(r);
  }
  function buildActionsRow(pollId){
    const row = document.createElement('div');
    row.className = 'actions-row';
    const rec = getReaction(pollId);
    const up = document.createElement('button'); up.className='icon-btn'+(rec.myVote===1?' selected':''); up.textContent = `▲ ${rec.up}`;
    const down = document.createElement('button'); down.className='icon-btn'+(rec.myVote===-1?' selected':''); down.textContent = `▼ ${rec.down}`;
    const comment = document.createElement('button'); comment.className='icon-btn'; comment.textContent = `💬 ${rec.comments}`;
    const share = document.createElement('button'); share.className='icon-btn'; share.textContent = `↗ ${rec.shares}`;
    up.addEventListener('click', ()=>{
      const r = getReaction(pollId);
      if(r.myVote===1){ r.myVote=0; r.up = clamp(r.up-1,0,1e9);} else { if(r.myVote===-1){ r.down = clamp(r.down-1,0,1e9);} r.myVote=1; r.up++; }
      setReaction(pollId,r); rerenderAll();
    });
    down.addEventListener('click', ()=>{
      const r = getReaction(pollId);
      if(r.myVote===-1){ r.myVote=0; r.down = clamp(r.down-1,0,1e9);} else { if(r.myVote===1){ r.up = clamp(r.up-1,0,1e9);} r.myVote=-1; r.down++; }
      setReaction(pollId,r); rerenderAll();
    });
    comment.addEventListener('click', ()=>{ const r=getReaction(pollId); r.comments++; setReaction(pollId,r); rerenderAll(); });
    share.addEventListener('click', ()=>{ const r=getReaction(pollId); r.shares++; setReaction(pollId,r); rerenderAll(); });
    row.appendChild(up); row.appendChild(down); row.appendChild(comment); row.appendChild(share);
    return row;
  }

  // Rendering - main polls
  function render(){
    if(!el.pollsList) return;
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
      card.appendChild(buildActionsRow(poll.id));
      el.pollsList.appendChild(card);
    }
  }

  // Rendering - interested (fake)
  function renderInterested(){
    if(!el.interestedList) return;
    const polls = getInterested();
    el.interestedList.innerHTML = '';
    if(polls.length===0){
      const empty = document.createElement('div'); empty.className='empty'; empty.textContent='No recommendations right now.'; el.interestedList.appendChild(empty); return;
    }
    for(const poll of polls){
      const now = Date.now();
      const ended = now >= poll.endsAt;
      const total = poll.options.reduce((s,o)=>s+o.votes,0) || 0;
      const card = document.createElement('div'); card.className='poll-card';
      const header = document.createElement('div'); header.className='poll-header';
      const status = document.createElement('span'); status.className='status badge ' + (ended?'ended':'active'); status.textContent = ended? 'Ended':'Active';
      const countdown = document.createElement('span'); countdown.className='countdown'; countdown.textContent = ended? 'Ended' : ('Ends in ' + fmtTime(poll.endsAt - now));
      header.appendChild(status); header.appendChild(countdown);
      const q = document.createElement('div'); q.className='question'; q.textContent=poll.question;
      const d = document.createElement('div'); d.className='desc'; d.textContent=poll.description||'';
      const optionsEl = document.createElement('div'); optionsEl.className='options';
      for(const opt of poll.options){
        const row = document.createElement('div'); row.className='option-row';
        const label = document.createElement('div'); label.className='option-label'; label.textContent=opt.text;
        if(ended){
          const pct = total === 0 ? 0 : Math.round((opt.votes/total)*100);
          const progress = document.createElement('div'); progress.className='progress';
          const bar = document.createElement('div'); bar.className='bar'; bar.style.width = pct + '%'; progress.appendChild(bar);
          const pctLabel = document.createElement('div'); pctLabel.style.minWidth='36px'; pctLabel.style.textAlign='right'; pctLabel.textContent=pct + '%';
          row.appendChild(label); row.appendChild(progress); row.appendChild(pctLabel);
        } else {
          const dummy = document.createElement('div'); dummy.style.color = 'var(--subtle)'; dummy.style.fontSize='12px'; dummy.textContent = 'Tap to view';
          row.appendChild(label); row.appendChild(dummy);
        }
        optionsEl.appendChild(row);
      }
      const meta = document.createElement('div'); meta.className='meta'; meta.innerHTML = `<span>Recommended</span><span>Total votes: ${total}</span>`;
      card.appendChild(header); card.appendChild(q); if(poll.description) card.appendChild(d); card.appendChild(optionsEl); card.appendChild(meta);
      card.appendChild(buildActionsRow(poll.id));
      el.interestedList.appendChild(card);
    }
  }

  // Stories UI (fake)
  function renderStoriesBar(){
    if(!el.storiesBar) return;
    const users = getFakeUsers();
    el.storiesBar.innerHTML='';
    for(const u of users){
      const s = document.createElement('div'); s.className='story';
      const a = document.createElement('div'); a.className='avatar'; a.style.borderColor=u.color; a.style.color=u.color;
      const ai = document.createElement('div'); ai.className='avatar-initial'; ai.textContent = u.name.charAt(0).toUpperCase();
      a.appendChild(ai);
      const name = document.createElement('div'); name.className='story-name'; name.textContent=u.name;
      s.appendChild(a); s.appendChild(name);
      s.addEventListener('click', ()=> openStory(u));
      el.storiesBar.appendChild(s);
    }
  }
  function openStory(user){
    const map = getFollowingMap();
    const list = map[user.id] || [];
    el.storyTitle.textContent = `${user.name}'s polls`;
    el.storyContent.innerHTML='';
    for(const poll of list){
      const now = Date.now();
      const ended = now >= poll.endsAt;
      const total = poll.options.reduce((s,o)=>s+o.votes,0) || 0;
      const card = document.createElement('div'); card.className='poll-card';
      const header = document.createElement('div'); header.className='poll-header';
      const status = document.createElement('span'); status.className='status badge ' + (ended ? 'ended':'active'); status.textContent = ended? 'Ended':'Active';
      const countdown = document.createElement('span'); countdown.className='countdown'; countdown.textContent = ended? 'Ended' : ('Ends in ' + fmtTime(poll.endsAt - now));
      header.appendChild(status); header.appendChild(countdown);
      const q = document.createElement('div'); q.className='question'; q.textContent=poll.question;
      const optionsEl = document.createElement('div'); optionsEl.className='options';
      for(const opt of poll.options){
        const row = document.createElement('div'); row.className='option-row';
        const label = document.createElement('div'); label.className='option-label'; label.textContent=opt.text;
        const pct = total === 0 ? 0 : Math.round((opt.votes/total)*100);
        const progress = document.createElement('div'); progress.className='progress';
        const bar = document.createElement('div'); bar.className='bar'; bar.style.width = pct + '%'; progress.appendChild(bar);
        const pctLabel = document.createElement('div'); pctLabel.style.minWidth='36px'; pctLabel.style.textAlign='right'; pctLabel.textContent=pct + '%';
        row.appendChild(label); row.appendChild(progress); row.appendChild(pctLabel);
        optionsEl.appendChild(row);
      }
      const meta = document.createElement('div'); meta.className='meta'; meta.innerHTML = `<span>By ${user.name}</span><span>Total votes: ${total}</span>`;
      card.appendChild(header); card.appendChild(q); card.appendChild(optionsEl); card.appendChild(meta);
      card.appendChild(buildActionsRow(poll.id));
      el.storyContent.appendChild(card);
    }
    el.storyModal.classList.add('open');
    el.storyModal.setAttribute('aria-hidden','false');
  }
  function closeStory(){
    el.storyModal.classList.remove('open');
    el.storyModal.setAttribute('aria-hidden','true');
  }

  function tick(){
    // Update countdowns in main list
    if(!el.pollsList) return;
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
        if(!status.classList.contains('ended')){ render(); } else { countdown.textContent = 'Ended'; }
      } else {
        countdown.textContent = 'Ends in ' + fmtTime(poll.endsAt - now);
      }
    });
    // Update interested list
    if(el.interestedList){
      const ipolls = getInterested();
      const icards = el.interestedList.querySelectorAll('.poll-card');
      icards.forEach((card, idx)=>{
        const poll = ipolls[idx]; if(!poll) return; const countdown = card.querySelector('.countdown'); const now2=Date.now(); const ended = now2 >= poll.endsAt; countdown.textContent = ended? 'Ended' : ('Ends in ' + fmtTime(poll.endsAt - now2));
      });
    }
  }
  function rerenderAll(){ render(); renderInterested(); }

  // Sidebar interactions
  function openSidebar(){ if(!el.sidebar) return; el.sidebar.classList.add('open'); el.sidebar.setAttribute('aria-hidden','false'); if(el.sidebarBackdrop){ el.sidebarBackdrop.classList.add('open'); el.sidebarBackdrop.setAttribute('aria-hidden','false'); } }
  function closeSidebar(){ if(!el.sidebar) return; el.sidebar.classList.remove('open'); el.sidebar.setAttribute('aria-hidden','true'); if(el.sidebarBackdrop){ el.sidebarBackdrop.classList.remove('open'); el.sidebarBackdrop.setAttribute('aria-hidden','true'); } }
  if(el.navToggle) el.navToggle.addEventListener('click', openSidebar);
  if(el.navClose) el.navClose.addEventListener('click', closeSidebar);
  if(el.sidebarBackdrop) el.sidebarBackdrop.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeSidebar(); });
  // Close sidebar when clicking a nav link
  if(el.sidebar){ el.sidebar.querySelectorAll('.nav-link').forEach(a=> a.addEventListener('click', closeSidebar)); }

  // Wire up
  if(el.addOptionBtn) el.addOptionBtn.addEventListener('click', ()=>{
    if(el.optionsList.querySelectorAll('input[type="text"]').length >= 6) return;
    addOptionInput('');
    ensureAtLeastTwo();
  });
  if(el.createPollBtn) el.createPollBtn.addEventListener('click', createPoll);
  if(el.storyClose) el.storyClose.addEventListener('click', closeStory);
  if(el.storyModal) el.storyModal.addEventListener('click', (e)=>{ if(e.target===el.storyModal) closeStory(); });

  // Initial state
  seedFake();
  resetForm();
  renderStoriesBar();
  renderInterested();
  render();
  setInterval(tick, 30 * 1000);
})();
