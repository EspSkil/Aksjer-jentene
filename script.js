const DATA_URL = 'data/data.json';
let DATA = null;
let currentPerson = 'Elise';

const $ = id => document.getElementById(id);
const nok = n => new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK',maximumFractionDigits:0}).format(Number(n)||0);
const num = (n,d=2) => Number.isFinite(Number(n)) ? new Intl.NumberFormat('nb-NO',{minimumFractionDigits:d,maximumFractionDigits:d}).format(Number(n)) : '–';
const pct = n => Number.isFinite(Number(n)) ? new Intl.NumberFormat('nb-NO',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1}).format(Number(n)) : '–';

async function init(){
  try{
    const r = await fetch(DATA_URL + '?v=' + Date.now(), {cache:'no-store'});
    if(!r.ok) throw new Error('Kunne ikke hente data.json');
    DATA = await r.json();
    bindUI();
    render();
  }catch(e){
    document.querySelector('.loading').innerHTML = `<strong>Kunne ikke hente data</strong><span>${e.message}</span>`;
  }
}

function bindUI(){
  document.querySelectorAll('.profile').forEach(btn=>btn.addEventListener('click',()=>{
    currentPerson=btn.dataset.person;
    document.querySelectorAll('.profile').forEach(b=>b.classList.toggle('active',b===btn));
    render();
  }));
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b===btn));
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    $('page-'+btn.dataset.page).classList.add('active');
    $('pageTitle').textContent = btn.dataset.page==='home' ? 'Min portefølje' : btn.dataset.page==='stock' ? 'Aksjen min' : 'Selskapet';
    window.scrollTo({top:0,behavior:'smooth'});
  }));
  $('loading').classList.add('hidden');
}

function render(){
  const p = DATA.portfolio?.[currentPerson] || {};
  const hasStock = !!p.ticker && Number(p.shares)>0;
  $('totalValue').textContent=nok(p.totalValueNOK);
  $('stockValue').textContent=nok(p.stockValueNOK);
  $('fundValue').textContent=nok(p.fundValueNOK);
  $('cashValue').textContent=nok(p.cashNOK);
  $('stockSub').textContent=hasStock ? `${num(p.shares,0)} aksjer` : 'ingen aksje ennå';
  $('updated').textContent='Oppdatert\n'+formatDateTime(DATA.meta?.updated);
  renderAllocation(p);

  $('companyName').textContent=hasStock ? (p.company||p.ticker) : 'Ingen aksje valgt';
  $('companyPageTitle').textContent=hasStock ? (p.company||p.ticker) : 'Forstå selskapet';
  $('stockPageTitle').textContent=hasStock ? `${p.company||p.ticker}` : 'Aksjen min';
  $('ticker').textContent=p.ticker||'–'; $('ticker2').textContent=p.ticker||'–';
  $('shares').textContent=hasStock?num(p.shares,0):'–';

  const latest=DATA.market?.latest||{};
  $('priceLocal').textContent=hasStock ? `$ ${num(latest.mcdUSD)}` : '–';
  $('priceNok').textContent=hasStock ? nok(latest.mcdNOK) : '–';
  $('lastUsd').textContent=hasStock ? `$ ${num(latest.mcdUSD)}` : '–';
  $('fx').textContent=hasStock ? num(latest.usdNok,4) : '–';
  $('latestMarketDate').textContent=formatDate(latest.date);

  $('stockCard').style.display=hasStock?'block':'none';
  $('purchaseCard').style.display=hasStock?'block':'none';
  $('noStock').style.display=hasStock?'none':'block';

  if(hasStock){
    const hist=(DATA.market?.history||[]).filter(x=>Number.isFinite(Number(x.mcdUSD)));
    drawChart('miniChart',hist.map(x=>Number(x.mcdUSD)));
    drawChart('priceChart',hist.map(x=>Number(x.mcdUSD)));
    if(hist.length){$('chartStart').textContent=formatDate(hist[0].date);$('chartEnd').textContent=formatDate(hist.at(-1).date)}
    renderPurchase(p.ticker);
    renderValuation();
    $('lessonTitle').textContent='Hva eier du egentlig?';
    $('lessonText').textContent=`Som eier av ${p.company||p.ticker} følger du både selskapet, aksjekursen og valutaen. Alle tre kan påvirke verdien i norske kroner.`;
  }else{
    clearCompanyMetrics();
    $('lessonTitle').textContent='Kapital kan jobbe på flere måter';
    $('lessonText').textContent='Mens du venter på å velge aksje, står pengene i fond og kontanter. Det er også en del av porteføljen – og av investeringsvalget.';
  }
}

