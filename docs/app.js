/* Sarf — offline money exchange. All logic runs client-side.
   Model: every rate is "units of currency per 1 USD" (USD is the base). */

const CURRENCIES = [
  { code: "USD",  flag: "$",    en: "US Dollar",            ar: "دولار أمريكي",        base: true,  def: 1 },
  { code: "SAR",  flag: "﷼",    en: "Saudi Riyal",          ar: "ريال سعودي",           def: 3.75 },
  { code: "SYP",  flag: "ل.س",  en: "Syrian Lira (old)",    ar: "ليرة سورية (قديمة)",   def: 13000 },
  { code: "SYPN", flag: "ل.س",  en: "Syrian Lira (new)",    ar: "ليرة سورية (جديدة)",   def: 130 },
];

const I18N = {
  en: {
    appName:"Money Converter", tagline:"Works Offline", offlineReady:"Offline‑ready",
    convert:"Convert", youSend:"You have", youGet:"You get",
    rates:"Exchange Rates", edit:"Edit",
    ratesSub:"Rates are stored on your device. Set them to your market and they work with no internet.",
    lastUpdated:"Last updated", footNote:"All conversions run locally · No data leaves your device",
    editRates:"Edit Rates", editNote:"Enter how many units of each currency equal <b>1 USD</b>.",
    reset:"Reset defaults", save:"Save", base:"base", perUsd:"per 1 USD", never:"not set yet",
  },
  ar: {
    appName:"محوّل العملات", tagline:"يعمل بدون إنترنت", offlineReady:"جاهز بدون إنترنت",
    convert:"تحويل", youSend:"لديك", youGet:"تحصل على",
    rates:"أسعار الصرف", edit:"تعديل",
    ratesSub:"الأسعار محفوظة على جهازك. اضبطها حسب سوقك وتعمل بدون أي إنترنت.",
    lastUpdated:"آخر تحديث", footNote:"كل التحويلات تتم محليًا · لا تغادر بياناتك جهازك",
    editRates:"تعديل الأسعار", editNote:"أدخل كم وحدة من كل عملة تساوي <b>١ دولار</b>.",
    reset:"استعادة الافتراضي", save:"حفظ", base:"أساس", perUsd:"لكل ١ دولار", never:"غير محدد بعد",
  },
};

const STORE = "sarf.rates.v1";
const LANG_KEY = "sarf.lang";
const SEL_KEY = "sarf.selection";

const state = {
  lang: localStorage.getItem(LANG_KEY) || "en",
  rates: loadRates(),
  from: "USD",
  to: "SYP",
  updatedAt: localStorage.getItem(STORE + ".time") || null,
  activeSide: null, // 'from' | 'to' when picker open
};

/* ---------- persistence ---------- */
function loadRates(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORE));
    if(saved && typeof saved === "object") return sanitize(saved);
  }catch(e){}
  return defaults();
}
function defaults(){ const o={}; CURRENCIES.forEach(c=>o[c.code]=c.def); return o; }
function sanitize(obj){
  const o = defaults();
  CURRENCIES.forEach(c=>{ const v=Number(obj[c.code]); if(isFinite(v) && v>0) o[c.code]=v; });
  o.USD = 1;
  return o;
}
function saveRates(){
  localStorage.setItem(STORE, JSON.stringify(state.rates));
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORE + ".time", state.updatedAt);
}

/* ---------- conversion ---------- */
function convert(amount, from, to){
  const rf = state.rates[from], rt = state.rates[to];
  if(!isFinite(amount) || !rf || !rt) return 0;
  return (amount / rf) * rt; // to USD, then to target
}
function meta(code){ return CURRENCIES.find(c=>c.code===code); }
function name(code){ const m=meta(code); return state.lang==="ar"? m.ar : m.en; }

