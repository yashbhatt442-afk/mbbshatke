const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let books = [];
let currentBook = null;

const $ = id => document.getElementById(id);
const yearName = y => ({1:"1st Year",2:"2nd Year",3:"3rd Year",4:"4th Year"})[y] || y;

function showView(id){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active")); $(id).classList.add("active"); window.scrollTo(0,0)}
function showHome(){showView("homeView")}
function showBuyer(){showView("buyerView"); loadBooks()}
function showSeller(){showView("sellerView")}
function showAdmin(){showView("adminView"); checkAdmin()}

function toast(msg){const t=$("toast");t.textContent=msg;t.style.display="block";setTimeout(()=>t.style.display="none",3000)}
function message(id,msg,ok=false){const e=$(id);e.textContent=msg;e.className="message show "+(ok?"ok":"error")}

async function loadBooks(){
  $("booksGrid").innerHTML='<div class="loading">Loading books…</div>';
  const {data,error}=await sb.from("public_books").select("id,year,book_name,author,condition,seller_price,buyer_price,photo_urls,created_at").eq("status","approved").order("created_at",{ascending:false});
  if(error){$("booksGrid").innerHTML='<div class="loading">Could not load books. Check your Supabase setup.</div>';return}
  books=data||[]; renderBooks();
}
function renderBooks(){
  const q=($("searchInput")?.value||"").toLowerCase().trim(), y=$("yearFilter")?.value||"";
  const list=books.filter(b=>(!q||b.book_name.toLowerCase().includes(q)||b.author.toLowerCase().includes(q))&&(!y||String(b.year)===y));
  if(!list.length){$("booksGrid").innerHTML='<div class="loading">No books found yet.</div>';return}
  $("booksGrid").innerHTML=list.map(b=>`
    <article class="book-card" onclick="openBook('${b.id}')">
      <div class="book-cover">${b.photo_urls?.[0]?`<img src="${esc(b.photo_urls[0])}" alt="">`:'<span class="placeholder">📕</span>'}</div>
      <div class="book-info"><span class="year-pill">${yearName(b.year)}</span><h3>${esc(b.book_name)}</h3><p>${esc(b.author)}</p><span class="price">₹${Number(b.buyer_price).toLocaleString("en-IN")}</span><span class="condition">${esc(b.condition)}</span></div>
    </article>`).join("");
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

async function openBook(id){
  currentBook=books.find(b=>b.id===id);
  if(!currentBook)return;
  const b=currentBook;
  const photos=(b.photo_urls||[]).map(u=>`<img src="${esc(u)}" alt="${esc(b.book_name)}">`).join("");
  const wa=`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(`Hi, I am interested in buying "${b.book_name}" by ${b.author}. Listed price: ₹${b.buyer_price}. Book link: ${location.origin}${location.pathname}?book=${b.id}`)}`;
  $("detailContent").innerHTML=`<div class="detail"><div class="detail-images">${photos}</div><div class="detail-main"><span class="eyebrow">${yearName(b.year)} • ${esc(b.condition)}</span><h1>${esc(b.book_name)}</h1><p class="author">by ${esc(b.author)}</p><div class="detail-price">₹${Number(b.buyer_price).toLocaleString("en-IN")}</div><div class="privacy-note">🔒 Seller identity and phone number are not displayed here. Clicking Buy connects you to the marketplace WhatsApp number.</div><a class="btn primary big full" target="_blank" rel="noopener" href="${wa}">💬 Buy / Enquire on WhatsApp</a></div></div>`;
  showView("detailView");
}

$("sellerPrice")?.addEventListener("input",()=>{const p=Number($("sellerPrice").value)||0;$("sellerPricePreview").textContent="₹"+p.toLocaleString("en-IN");$("buyerPricePreview").textContent="₹"+(p+50).toLocaleString("en-IN")});
$("photos")?.addEventListener("change",e=>{
  const fs=[...e.target.files];$("previewStrip").innerHTML=fs.map(f=>`<img src="${URL.createObjectURL(f)}">`).join("");
});
$("sellerForm")?.addEventListener("submit",submitBook);

async function submitBook(e){
  e.preventDefault();
  const files=[...$("photos").files];
  if(files.length<2){message("sellerMessage","Please upload at least 2 photos.");return}
  if(files.length>5){message("sellerMessage","Please upload no more than 5 photos.");return}
  const wa=$("whatsapp").value.replace(/\D/g,"");
  if(wa.length<10){message("sellerMessage","Enter a valid WhatsApp number with country code.");return}
  const btn=e.submitter;btn.disabled=true;btn.textContent="Uploading…";
  try{
    const urls=[];
    for(const file of files){
      if(file.size>5*1024*1024) throw new Error("Each photo must be under 5 MB.");
      const ext=file.name.split(".").pop().toLowerCase();
      const path=`${crypto.randomUUID()}.${ext}`;
      const up=await sb.storage.from("book-images").upload(path,file,{contentType:file.type,upsert:false});
      if(up.error) throw up.error;
      const {data}=sb.storage.from("book-images").getPublicUrl(path); urls.push(data.publicUrl);
    }
    const sellerPrice=Number($("sellerPrice").value);
    const payload={year:Number($("sellerYear").value),book_name:$("bookName").value.trim(),author:$("author").value.trim(),condition:$("condition").value,seller_price:sellerPrice,photo_urls:urls,status:"pending"};
    const {data:book,error}=await sb.from("books").insert(payload).select("id").single();
    if(error)throw error;
    const {error:contactError}=await sb.from("seller_contacts").insert({book_id:book.id,seller_whatsapp:wa});
    if(contactError) {
      await sb.from("books").delete().eq("id",book.id);
      throw contactError;
    }
    $("sellerForm").reset();$("previewStrip").innerHTML="";$("sellerPricePreview").textContent="₹0";$("buyerPricePreview").textContent="₹50";
    message("sellerMessage","Submitted successfully. Your book will appear after owner approval.",true);
  }catch(err){message("sellerMessage",err.message||"Submission failed. Please try again.")}
  finally{btn.disabled=false;btn.textContent="Submit Book for Approval"}
}

async function checkAdmin(){
  const {data:{session}}=await sb.auth.getSession();
  $("adminLogin").classList.toggle("hidden",!!session);$("adminPanel").classList.toggle("hidden",!session);
  if(session) loadAdminListings();
}
async function adminLogin(){
  const {error}=await sb.auth.signInWithPassword({email:$("adminEmail").value,password:$("adminPassword").value});
  if(error){message("adminMessage",error.message);return}
  checkAdmin();
}
async function adminLogout(){await sb.auth.signOut();checkAdmin()}
async function loadAdminListings(){
  const {data,error}=await sb.from("books").select("*").order("created_at",{ascending:false});
  if(error){$("adminListings").innerHTML=`<p>${esc(error.message)}</p>`;return}
  const {data:contacts, error:contactError}=await sb.from("seller_contacts").select("book_id,seller_whatsapp");
  if(contactError){$("adminListings").innerHTML=`<p>${esc(contactError.message)}</p>`;return}
  const contactMap=Object.fromEntries((contacts||[]).map(c=>[c.book_id,c.seller_whatsapp]));
  $("adminListings").innerHTML=(data||[]).map(b=>`
    <div class="admin-row">
      <div><h4>${esc(b.book_name)} <small>(${yearName(b.year)})</small></h4><div class="muted">${esc(b.author)} • Seller asks ₹${b.seller_price} • Buyer price ₹${b.buyer_price} • WhatsApp: ${esc(contactMap[b.id]||"Not provided")}</div><div class="muted">Status: <b>${esc(b.status)}</b></div></div>
      <div class="admin-actions"><button class="approve" onclick="setStatus('${b.id}','approved')">Approve</button><button onclick="setStatus('${b.id}','sold')">Mark sold</button><button class="reject" onclick="setStatus('${b.id}','rejected')">Reject</button><button onclick="deleteBook('${b.id}')">Delete</button></div>
    </div>`).join("")||"<p>No listings yet.";
}
async function setStatus(id,status){const {error}=await sb.from("books").update({status}).eq("id",id);if(error)toast(error.message);else loadAdminListings()}
async function deleteBook(id){if(!confirm("Delete this listing?"))return;const {error}=await sb.from("books").delete().eq("id",id);if(error)toast(error.message);else loadAdminListings()}

(function init(){
  const id=new URLSearchParams(location.search).get("book");
  if(id) loadBooks().then(()=>openBook(id));
})();