function renderAllocation(p){
  const total=Number(p.totalValueNOK)||1;
  const vals=[['stock',Number(p.stockValueNOK)||0],['fund',Number(p.fundValueNOK)||0],['cash',Number(p.cashNOK)||0]];
  $('allocationBar').innerHTML=vals.map(([c,v])=>`<span class="${c}" style="width:${Math.max(0,v/total*100)}%"></span>`).join('');
}

function renderPurchase(ticker){
  const tx=(DATA.transactions||[]).filter(x=>String(pick(x,['Ticker','ticker'])).trim()===ticker);
  const buy=tx.find(x=>String(pick(x,['Type','type'])).toLowerCase().includes('kjøp'));
  if(!buy){$('purchaseDetails').innerHTML='<div class="detail-row"><span>Kjøp</span><strong>Ingen registrert handel</strong></div>';return}
  const rows=[
    ['Dato',formatDate(pick(buy,['Dato','dato']))],
    ['Antall',num(pick(buy,['Antall','antall']),0)],
    ['Kurs',`$ ${num(pick(buy,['Kurs lokal','kurs lokal']))}`],
    ['USD/NOK',num(pick(buy,['USD/NOK','usd/nok']),2)],
    ['Kjøpsverdi',nok(pick(buy,['Kjøpsverdi NOK','kjøpsverdi nok']))],
    ['Gebyr',nok(pick(buy,['Gebyr NOK','gebyr nok']))]
  ];
  $('purchaseDetails').innerHTML=rows.map(r=>`<div class="detail-row"><span>${r[0]}</span><strong>${r[1]}</strong></div>`).join('');
}

function renderValuation(){
  const rows=DATA.valuation||[];
  const get=(label)=>{
    const row=rows.find(o=>Object.values(o).some(v=>String(v).trim().toLowerCase()===label.toLowerCase()));
    if(!row)return null;
    const keys=Object.keys(row);
    return row[keys.find(k=>k.toLowerCase().includes('mcdonald'))||keys[1]];
  };
  const pe=get('P/E TTM'), eps=get('EPS TTM'), rev=get('Revenue growth latest qtr'), margin=get('Operating margin');
  $('peMetric').textContent=Number.isFinite(Number(pe))?num(pe,1)+'x':'–';
  $('epsMetric').textContent=Number.isFinite(Number(eps))?'$ '+num(eps,2):'–';
  $('revGrowthMetric').textContent=Number.isFinite(Number(rev))?pct(rev):'–';
  $('marginMetric').textContent=Number.isFinite(Number(margin))?pct(margin):'–';
}

function clearCompanyMetrics(){['peMetric','epsMetric','revGrowthMetric','marginMetric'].forEach(id=>$(id).textContent='–')}

function pick(obj,names){
  for(const name of names){if(obj && Object.prototype.hasOwnProperty.call(obj,name)) return obj[name]}
  return null;
}

function drawChart(id,values){
  const svg=$(id); if(!svg||values.length<2){if(svg)svg.innerHTML='';return}
  const w=600,h=id==='priceChart'?300:220,pad=8;
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const pts=values.map((v,i)=>{
    const x=pad+(w-pad*2)*(i/(values.length-1));
    const y=pad+(h-pad*2)*(1-(v-min)/range);
    return [x,y];
  });
  const line=pts.map(p=>p.join(',')).join(' ');
  const area=`${pad},${h-pad} ${line} ${w-pad},${h-pad}`;
  svg.innerHTML=`<polygon class="chart-area" points="${area}"></polygon><polyline class="chart-line" points="${line}"></polyline>`;
}

function formatDate(s){
  if(!s)return '–';
  const d=new Date(String(s).slice(0,10)+'T12:00:00');
  return isNaN(d)?String(s):new Intl.DateTimeFormat('nb-NO',{day:'2-digit',month:'short',year:'numeric'}).format(d);
}
function formatDateTime(s){
  if(!s)return '–';
  const d=new Date(s);
  return isNaN(d)?String(s):new Intl.DateTimeFormat('nb-NO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);
}
init();