function fmt(n){
  if(!isFinite(n)) return "0";
  const abs=Math.abs(n);
  const dp = abs>=1000?0 : abs>=1?2 : abs>0?4 : 2;
  return n.toLocaleString(state.lang==="ar"?"ar-EG":"en-US",
    { minimumFractionDigits:0, maximumFractionDigits:dp });
}
function fmtRate(n){
  return n.toLocaleString(state.lang==="ar"?"ar-EG":"en-US",
    { minimumFractionDigits:0, maximumFractionDigits: n>=1000?0:2 });
}

/* ---------- i18n / DOM ---------- */
const $ = s => document.querySelector(s);
function t(k){ return I18N[state.lang][k] ?? k; }

function applyLang(){
  const rtl = state.lang==="ar";
  document.documentElement.lang = state.lang;
  document.documentElement.dir = rtl ? "rtl":"ltr";
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k = el.getAttribute("data-i18n");
    if(I18N[state.lang][k]!==undefined) el.innerHTML = I18N[state.lang][k];
  });
  $("#langBtn").textContent = rtl ? "English" : "العربية";
  localStorage.setItem(LANG_KEY, state.lang);
}

function renderPickButtons(){
  const mf=meta(state.from), mt=meta(state.to);
  $("#fromFlag").textContent=mf.flag; $("#fromCode").textContent=mf.code;
  $("#toFlag").textContent=mt.flag;   $("#toCode").textContent=mt.code;
}

function renderRate(){
  const one = convert(1, state.from, state.to);
  $("#rateLine").innerHTML = `1 ${state.from} = <b>${fmtRate(one)}</b> ${state.to}`;
}

function compute(source){
  const fromEl=$("#amountFrom"), toEl=$("#amountTo");
  if(source==="to"){
    const v=parseNum(toEl.value);
    fromEl.value = fmt(convert(v, state.to, state.from));
  }else{
    const v=parseNum(fromEl.value);
    toEl.value = fmt(convert(v, state.from, state.to));
    toEl.classList.remove("flash"); void toEl.offsetWidth; toEl.classList.add("flash");
  }
  renderRate();
}
function parseNum(s){
  if(typeof s!=="string") return Number(s)||0;
  // strip grouping + arabic digits
  const map={"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":"."};
  s = s.replace(/[٠-٩٫]/g,d=>map[d]||d).replace(/[^0-9.]/g,"");
  return parseFloat(s)||0;
}

function renderRatesCard(){
  const grid=$("#rateGrid"); grid.innerHTML="";
  CURRENCIES.forEach(c=>{
    const perUsd = state.rates[c.code];
    const div=document.createElement("div"); div.className="rate-item";
    div.innerHTML = `
      <span class="ri-flag">${c.flag}</span>
      <div class="ri-name"><b>${name(c.code)}</b><span>${c.code}</span></div>
      <div class="ri-val">${c.base?"1":fmtRate(perUsd)}<small>${c.base?t("base"):t("perUsd")}</small></div>`;
    grid.appendChild(div);
  });
  $("#updatedAt").textContent = state.updatedAt
    ? new Date(state.updatedAt).toLocaleString(state.lang==="ar"?"ar-EG":"en-US")
    : t("never");
}

function renderQuickChips(){
  const wrap=$("#quickChips"); wrap.innerHTML="";
  [50,100,500,1000].forEach(v=>{
    const b=document.createElement("button"); b.className="chip"; b.textContent=fmt(v);
    b.onclick=()=>{ $("#amountFrom").value=fmt(v); compute("from"); };
    wrap.appendChild(b);
  });
}

