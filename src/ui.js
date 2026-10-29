// Web 界面（单文件 HTML）。注意：里面不使用反引号和 ${}，以免和外层模板字符串冲突。
export const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>链接状态监控</title>
<style>
body{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;max-width:1000px;margin:0 auto;padding:24px;color:#222;background:#f7f8fa}
h1{font-size:22px;margin:0 0 4px}
.sub{color:#888;font-size:13px;margin-bottom:8px}
.bar{display:flex;gap:8px;margin:16px 0;flex-wrap:wrap}
input{padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:14px}
input#url{flex:1;min-width:240px}
button{padding:8px 14px;border:0;border-radius:6px;background:#1a73e8;color:#fff;font-size:14px;cursor:pointer}
button.ghost{background:#e8eaed;color:#333}
button:disabled{opacity:.6;cursor:default}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;font-size:14px}
th,td{padding:10px 12px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
th{background:#fafbfc;color:#666;font-weight:600;white-space:nowrap}
.b{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;white-space:nowrap}
.green{background:#e6f4ea;color:#137333}
.red{background:#fce8e6;color:#a50e0e}
.gray{background:#f1f3f4;color:#5f6368}
.url{color:#1a73e8;word-break:break-all}
.meta{color:#888;font-size:12px;word-break:break-all}
.del{color:#c5221f;background:none;cursor:pointer;padding:4px 8px;font-size:13px}
.note{color:#888;font-size:13px;margin-top:12px}
</style>
</head>
<body>
<h1>🔗 链接状态监控</h1>
<div class="sub">每 5 分钟自动检查一次；页面每 30 秒自动刷新</div>
<div class="bar">
<input id="name" placeholder="名称（可选）">
<input id="url" placeholder="https://example.com">
<button id="addBtn" onclick="addLink()">添加</button>
<button id="checkBtn" class="ghost" onclick="checkNow()">立即检查全部</button>
</div>
<table>
<thead><tr><th>名称 / 链接</th><th>状态</th><th>HTTP</th><th>标题 / 备注</th><th>耗时</th><th>上次检查</th><th></th></tr></thead>
<tbody id="rows"><tr><td colspan="7" class="meta">加载中…</td></tr></tbody>
</table>
<div class="note">判定规则：状态码 &lt; 400 为正常；超时 20 秒、DNS 失败、证书错误等记为异常。</div>
<script>
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function badge(s){
  if(!s||!s.checkedAt) return '<span class="b gray">待检查</span>';
  return s.ok?'<span class="b green">正常</span>':'<span class="b red">异常</span>';
}
function render(items){
  var html='';
  if(!items.length) html='<tr><td colspan="7" class="meta">还没有链接，在上面添加一个吧。</td></tr>';
  for(var i=0;i<items.length;i++){
    var it=items[i], s=it.status||{};
    var note=s.title?esc(s.title):(s.error?esc(s.error):(s.finalUrl&&s.finalUrl!==it.url?'跳转 → '+esc(s.finalUrl):'—'));
    html+='<tr>'
      +'<td><div>'+esc(it.name)+'</div><div><a class="url" href="'+esc(it.url)+'" target="_blank" rel="noopener">'+esc(it.url)+'</a></div></td>'
      +'<td>'+badge(s)+'</td>'
      +'<td>'+(s.status==null?'—':s.status)+'</td>'
      +'<td class="meta">'+note+'</td>'
      +'<td>'+(s.ms==null?'—':s.ms+'ms')+'</td>'
      +'<td class="meta">'+(s.checkedAt?new Date(s.checkedAt).toLocaleString('zh-CN'):'—')+'</td>'
      +'<td><button class="del" onclick="delLink(\\''+it.id+'\\')">删除</button></td>'
      +'</tr>';
  }
  document.getElementById('rows').innerHTML=html;
}
async function load(){try{var r=await fetch('/api/links');render(await r.json());}catch(e){}}
async function addLink(){
  var url=document.getElementById('url').value.trim();
  var name=document.getElementById('name').value.trim();
  if(!url){alert('先填链接');return;}
  var btn=document.getElementById('addBtn');btn.disabled=true;
  try{
    var r=await fetch('/api/links',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:url,name:name})});
    var d=await r.json();
    if(!r.ok){alert(d.error||'添加失败');return;}
    document.getElementById('url').value='';document.getElementById('name').value='';
    render(await (await fetch('/api/links')).json());
  }finally{btn.disabled=false;}
}
async function delLink(id){
  if(!confirm('确定删除这个链接？'))return;
  await fetch('/api/links?id='+encodeURIComponent(id),{method:'DELETE'});
  load();
}
async function checkNow(){
  var btn=document.getElementById('checkBtn');btn.disabled=true;btn.textContent='检查中…';
  try{var r=await fetch('/api/check',{method:'POST'});render(await r.json());}
  finally{btn.disabled=false;btn.textContent='立即检查全部';}
}
load();
setInterval(load,30000);
</script>
</body>
</html>`;
