const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  wedding_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','outcome')),
  amount INTEGER NOT NULL,
  client_id TEXT,
  note TEXT,
  payment_type TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

const HTML = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Cash Flow TCM</title>
<style>
:root{--green:#16834b;--green2:#0f6b3c;--light:#eef9f2;--line:#d9e8df;--text:#173126;--muted:#6b7c73;--red:#c53b3b}
*{box-sizing:border-box}body{margin:0;background:#f6faf7;color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header{background:linear-gradient(135deg,var(--green),var(--green2));color:#fff;padding:22px 16px 18px;position:sticky;top:0;z-index:5}
h1{font-size:24px;margin:0 0 4px}.sub{opacity:.9;font-size:13px}
main{max-width:1000px;margin:auto;padding:14px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;box-shadow:0 2px 8px #00000008}
.k{font-size:12px;color:var(--muted)}.v{font-size:21px;font-weight:800;margin-top:4px}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
button{border:0;border-radius:12px;padding:12px 14px;font-weight:700;font-size:14px;background:var(--green);color:#fff}
button.secondary{background:#e7f4ec;color:var(--green2)}button.danger{background:#fff0f0;color:var(--red)}
section{margin:14px 0}.title{font-weight:800;margin-bottom:9px}
input,select{width:100%;padding:11px;border:1px solid #cfe0d6;border-radius:10px;background:#fff;font-size:14px;color:var(--text)}
.form{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.full{grid-column:1/-1}
.tablewrap{overflow:auto;border:1px solid var(--line);border-radius:12px;background:#fff}
table{width:100%;border-collapse:collapse;min-width:720px}th,td{padding:10px;border-bottom:1px solid #edf2ee;text-align:left;font-size:13px}th{background:#f0f8f3}
.in{color:#117d45;font-weight:800}.out{color:var(--red);font-weight:800}.bal{font-weight:800}
.badge{display:inline-block;padding:4px 8px;border-radius:20px;background:#e8f6ed;color:var(--green2);font-size:11px;font-weight:700}.unpaid{background:#fff3dc;color:#9a6700}
dialog{border:0;border-radius:18px;padding:0;width:min(94vw,560px);box-shadow:0 20px 70px #0004}dialog::backdrop{background:#0007}.modal{padding:18px}.modal h2{margin:0 0 14px}.row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
.small{font-size:12px;color:var(--muted)}.empty{padding:20px;text-align:center;color:var(--muted)}
@media(max-width:700px){.grid{grid-template-columns:repeat(2,1fr)}.form{grid-template-columns:1fr}.actions{grid-template-columns:1fr 1fr}main{padding:10px}.v{font-size:18px}}
@media print{header,.actions,.no-print,dialog{display:none!important}body{background:#fff}.card{box-shadow:none}.tablewrap{overflow:visible}table{min-width:0;font-size:10px}}
</style>
</head>
<body>
<header><h1>Cash Flow TCM</h1><div class="sub">Pencatatan keuangan wedding vendor</div></header>
<main>
<div class="grid">
<div class="card"><div class="k">Saldo Awal</div><div class="v" id="awal">Rp 0</div></div>
<div class="card"><div class="k">Total Pemasukan</div><div class="v in" id="income">Rp 0</div></div>
<div class="card"><div class="k">Total Pengeluaran</div><div class="v out" id="outcome">Rp 0</div></div>
<div class="card"><div class="k">Saldo Akhir</div><div class="v" id="akhir">Rp 0</div></div>
</div>
<div class="actions no-print">
<button onclick="openIncome()">＋ Pemasukan</button>
<button onclick="openOutcome()">＋ Pengeluaran</button>
<button class="secondary" onclick="openClient()">＋ Data Wedding</button>
<button class="secondary" onclick="window.print()">🖨 Cetak / PDF</button>
</div>

<section><div class="title">Buku Kas Harian</div>
<div class="tablewrap"><table><thead><tr><th>No</th><th>Tanggal</th><th>Pemasukan</th><th>Pengeluaran</th><th>Saldo Berjalan</th><th>Catatan</th></tr></thead>
<tbody id="cash"></tbody></table></div></section>

<section class="no-print"><div class="title">Data Wedding & Status Pembayaran</div>
<div class="tablewrap"><table><thead><tr><th>Nama</th><th>Tanggal Wedding</th><th>Total Masuk</th><th>Status</th><th>Riwayat</th></tr></thead>
<tbody id="clients"></tbody></table></div></section>
</main>

<dialog id="dlgClient"><div class="modal"><h2>Data Wedding</h2><div class="form">
<div class="full"><label>Nama klien</label><input id="cname" placeholder="Nama wedding"></div>
<div><label>Tanggal wedding</label><input id="cdate" type="date"></div>
</div><div class="row"><button class="secondary" onclick="closeDlg('dlgClient')">Batal</button><button onclick="saveClient()">Simpan</button></div></div></dialog>

<dialog id="dlgTx"><div class="modal"><h2 id="txTitle">Pemasukan</h2><div class="form">
<div><label>Tanggal</label><input id="txdate" type="date"></div>
<div><label>Jumlah</label><input id="txamount" type="number" min="0" inputmode="numeric" placeholder="0"></div>
<div id="clientField" class="full"><label>Wedding</label><select id="txclient"></select></div>
<div id="paymentField"><label>Jenis pembayaran</label><select id="payment"><option value="DP">DP</option><option value="Pelunasan">Pelunasan</option><option value="Lainnya">Lainnya</option></select></div>
<div class="full"><label>Catatan</label><input id="txnote" placeholder="Keterangan"></div>
</div><div class="row"><button class="secondary" onclick="closeDlg('dlgTx')">Batal</button><button onclick="saveTx()">Simpan</button></div></div></dialog>

<script>
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
const today=()=>new Date().toISOString().slice(0,10);
let mode='income', clients=[], txs=[], awal=0;

async function api(path,opt={}){const r=await fetch(path,{headers:{'Content-Type':'application/json'},...opt});const d=await r.json();if(!r.ok)throw Error(d.message||'Terjadi kesalahan');return d}
function closeDlg(id){document.getElementById(id).close()}
function openClient(){document.getElementById('cname').value='';document.getElementById('cdate').value=today();document.getElementById('dlgClient').showModal()}
function openIncome(){mode='income';document.getElementById('txTitle').textContent='Pemasukan';document.getElementById('clientField').style.display='block';document.getElementById('paymentField').style.display='block';fillClients();document.getElementById('txdate').value=today();document.getElementById('txamount').value='';document.getElementById('txnote').value='';document.getElementById('dlgTx').showModal()}
function openOutcome(){mode='outcome';document.getElementById('txTitle').textContent='Pengeluaran';document.getElementById('clientField').style.display='none';document.getElementById('paymentField').style.display='none';document.getElementById('txdate').value=today();document.getElementById('txamount').value='';document.getElementById('txnote').value='';document.getElementById('dlgTx').showModal()}
function fillClients(){document.getElementById('txclient').innerHTML=clients.map(c=>`<option value="${c.id}">${esc(c.name)} — Wedding ${fmt(c.wedding_date)}</option>`).join('')||'<option value="">Belum ada data wedding</option>'}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fmt(s){if(!s)return'-';const [y,m,d]=s.split('-');return `${d}/${m}/${y}`}
async function saveClient(){const name=document.getElementById('cname').value.trim(), wedding_date=document.getElementById('cdate').value;if(!name||!wedding_date)return alert('Nama dan tanggal wedding wajib diisi.');await api('/api/clients',{method:'POST',body:JSON.stringify({name,wedding_date})});closeDlg('dlgClient');await load()}
async function saveTx(){const amount=Number(document.getElementById('txamount').value),date=document.getElementById('txdate').value,note=document.getElementById('txnote').value.trim();if(!amount||amount<0||!date)return alert('Tanggal dan jumlah wajib diisi.');const body={date,amount,note,type:mode};if(mode==='income'){body.client_id=document.getElementById('txclient').value;body.payment_type=document.getElementById('payment').value;if(!body.client_id)return alert('Buat Data Wedding terlebih dahulu.')}await api('/api/transactions',{method:'POST',body:JSON.stringify(body)});closeDlg('dlgTx');await load()}
function render(){
document.getElementById('awal').textContent=rupiah(awal);
const income=txs.filter(x=>x.type==='income').reduce((a,x)=>a+x.amount,0), outcome=txs.filter(x=>x.type==='outcome').reduce((a,x)=>a+x.amount,0);
document.getElementById('income').textContent=rupiah(income);document.getElementById('outcome').textContent=rupiah(outcome);document.getElementById('akhir').textContent=rupiah(awal+income-outcome);
const days={};txs.forEach(x=>{if(!days[x.date])days[x.date]={date:x.date,income:0,outcome:0,notes:[]};if(x.type==='income')days[x.date].income+=x.amount;else days[x.date].outcome+=x.amount;if(x.note)days[x.date].notes.push(x.note)});
let bal=awal, i=1;document.getElementById('cash').innerHTML=Object.values(days).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>{bal+=d.income-d.outcome;return `<tr><td>${i++}</td><td>${fmt(d.date)}</td><td class="in">${rupiah(d.income)}</td><td class="out">${rupiah(d.outcome)}</td><td class="bal">${rupiah(bal)}</td><td>${esc(d.notes.join('; '))}</td></tr>`}).join('')||'<tr><td colspan="6" class="empty">Belum ada transaksi.</td></tr>';
document.getElementById('clients').innerHTML=clients.sort((a,b)=>a.wedding_date.localeCompare(b.wedding_date)).map(c=>{const p=txs.filter(x=>x.client_id===c.id&&x.type==='income'),total=p.reduce((s,x)=>s+x.amount,0),lunas=p.some(x=>x.payment_type==='Pelunasan');return `<tr><td><b>${esc(c.name)}</b></td><td>${fmt(c.wedding_date)}</td><td>${rupiah(total)}</td><td><span class="badge ${lunas?'':'unpaid'}">${lunas?'LUNAS':'BELUM LUNAS'}</span></td><td>${p.map(x=>`${fmt(x.date)} • ${x.payment_type||'-'} • ${rupiah(x.amount)}`).join('<br>')||'-'}</td></tr>`}).join('')||'<tr><td colspan="5" class="empty">Belum ada data wedding.</td></tr>';
}
async function load(){const d=await api('/api/all');clients=d.clients;txs=d.transactions;awal=Number(d.initial_balance||0);render()}
load().catch(e=>alert(e.message));
</script></body></html>`;

async function init(env){
  await env.DB.exec(SCHEMA);
  const s = await env.DB.prepare("SELECT value FROM settings WHERE key='initial_balance'").first();
  if(!s) await env.DB.prepare("INSERT INTO settings(key,value) VALUES('initial_balance','0')").run();
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8'}})}
async function body(req){return await req.json().catch(()=>({}))}

export default {
  async fetch(request, env) {
    try {
      await init(env);
      const url=new URL(request.url);
      const path=url.pathname;
      if(request.method==='GET' && path==='/') return new Response(HTML,{headers:{'Content-Type':'text/html; charset=utf-8'}});
      if(request.method==='GET' && path==='/api/all'){
        const clients=(await env.DB.prepare("SELECT * FROM clients ORDER BY wedding_date DESC, created_at DESC").all()).results;
        const transactions=(await env.DB.prepare("SELECT * FROM transactions ORDER BY date ASC, created_at ASC").all()).results;
        const s=await env.DB.prepare("SELECT value FROM settings WHERE key='initial_balance'").first();
        return json({clients,transactions,initial_balance:Number(s?.value||0)});
      }
      if(request.method==='POST' && path==='/api/clients'){
        const b=await body(request);if(!b.name||!b.wedding_date)return json({message:'Nama dan tanggal wajib diisi'},400);
        const id=crypto.randomUUID(), now=new Date().toISOString();
        await env.DB.prepare("INSERT INTO clients(id,name,wedding_date,created_at) VALUES(?,?,?,?)").bind(id,b.name,b.wedding_date,now).run();
        return json({ok:true,id});
      }
      if(request.method==='POST' && path==='/api/transactions'){
        const b=await body(request);if(!b.date||!b.amount||!b.type)return json({message:'Data transaksi belum lengkap'},400);
        if(!['income','outcome'].includes(b.type))return json({message:'Jenis transaksi tidak valid'},400);
        if(b.type==='income' && !b.client_id)return json({message:'Pemasukan harus memilih wedding'},400);
        const id=crypto.randomUUID(),now=new Date().toISOString();
        await env.DB.prepare("INSERT INTO transactions(id,date,type,amount,client_id,note,payment_type,created_at) VALUES(?,?,?,?,?,?,?,?)")
          .bind(id,b.date,b.type,Number(b.amount),b.client_id||null,b.note||'',b.payment_type||null,now).run();
        return json({ok:true,id});
      }
      if(request.method==='POST' && path==='/api/initial-balance'){
        const b=await body(request);await env.DB.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('initial_balance',?)").bind(String(Number(b.amount||0))).run();return json({ok:true});
      }
      return json({message:'Not found'},404);
    } catch(e){return json({message:e.message||String(e)},500)}
  }
};
