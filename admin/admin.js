const ORDER_KEY = 'foodhubAdminOrders';
const PRODUCT_KEY = 'foodhubAdminProducts';
const CUSTOMER_KEY = 'foodhubAdminCustomers';
const REVIEW_KEY = 'foodhubAdminReviews';

const seedOrders = [
  {id:'FH-1048', customer:'Thendo M.', email:'thendo@example.com', items:3, total:310, status:'Preparing'},
  {id:'FH-1047', customer:'Lerato K.', email:'lerato@example.com', items:2, total:185, status:'Ready'},
  {id:'FH-1046', customer:'Siyabonga N.', email:'siyabonga@example.com', items:4, total:425, status:'Delivered'},
  {id:'FH-1045', customer:'Mpho P.', email:'mpho@example.com', items:1, total:95, status:'Pending'},
  {id:'FH-1044', customer:'Anele D.', email:'anele@example.com', items:5, total:540, status:'Delivered'}
];

const seedProducts = [
  {id:'p1',name:'Strata',category:'Breakfast',price:140,available:true,image:'../assets/images/BREAKFAST/strata.jpeg',description:'Tasty bread filled with cheese.'},
  {id:'p2',name:'Tacos',category:'Breakfast',price:89.99,available:true,image:'../assets/images/BREAKFAST/tacos.jpeg',description:'Fresh tacos made with love.'},
  {id:'p3',name:'Omelette',category:'Breakfast',price:96,available:true,image:'../assets/images/BREAKFAST/omelette.jpeg',description:'Farm-fresh eggs cooked to perfection.'},
  {id:'p4',name:'Pancakes',category:'Breakfast',price:70,available:true,image:'../assets/images/BREAKFAST/pancakes.jpeg',description:'Light and airy pancakes.'},
  {id:'p5',name:'BunnyEggs',category:'Breakfast',price:67,available:true,image:'../assets/images/BREAKFAST/scrambled_eggs.jpeg',description:'A simple and satisfying breakfast.'},
  {id:'p6',name:'AvoToast',category:'Breakfast',price:60,available:true,image:'../assets/images/BREAKFAST/avocado_toast.jpeg',description:'Toasted bread topped with avocado.'}
];

const seedCustomers = [
  {name:'Thendo M.',email:'thendo@example.com'},
  {name:'Lerato K.',email:'lerato@example.com'},
  {name:'Siyabonga N.',email:'siyabonga@example.com'},
  {name:'Mpho P.',email:'mpho@example.com'},
  {name:'Anele D.',email:'anele@example.com'}
];

const seedReviews = [
  {name:'Lerato K.',rating:5,text:'The food arrived hot and tasted amazing.'},
  {name:'Mpho P.',rating:4,text:'Really good portions and quick delivery.'},
  {name:'Anele D.',rating:5,text:'The pancakes were excellent. I will order again.'}
];

const clone = value => JSON.parse(JSON.stringify(value));
function getData(key, seed){
  const existing = localStorage.getItem(key);
  if (!existing) { localStorage.setItem(key, JSON.stringify(seed)); return clone(seed); }
  try { return JSON.parse(existing); } catch { localStorage.setItem(key, JSON.stringify(seed)); return clone(seed); }
}
function saveData(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function money(value){ return `R${Number(value).toFixed(2)}`; }

let orders = getData(ORDER_KEY, seedOrders);
let products = getData(PRODUCT_KEY, seedProducts);
let customers = getData(CUSTOMER_KEY, seedCustomers);
let reviews = getData(REVIEW_KEY, seedReviews);

const sectionTitles = {dashboard:'Dashboard',orders:'Orders',products:'Products',customers:'Customers',reviews:'Reviews'};

function showSection(name){
  document.querySelectorAll('.admin-section').forEach(section => section.classList.remove('active'));
  document.querySelector(`#${name}-section`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.section === name));
  document.getElementById('page-title').textContent = sectionTitles[name];
  document.getElementById('sidebar').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => showSection(item.dataset.section)));
document.querySelectorAll('[data-section-target]').forEach(button => button.addEventListener('click', () => showSection(button.dataset.sectionTarget)));
document.getElementById('mobile-menu').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('admin-logout').addEventListener('click', () => {
  if (confirm('Log out of the admin dashboard?')) {
    window.location.href = '../home/index.html';
  }
});