/* ---------- currency picker ---------- */
function openPicker(side){
  state.activeSide=side;
  const sheet=$("#currencySheet"); sheet.innerHTML="";
  const current = side==="from"?state.from:state.to;
  CURRENCIES.forEach(c=>{
    const b=document.createElement("button");
    b.className="opt"+(c.code===current?" active":"");
    b.innerHTML=`<span class="o-flag">${c.flag}</span>
      <div class="o-txt"><b>${name(c.code)}</b><span>${c.code}</span></div>
      <span class="o-check">✓</span>`;
    b.onclick=()=>{ pickCurrency(c.code); };
    sheet.appendChild(b);
  });
  $("#sheetBackdrop").hidden=false;
}
function pickCurrency(code){
  const other = state.activeSide==="from"?state.to:state.from;
  if(code===other){ // swap to avoid same-same
    if(state.activeSide==="from") state.to=state.from; else state.from=state.to;
  }
  if(state.activeSide==="from") state.from=code; else state.to=code;
  $("#sheetBackdrop").hidden=true;
  persistSelection(); renderPickButtons(); compute("from");
}
function persistSelection(){ localStorage.setItem(SEL_KEY, JSON.stringify({from:state.from,to:state.to})); }
function loadSelection(){
  try{ const s=JSON.parse(localStorage.getItem(SEL_KEY)); if(s&&meta(s.from)&&meta(s.to)){state.from=s.from;state.to=s.to;} }catch(e){}
}

/* ---------- edit rates ---------- */
function openEdit(){
  const list=$("#editList"); list.innerHTML="";
  CURRENCIES.forEach(c=>{
    const row=document.createElement("div"); row.className="edit-row"+(c.base?" base":"");
    row.innerHTML=`<span class="er-flag">${c.flag}</span>
      <div class="er-label"><b>${name(c.code)}</b><span>${c.code}</span></div>
      <input type="text" inputmode="decimal" data-code="${c.code}"
             value="${c.base?1:state.rates[c.code]}" ${c.base?"disabled":""}/>`;
    list.appendChild(row);
  });
  $("#editBackdrop").hidden=false;
}
function saveEdit(){
  $("#editList").querySelectorAll("input[data-code]").forEach(inp=>{
    const code=inp.dataset.code; const v=parseNum(inp.value);
    if(v>0) state.rates[code]=v;
  });
  state.rates.USD=1;
  saveRates();
  $("#editBackdrop").hidden=true;
  renderRatesCard(); renderRate(); compute("from");
}
function resetRates(){
  state.rates=defaults();
  $("#editList").querySelectorAll("input[data-code]").forEach(inp=>{
    inp.value = meta(inp.dataset.code).def;
  });
}

/* ---------- net status ---------- */
function updateNet(){
  const online=navigator.onLine;
  const pill=$("#netPill"); pill.classList.toggle("off",!online);
  $("#netLabel").textContent = online ? (state.lang==="ar"?"متصل":"Online") : t("offlineReady");
}

/* ---------- wire up ---------- */
function init(){
  loadSelection();
  applyLang();
  renderPickButtons(); renderRatesCard(); renderQuickChips();
  compute("from");
  updateNet();

  $("#amountFrom").addEventListener("input",()=>compute("from"));
  $("#amountTo").addEventListener("input",()=>compute("to"));
  $("#pickFrom").addEventListener("click",()=>openPicker("from"));
  $("#pickTo").addEventListener("click",()=>openPicker("to"));
  $("#swapBtn").addEventListener("click",()=>{
    [state.from,state.to]=[state.to,state.from];
    persistSelection(); renderPickButtons(); compute("from");
  });
  $("#editRatesBtn").addEventListener("click",openEdit);
  $("#saveRatesBtn").addEventListener("click",saveEdit);
  $("#resetRatesBtn").addEventListener("click",resetRates);
  $("#langBtn").addEventListener("click",()=>{
    state.lang = state.lang==="ar"?"en":"ar";
    applyLang(); renderPickButtons(); renderRatesCard(); renderQuickChips(); compute("from"); updateNet();
  });
  [$("#sheetBackdrop"),$("#editBackdrop")].forEach(bd=>{
    bd.addEventListener("click",e=>{ if(e.target===bd) bd.hidden=true; });
  });
  window.addEventListener("online",updateNet);
  window.addEventListener("offline",updateNet);

  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
  }
}
document.addEventListener("DOMContentLoaded",init);
