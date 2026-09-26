const DATA_URL='data/data.json';
let DATA=null,currentPerson='Elise',currentRange='YTD',companyMetric='revenue',showSP=false;
const $=id=>document.getElementById(id);
const N=n=>Number(n);
const valid=n=>Number.isFinite(N(n));
const nok=n=>valid(n)?new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK',maximumFractionDigits:0}).format(N(n)):'–';
const num=(n,d=2)=>valid(n)?new Intl.NumberFormat('nb-NO',{minimumFractionDigits:d,maximumFractionDigits:d}).format(N(n)):'–';
const pct=n=>valid(n)?new Intl.NumberFormat('nb-NO',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1,signDisplay:'exceptZero'}).format(N(n)):'–';
const moneyM=n=>valid(n)?'$ '+new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(N(n))+'m':'–';
const sharePct=n=>valid(n)?new Intl.NumberFormat('nb-NO',{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1}).format(N(n)):'–';

async function init(){
  try{
    const r=await fetch(DATA_URL+'?v='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error('Kunne ikke hente data.json');
    DATA=await r.json(); bindUI(); render(); $('loading').classList.add('hidden');
  }catch(e){$('loading').innerHTML=`<strong>Kunne ikke hente data</strong><span>${e.message}</span>`}
}
function bindUI(){
  document.querySelectorAll('.profile').forEach(b=>b.onclick=()=>{currentPerson=b.dataset.person;document.querySelectorAll('.profile').forEach(x=>x.classList.toggle('active',x===b));render()});
  document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));$('page-'+b.dataset.page).classList.add('active');$('pageTitle').textContent=b.dataset.page==='home'?'Min portefølje':b.dataset.page==='stock'?'Aksjen min':'Selskapet';scrollTo({top:0,behavior:'smooth'})});
  document.querySelectorAll('.range-tabs button').forEach(b=>b.onclick=()=>{currentRange=b.dataset.range;document.querySelectorAll('.range-tabs button').forEach(x=>x.classList.toggle('active',x===b));renderStockChart()});
  document.querySelectorAll('.metric-tabs button').forEach(b=>b.onclick=()=>{companyMetric=b.dataset.metric;document.querySelectorAll('.metric-tabs button').forEach(x=>x.classList.toggle('active',x===b));renderCompanyChart()});
  $('spToggle').onchange=e=>{showSP=e.target.checked;renderStockChart()};
  const detailToggle=$('purchaseDetailToggle');
  if(detailToggle) detailToggle.onclick=()=>{
    const d=$('purchaseDetails'),open=d.classList.toggle('open');
    detailToggle.textContent=open?'Skjul kjøpsdetaljer':'Vis kjøpsdetaljer';
  };
}
function render(){
  const p=(DATA.portfolio&&DATA.portfolio[currentPerson])||{}, has=!!p.ticker&&N(p.shares)>0;
  $('totalValue').textContent=nok(p.totalValueNOK);$('stockValue').textContent=nok(p.stockValueNOK);$('fundValue').textContent=nok(p.fundValueNOK);$('cashValue').textContent=nok(p.cashNOK);
  $('stockPct').textContent=sharePct(p.allocation&&p.allocation.stockPct);$('fundPct').textContent=sharePct(p.allocation&&p.allocation.fundPct);$('cashPct').textContent=sharePct(p.allocation&&p.allocation.cashPct);
  $('updated').textContent='Oppdatert\n'+formatDateTime(DATA.meta?.updated); renderAllocation(p);
  const sp=p.stockPerformance,fp=p.fundPerformance;
  setReturn('stockReturnHome',sp?.returnPct,sp?'avkastning':'ingen aksje');
  setReturn('stockReturnBig',sp?.returnPct); $('stockValue2').textContent=nok(p.stockValueNOK);
  setReturn('fundReturnHome',fp?.returnPct,fp?'avkastning':'venter på neste måling');
  $('companyName').textContent=has?(p.company||p.ticker):'Ingen aksje valgt';$('ticker').textContent=p.ticker||'–';
  $('stockPageTitle').textContent=has?(p.company||p.ticker):'Aksjen min';$('companyPageTitle').textContent=has?(p.company||p.ticker):'Forstå selskapet';
  $('homeStockCard').style.display=has?'block':'none';$('stockMainCard').style.display=has?'block':'none';$('purchaseCard').style.display=has?'block':'none';$('noStock').style.display=has?'none':'block';
  renderEarnings();
  if(has){renderStockChart();renderPurchase(p);renderCompany();$('lessonTitle').textContent='Tre ting påvirker investeringen';$('lessonText').textContent=`${p.company||p.ticker} kan endre verdi fordi selskapet utvikler seg, markedet endrer hva det vil betale, og USD/NOK beveger seg.`}
  else{$('lessonTitle').textContent='Å vente er også et valg';$('lessonText').textContent='Pengene står i fond og kontanter til du har valgt et selskap du faktisk ønsker å eie.'}
}
function renderAllocation(p){
  const a=p.allocation||{};$('allocationBar').innerHTML=`<span class="stock" style="width:${(N(a.stockPct)||0)*100}%"></span><span class="fund" style="width:${(N(a.fundPct)||0)*100}%"></span><span class="cash" style="width:${(N(a.cashPct)||0)*100}%"></span>`;
}
function setReturn(id,value,suffix=''){
  const el=$(id);el.classList.remove('positive','negative');if(!valid(value)){el.textContent=suffix||'–';return}
  el.textContent=pct(value)+(suffix?' '+suffix:'');el.classList.add(N(value)>=0?'positive':'negative');
}
function renderEarnings(){
  const d=DATA.meta?.nextEarningsDate;if(!d){$('earningsDate').textContent='Ikke registrert';$('earningsCountdown').textContent='Legges inn i Parameters';return}
  $('earningsDate').textContent=formatDate(d);const today=new Date();today.setHours(0,0,0,0);const target=new Date(d+'T12:00:00');const days=Math.ceil((target-today)/86400000);
  $('earningsCountdown').textContent=days>=0?`${days} dager igjen`:'Rapportdato passert – oppdater Parameters';
}
function renderHomeChart(){
  const hist=(DATA.market?.history||[]).filter(x=>valid(x.mcdUSD));const sliced=hist.slice(Math.max(0,hist.length-130));drawLine('homeChart',sliced,'mcdUSD',[]);
}
function rangeRows(){
  const hist=(DATA.market?.history||[]).filter(x=>x.date&&valid(x.mcdUSD));if(!hist.length)return[];
  const end=new Date(hist[hist.length-1].date+'T12:00:00');let cutoff=null;
  if(currentRange==='1M'){cutoff=new Date(end);cutoff.setMonth(cutoff.getMonth()-1)}
  if(currentRange==='1Y'){cutoff=new Date(end);cutoff.setFullYear(cutoff.getFullYear()-1)}
  if(currentRange==='YTD')cutoff=new Date(end.getFullYear(),0,1);
  return cutoff?hist.filter(x=>new Date(x.date+'T12:00:00')>=cutoff):hist;
}
function renderStockChart(){
  const p=(DATA.portfolio&&DATA.portfolio[currentPerson])||{};if(!p.ticker)return;
  const rows=rangeRows(),latest=DATA.market&&DATA.market.latest||{};$('chartPrice').textContent='$ '+num(latest.mcdUSD);$('lastUsd').textContent='$ '+num(latest.mcdUSD);$('fx').textContent=num(latest.usdNok,4);
  if(rows.length){$('chartStart').textContent=formatDate(rows[0].date);$('chartEnd').textContent=formatDate(rows[rows.length-1].date)}
  const ret=rows.length>1&&N(rows[0].mcdUSD)?N(rows[rows.length-1].mcdUSD)/N(rows[0].mcdUSD)-1:null;setReturn('periodReturn',ret);
  const markers=(DATA.market&&DATA.market.purchaseMarkers||[]).filter(m=>m.person===currentPerson&&m.ticker===p.ticker&&rows.some(r=>r.date===m.date));
  if(showSP){drawCompareChart(rows,markers);const sp=rows.filter(x=>valid(x.sp500));const sr=sp.length>1&&N(sp[0].sp500)?N(sp[sp.length-1].sp500)/N(sp[0].sp500)-1:null;$('comparisonResult').innerHTML='<b>MCD '+pct(ret)+'</b><span>S&amp;P 500 '+pct(sr)+'</span>';$('stockLegend').innerHTML='<span><i class="line-dot"></i>MCD</span><span><i class="sp-dot"></i>S&amp;P 500</span><span><i class="buy-dot"></i>Mitt kjøp</span>'}
  else{drawLine('priceChart',rows,'mcdUSD',markers);$('comparisonResult').innerHTML='';$('stockLegend').innerHTML='<span><i class="line-dot"></i>MCD</span><span><i class="buy-dot"></i>Mitt kjøp</span>'}
  renderMarketChanges();
}
function renderMarketChanges(){
  const h=(DATA.market&&DATA.market.history||[]).filter(x=>x.date);
  function ch(key,days){const a=h.filter(x=>valid(x[key]));if(a.length<2)return null;const last=a[a.length-1],cut=new Date(last.date+'T12:00:00');cut.setDate(cut.getDate()-days);let first=a[0];for(let i=a.length-1;i>=0;i--){if(new Date(a[i].date+'T12:00:00')<=cut){first=a[i];break}}return N(first[key])?N(last[key])/N(first[key])-1:null}
  addChange('lastUsd',ch('mcdUSD',1),ch('mcdUSD',30));addChange('fx',ch('usdNok',1),ch('usdNok',30));
}
function addChange(id,day,month){const box=$(id).parentElement;let e=box.querySelector('.market-change');if(!e){e=document.createElement('div');e.className='market-change';box.appendChild(e)}e.innerHTML='<span class="'+(N(day)>=0?'positive':'negative')+'">'+(N(day)>=0?'▲ ':'▼ ')+pct(Math.abs(N(day)))+' dag</span><span class="'+(N(month)>=0?'positive':'negative')+'">'+(N(month)>=0?'▲ ':'▼ ')+pct(Math.abs(N(month)))+' 1 mnd</span>'}
function drawCompareChart(rows,markers){
  if(rows.length<2)return;const baseM=N(rows[0].mcdUSD),sp=rows.filter(x=>valid(x.sp500)),baseS=sp.length?N(sp[0].sp500):null;
  const rr=rows.map(r=>Object.assign({},r,{mcdP:(N(r.mcdUSD)/baseM-1)*100,spP:baseS&&valid(r.sp500)?(N(r.sp500)/baseS-1)*100:null}));
  const vals=[];rr.forEach(r=>{if(valid(r.mcdP))vals.push(r.mcdP);if(valid(r.spP))vals.push(r.spP)});let lo=Math.floor(Math.min(...vals)/5)*5,hi=Math.ceil(Math.max(...vals)/5)*5;if(lo===hi)hi=lo+5;
  const svg=$('priceChart'),w=700,h=330,L=72,R=18,T=18,B=48,rg=hi-lo,x=i=>L+(w-L-R)*i/(rr.length-1),y=v=>T+(h-T-B)*(1-(v-lo)/rg);let s='';
  for(let i=0;i<5;i++){const v=hi-rg*i/4,Y=y(v);s+=`<line class="grid-line" x1="${L}" y1="${Y}" x2="${w-R}" y2="${Y}"/><text class="axis-label" text-anchor="end" x="${L-9}" y="${Y+5}">${v>0?'+':''}${Math.round(v)}%</text>`}
  const p1=rr.map((r,i)=>x(i)+','+y(r.mcdP)).join(' '),p2=rr.filter(r=>valid(r.spP)).map(r=>x(rr.indexOf(r))+','+y(r.spP)).join(' ');s+=`<polyline class="chart-line" points="${p1}"/><polyline class="sp-line" points="${p2}"/>`;
  for(let i=0;i<5;i++){const n=Math.round((rr.length-1)*i/4);s+=`<text class="axis-label" text-anchor="${i===0?'start':i===4?'end':'middle'}" x="${x(n)}" y="${h-8}">${shortDate(rr[n].date)}</text>`}
  markers.forEach(m=>{const i=rr.findIndex(r=>r.date===m.date);if(i>=0){const X=x(i),Y=y(rr[i].mcdP);s+=`<line class="buy-line" x1="${X}" y1="${T}" x2="${X}" y2="${h-B}"/><circle class="buy-point" cx="${X}" cy="${Y}" r="7"/>`}});
  svg.innerHTML=s;
}
function renderPurchase(p){
  const perf=p.stockPerformance||{};setReturn('purchaseReturn',perf.returnPct);const gain=$('purchaseGain');gain.textContent=nok(perf.gainNOK);gain.classList.remove('positive','negative');if(valid(perf.gainNOK))gain.classList.add(N(perf.gainNOK)>=0?'positive':'negative');
  const buys=(DATA.market?.purchaseMarkers||[]).filter(x=>x.person===currentPerson&&x.ticker===p.ticker);
  if(!buys.length){$('purchaseDetails').innerHTML='<div class="detail"><span>Kjøp</span><strong>Ingen registrert handel</strong></div>';return}
  const b=buys[buys.length-1];const rows=[['Dato',formatDate(b.date)],['Antall',num(b.shares,0)],['Kjøpskurs','$ '+num(b.priceLocal)],['USD/NOK',num(b.fxNOK,2)],['Kjøpsverdi',nok(b.purchaseValueNOK)],['Gebyr',nok(b.feeNOK)],['Kostpris inkl. gebyr',nok(perf.costNOK)]];
  $('purchaseDetails').innerHTML=rows.map(r=>`<div class="detail"><span>${r[0]}</span><strong>${r[1]}</strong></div>`).join('');
}
function renderCompany(){
  const inc=(DATA.financials?.incomeMCD||[]).filter(x=>/^Q\d/.test(x.period));if(!inc.length)return;
  const q=inc[inc.length-1],prev=inc[inc.length-2],yearAgo=inc.length>=5?inc[inc.length-5]:null;
  $('latestQuarter').textContent=q.period;$('companyTicker').textContent=DATA.portfolio?.[currentPerson]?.ticker||'MCD';
  $('revenue').textContent=moneyM(q.revenue);setDelta('revenueGrowth',q.revenueGrowthYoY,'YoY');
  $('opIncome').textContent=moneyM(q.operatingIncome);setDelta('opGrowth',q.operatingIncomeGrowthYoY,'YoY');
  $('eps').textContent='$ '+num(q.eps);setDelta('epsGrowth',q.epsGrowthYoY,'YoY');
  $('margin').textContent=pct(q.operatingMargin);
  const marginYoY=yearAgo&&valid(yearAgo.operatingMargin)?N(q.operatingMargin)-N(yearAgo.operatingMargin):null;
  $('marginChange').textContent=valid(marginYoY)?`${marginYoY>=0?'+':''}${num(marginYoY*100,1)} pp YoY`:'–';
  renderCompanyChart();renderKpi();renderPE();
}
function setDelta(id,v,label){const e=$(id);e.classList.remove('positive','negative');e.textContent=valid(v)?`${pct(v)} ${label}`:'–';if(valid(v))e.classList.add(N(v)>=0?'positive':'negative')}
function renderCompanyChart(){
  const rows=(DATA.financials?.incomeMCD||[]).filter(x=>/^Q\d/.test(x.period)&&valid(x[companyMetric])).slice(-6);drawBars('companyChart',rows,companyMetric);
  $('companyChartStart').textContent=rows[0]?.period||'–';$('companyChartEnd').textContent=rows[rows.length-1]?.period||'–';
}
function renderKpi(){
  const rows=(DATA.kpi?.mcd||[]).filter(x=>/^Q\d/.test(x.period));const q=rows[rows.length-1]||{};
  $('compSales').textContent=pct(q.globalComparableSales);$('usCompSales').textContent=pct(q.usComparableSales);$('loyaltyUsers').textContent=valid(q.loyaltyUsersM)?num(q.loyaltyUsersM,0)+'m':'–';$('loyaltySales').textContent=valid(q.loyaltySalesTtmBn)?'$ '+num(q.loyaltySalesTtmBn,0)+'bn':'–';
}
function renderPE(){
  const rows=(DATA.valuation?.history||[]).filter(x=>valid(x.peTtm));const cur=rows[rows.length-1];$('currentPE').textContent=cur?num(cur.peTtm,1)+'x':'–';drawLine('peChart',rows,'peTtm',[]);
  $('peStart').textContent=rows[0]?formatDate(rows[0].date):'–';$('peEnd').textContent=cur?formatDate(cur.date):'–';
}
function drawLine(id,rows,key,markers=[]){
  const svg=$(id);if(!svg||rows.length<2){if(svg)svg.innerHTML='';return}
  const w=700,h=id==='priceChart'?330:id==='homeChart'?250:250;
  const left=id==='homeChart'?18:72,right=18,top=18,bottom=id==='homeChart'?18:42;
  const vals=rows.map(r=>N(r[key])).filter(Number.isFinite),min0=Math.min(...vals),max0=Math.max(...vals),pad=(max0-min0||Math.abs(max0)||1)*.08;
  const min=min0-pad,max=max0+pad,rg=max-min||1;
  const xy=(r,i)=>[left+(w-left-right)*(i/(rows.length-1)),top+(h-top-bottom)*(1-(N(r[key])-min)/rg)];
  const pts=rows.map(xy),line=pts.map(a=>a.join(',')).join(' '),area=`${left},${h-bottom} ${line} ${w-right},${h-bottom}`;
  let html='';
  const showAxes=id!=='homeChart';
  if(showAxes){
    for(let i=0;i<4;i++){
      const v=max-(rg*i/3),y=top+(h-top-bottom)*(i/3);
      html+=`<line class="grid-line" x1="${left}" y1="${y}" x2="${w-right}" y2="${y}"/>`;
      html+=`<text class="axis-label" text-anchor="end" x="${left-9}" y="${y+5}">${axisValue(key,v)}</text>`;
    }
  } else html+=`<line class="grid-line" x1="${left}" y1="${h/2}" x2="${w-right}" y2="${h/2}"/>`;
  html+=`<polygon class="chart-area" points="${area}"/><polyline class="chart-line" points="${line}"/>`;
  markers.forEach(m=>{const i=rows.findIndex(r=>r.date===m.date);if(i<0)return;const [x,y]=pts[i];html+=`<line class="buy-line" x1="${x}" y1="${top}" x2="${x}" y2="${h-bottom}"/><circle class="buy-point" cx="${x}" cy="${y}" r="7"/><text class="buy-label" x="${Math.min(x+9,w-90)}" y="${Math.max(y-12,25)}">Kjøp</text>`});
  if(showAxes){
    const idx=[0,Math.round((rows.length-1)*.25),Math.round((rows.length-1)*.5),Math.round((rows.length-1)*.75),rows.length-1];
    idx.forEach((n,i)=>{const x=xy(rows[n],n)[0];html+=`<text class="axis-label" text-anchor="${i===0?'start':i===idx.length-1?'end':'middle'}" x="${x}" y="${h-8}">${shortDate(rows[n].date)}</text>`});
  }
  svg.innerHTML=html;
}
function axisValue(key,v){
  if(key==='mcdUSD')return '$'+Math.round(v);
  if(key==='peTtm')return num(v,1)+'x';
  return num(v,1);
}
function shortDate(s){
  const d=new Date(String(s).slice(0,10)+'T12:00:00');
  return isNaN(d)?String(s):new Intl.DateTimeFormat('nb-NO',{month:'short',year:'2-digit'}).format(d);
}
function drawBars(id,rows,key){
  const svg=$(id);if(!svg||!rows.length){if(svg)svg.innerHTML='';return}
  const w=700,h=280,left=70,right=18,top=24,bottom=48;
  const vals=rows.map(r=>N(r[key])).filter(Number.isFinite),max0=Math.max(...vals),min0=Math.min(0,...vals),pad=(max0-min0||1)*.10,max=max0+pad,min=min0,rg=max-min||1;
  const plotH=h-top-bottom,gap=(w-left-right)/rows.length,bw=gap*.58;
  let html='';
  for(let i=0;i<4;i++){
    const v=max-(rg*i/3),y=top+plotH*(i/3);
    html+=`<line class="grid-line" x1="${left}" y1="${y}" x2="${w-right}" y2="${y}"/>`;
    html+=`<text class="axis-label" text-anchor="end" x="${left-9}" y="${y+5}">${barValue(key,v)}</text>`;
  }
  rows.forEach((r,i)=>{
    const v=N(r[key]),baseY=top+plotH*(max-0)/rg,y=top+plotH*(max-v)/rg,bh=Math.abs(baseY-y),x=left+i*gap+(gap-bw)/2;
    const topY=Math.min(y,baseY);
    html+=`<rect x="${x}" y="${topY}" width="${bw}" height="${Math.max(bh,2)}" rx="7" fill="rgba(41,77,143,.72)"/>`;
    html+=`<text class="bar-value" text-anchor="middle" x="${x+bw/2}" y="${Math.max(topY-8,14)}">${barValue(key,v)}</text>`;
    html+=`<text class="axis-label" text-anchor="middle" x="${x+bw/2}" y="${h-13}">${r.period.replace(' 20','’')}</text>`;
    if(i>0){
      const prev=N(rows[i-1][key]);
      if(valid(prev)&&prev!==0){
        const ch=(v/prev)-1;
        html+=`<text class="bar-change ${ch>=0?'svg-positive':'svg-negative'}" text-anchor="middle" x="${x+bw/2}" y="${Math.max(topY-9,32)}">${ch>=0?'▲':'▼'} ${Math.abs(ch*100).toFixed(1).replace('.',',')}%</text>`;
      }
    }
  });
  svg.innerHTML=html;
}
function barValue(key,v){
  if(key==='revenue')return '$'+(v/1000).toFixed(1).replace('.',',')+'bn';
  if(key==='eps')return '$'+num(v,2);
  if(key==='operatingMargin')return (v*100).toFixed(1).replace('.',',')+'%';
  return num(v,1);
}
function formatDate(s){if(!s)return'–';const d=new Date(String(s).slice(0,10)+'T12:00:00');return isNaN(d)?String(s):new Intl.DateTimeFormat('nb-NO',{day:'2-digit',month:'short',year:'numeric'}).format(d)}
function formatDateTime(s){if(!s)return'–';const d=new Date(s);return isNaN(d)?String(s):new Intl.DateTimeFormat('nb-NO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d)}
init();