function renderDashboard(){
  const revenue = orders.filter(o => o.status !== 'Cancelled').reduce((sum,o) => sum + Number(o.total),0);
  const pending = orders.filter(o => o.status === 'Pending' || o.status === 'Preparing').length;
  const average = reviews.length ? reviews.reduce((sum,r) => sum + Number(r.rating),0) / reviews.length : 0;
  document.getElementById('total-orders').textContent = orders.length;
  document.getElementById('total-revenue').textContent = money(revenue);
  document.getElementById('total-customers').textContent = customers.length;
  document.getElementById('total-reviews').textContent = reviews.length;
  document.getElementById('orders-summary').textContent = `${pending} active`;
  document.getElementById('rating-summary').textContent = `Average rating ${average.toFixed(1)}`;
  document.getElementById('pending-nav-count').textContent = pending;

  document.getElementById('recent-orders').innerHTML = orders.slice(0,5).map(order => `
    <tr><td><strong>${escapeHtml(order.id)}</strong></td><td>${escapeHtml(order.customer)}</td><td>${money(order.total)}</td><td><span class="status ${order.status}">${order.status}</span></td></tr>`).join('') || emptyRow(4,'No orders yet.');

  document.getElementById('popular-products').innerHTML = products.slice(0,5).map(product => `
    <div class="product-mini"><img src="${escapeAttr(product.image)}" alt=""><div><strong>${escapeHtml(product.name)}</strong><span>${escapeHtml(product.category)} · ${money(product.price)}</span></div></div>`).join('') || '<div class="empty">No products yet.</div>';
}

function emptyRow(columns,text){ return `<tr><td colspan="${columns}" class="empty">${text}</td></tr>`; }
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function escapeAttr(value){return escapeHtml(value);}

function renderOrders(){
  const filter = document.getElementById('order-filter').value;
  const query = document.getElementById('order-search').value.trim().toLowerCase();
  const filtered = orders.filter(order => (filter === 'all' || order.status === filter) && (`${order.id} ${order.customer} ${order.email}`.toLowerCase().includes(query)));
  document.getElementById('orders-table').innerHTML = filtered.map(order => `
    <tr>
      <td><strong>${escapeHtml(order.id)}</strong></td>
      <td>${escapeHtml(order.customer)}<small class="muted-cell">${escapeHtml(order.email)}</small></td>
      <td>${order.items}</td><td>${money(order.total)}</td>
      <td><span class="status ${order.status}">${order.status}</span></td>
      <td><select class="order-status" data-id="${escapeAttr(order.id)}" aria-label="Change status for ${escapeAttr(order.id)}"><option ${order.status==='Pending'?'selected':''}>Pending</option><option ${order.status==='Preparing'?'selected':''}>Preparing</option><option ${order.status==='Ready'?'selected':''}>Ready</option><option ${order.status==='Delivered'?'selected':''}>Delivered</option><option ${order.status==='Cancelled'?'selected':''}>Cancelled</option></select></td>
    </tr>`).join('') || emptyRow(6,'No matching orders.');
  document.querySelectorAll('.order-status').forEach(select => select.addEventListener('change', e => {
    const order = orders.find(o => o.id === e.target.dataset.id);
    if(order){ order.status = e.target.value; saveData(ORDER_KEY,orders); renderAll(); toast(`Order ${order.id} is now ${order.status}.`); }
  }));
}

function renderProducts(){
  document.getElementById('products-table').innerHTML = products.map(product => `
    <tr><td><div class="product-mini"><img src="${escapeAttr(product.image)}" alt=""><div><strong>${escapeHtml(product.name)}</strong><span>${escapeHtml(product.description || '')}</span></div></div></td><td>${escapeHtml(product.category)}</td><td>${money(product.price)}</td><td><span class="availability ${product.available?'available':'unavailable'}">${product.available?'Available':'Unavailable'}</span></td><td><button class="action-btn edit-product" data-id="${product.id}" title="Edit"><i class="fa-solid fa-pen"></i></button><button class="action-btn toggle-product" data-id="${product.id}" title="Toggle availability"><i class="fa-solid fa-power-off"></i></button><button class="action-btn delete-product" data-id="${product.id}" title="Delete"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') || emptyRow(5,'No products yet.');
  document.querySelectorAll('.edit-product').forEach(button => button.addEventListener('click', () => openProductModal(button.dataset.id)));
  document.querySelectorAll('.toggle-product').forEach(button => button.addEventListener('click', () => {const p=products.find(x=>x.id===button.dataset.id); if(p){p.available=!p.available;saveData(PRODUCT_KEY,products);renderAll();toast(`${p.name} is now ${p.available?'available':'unavailable'}.`);}}));
  document.querySelectorAll('.delete-product').forEach(button => button.addEventListener('click', () => {const p=products.find(x=>x.id===button.dataset.id);if(p && confirm(`Delete ${p.name}?`)){products=products.filter(x=>x.id!==p.id);saveData(PRODUCT_KEY,products);renderAll();toast('Product deleted.');}}));
}

function renderCustomers(){
  document.getElementById('customers-table').innerHTML = customers.map(customer => {
    const customerOrders=orders.filter(o=>o.email===customer.email); const spent=customerOrders.filter(o=>o.status!=='Cancelled').reduce((s,o)=>s+Number(o.total),0);
    return `<tr><td><strong>${escapeHtml(customer.name)}</strong></td><td>${escapeHtml(customer.email)}</td><td>${customerOrders.length}</td><td>${money(spent)}</td></tr>`;
  }).join('') || emptyRow(4,'No customers yet.');
}

function renderReviews(){
  document.getElementById('reviews-grid').innerHTML = reviews.map(review => `<article class="review-card"><div class="stars">${'★'.repeat(Number(review.rating))}${'☆'.repeat(5-Number(review.rating))}</div><p>“${escapeHtml(review.text)}”</p><span class="review-author">${escapeHtml(review.name)}</span></article>`).join('') || '<div class="empty">No reviews yet.</div>';
}

function renderAll(){renderDashboard();renderOrders();renderProducts();renderCustomers();renderReviews();}

document.getElementById('order-filter').addEventListener('change',renderOrders);
document.getElementById('order-search').addEventListener('input',renderOrders);
document.getElementById('reset-orders').addEventListener('click',()=>{if(confirm('Reset the demo orders?')){orders=clone(seedOrders);saveData(ORDER_KEY,orders);renderAll();toast('Demo orders reset.');}});

const modal=document.getElementById('product-modal');
function openProductModal(id){
  const product=products.find(p=>p.id===id);
  document.getElementById('product-form').reset();
  document.getElementById('product-id').value=product?.id || '';
  document.getElementById('product-modal-title').textContent=product?'Edit product':'Add product';
  if(product){document.getElementById('product-name').value=product.name;document.getElementById('product-category').value=product.category;document.getElementById('product-price').value=product.price;document.getElementById('product-image').value=product.image;document.getElementById('product-description').value=product.description||'';document.getElementById('product-available').checked=product.available;}
  modal.hidden=false; document.getElementById('product-name').focus();
}
function closeModal(){modal.hidden=true;}
document.getElementById('add-product').addEventListener('click',()=>openProductModal());
document.getElementById('close-product-modal').addEventListener('click',closeModal);
document.getElementById('cancel-product').addEventListener('click',closeModal);
modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
document.getElementById('product-form').addEventListener('submit',e=>{
  e.preventDefault();
  const id=document.getElementById('product-id').value || `p-${Date.now()}`;
  const product={id,name:document.getElementById('product-name').value.trim(),category:document.getElementById('product-category').value,price:Number(document.getElementById('product-price').value),image:document.getElementById('product-image').value.trim() || '../assets/images/FoodHub-Tile.png',description:document.getElementById('product-description').value.trim(),available:document.getElementById('product-available').checked};
  const index=products.findIndex(p=>p.id===id); if(index>=0) products[index]=product; else products.push(product);
  saveData(PRODUCT_KEY,products);closeModal();renderAll();toast(index>=0?'Product updated.':'Product added.');
});

function toast(message){const existing=document.querySelector('.toast');if(existing)existing.remove();const node=document.createElement('div');node.className='toast';node.textContent=message;document.body.appendChild(node);setTimeout(()=>node.remove(),2200);}

renderAll();
