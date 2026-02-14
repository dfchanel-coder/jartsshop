let carrito = JSON.parse(localStorage.getItem('jarts_carrito')) || [];
let todosLosPerfumes = []; // Guarda todos los productos cargados
let categoriaActual = 'Todas';

// --- 1. LÓGICA GLOBAL DEL CARRITO ---
function guardarCarrito() { localStorage.setItem('jarts_carrito', JSON.stringify(carrito)); actualizarCarritoUI(); }
function agregarAlCarrito(id, title, unit_price) {
    const existe = carrito.find(i => i.id === id);
    if (existe) existe.quantity++; else carrito.push({ id, title, unit_price, quantity: 1 });
    guardarCarrito(); toggleCart();
}
function actualizarCarritoUI() {
    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.innerText = carrito.reduce((a, b) => a + b.quantity, 0);

    const div = document.getElementById('cart-items');
    if (!div) return; 

    if (carrito.length === 0) {
        div.innerHTML = '<p style="text-align:center; color:#888; margin:30px 0;">Tu carrito está vacío</p>';
        document.getElementById('btn-ir-pagar').style.display = 'none';
    } else {
        document.getElementById('btn-ir-pagar').style.display = 'block';
        div.innerHTML = carrito.map((item, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div style="flex:1;"><strong style="font-size:0.95rem;">${item.title}</strong><br><small style="color:#888;">$${item.unit_price} c/u</small></div>
                <div style="display:flex; align-items:center; gap:8px; margin:0 10px;">
                    <button onclick="restarItem(${idx})" style="background:#f0f0f0; border:none; width:28px; height:28px; border-radius:50%; cursor:pointer; font-weight:bold;">-</button>
                    <span style="font-weight:600; min-width:20px; text-align:center;">${item.quantity}</span>
                    <button onclick="sumarItem(${idx})" style="background:#222; color:white; border:none; width:28px; height:28px; border-radius:50%; cursor:pointer; font-weight:bold;">+</button>
                </div>
                <div style="text-align:right;"><strong style="display:block;">$${item.unit_price * item.quantity}</strong><small onclick="eliminarItem(${idx})" style="color:red; cursor:pointer; text-decoration:underline; font-size:0.8rem;">Quitar</small></div>
            </div>
        `).join('');
    }
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.innerText = carrito.reduce((a, b) => a + (b.unit_price * b.quantity), 0);
}
function sumarItem(index) { carrito[index].quantity++; guardarCarrito(); }
function restarItem(index) { if (carrito[index].quantity > 1) carrito[index].quantity--; else if (confirm('¿Eliminar del carrito?')) carrito.splice(index, 1); guardarCarrito(); }
function eliminarItem(idx) { carrito.splice(idx, 1); guardarCarrito(); }
function vaciarCarrito() { carrito = []; guardarCarrito(); }
function toggleCart() { const modal = document.getElementById('cart-modal'); if (modal) modal.style.display = modal.style.display === 'block' ? 'none' : 'block'; }
function irAlCheckout() { window.location.href = '/checkout.html'; }

// --- 2. LÓGICA DE UX: FILTROS Y EFECTO SOFT ---
async function cargarCatalogo() {
    const container = document.getElementById('catalogo');
    if (!container) return; // Solo index.html

    if (todosLosPerfumes.length === 0) {
        const res = await fetch('/api/perfumes');
        todosLosPerfumes = await res.json();
    }
    
    renderizarFiltros();
    renderizarProductos(categoriaActual);
}

function renderizarFiltros() {
    const container = document.getElementById('filtros-categoria');
    if (!container) return;
    
    const categorias = ['Todas', ...new Set(todosLosPerfumes.map(p => p.categoria))];
    container.innerHTML = categorias.map(c => `
        <button class="filter-btn ${c === categoriaActual ? 'active' : ''}" onclick="filtrarPor('${c}')">${c}</button>
    `).join('');
}

function filtrarPor(cat) {
    categoriaActual = cat;
    renderizarFiltros(); // Actualiza clase activa
    renderizarProductos(cat);
}

async function renderizarProductos(categoria) {
    const container = document.getElementById('catalogo');
    // Reiniciamos el grid para forzar la animación fade-in
    container.innerHTML = '<div class="products-grid fade-in" id="grid-productos"></div>';
    const grid = document.getElementById('grid-productos');

    const filtrados = categoria === 'Todas' ? todosLosPerfumes : todosLosPerfumes.filter(p => p.categoria === categoria);

    if (filtrados.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No hay perfumes en esta categoría.</p>';
        return;
    }

    for (const p of filtrados) {
        const resenasReq = await fetch(`/api/perfumes/${p.id}/resenas`);
        const resenas = await resenasReq.json();
        
        let pText = '', tHTML = '';
        if (resenas.length > 0) {
            const prom = (resenas.reduce((a, b) => a + b.estrellas, 0) / resenas.length).toFixed(1);
            pText = `⭐ ${prom} (${resenas.length})`;
            const msg = resenas[0].comentario.substring(0, 50) + (resenas[0].comentario.length > 50 ? '...' : '');
            tHTML = `<span class="stars-tooltip">"${msg}"<br><small>- ${resenas[0].nombre}</small><br><em>Clic para leer más</em></span>`;
        } else {
            pText = `⭐ Nuevo`;
            tHTML = `<span class="stars-tooltip">Sé el primero en opinar<br><em>Clic para comentar</em></span>`;
        }

        const linkProd = `${window.location.origin}/producto.html?id=${p.id}`;
        const linkWA = encodeURIComponent(`¡Mirá este perfume que me encantó en Jart's!\n${p.nombre} a $${p.precio}\n\nPodés verlo acá: ${linkProd}`);

        grid.innerHTML += `
            <div class="product-card">
                <a href="/producto.html?id=${p.id}" style="text-decoration:none; color:inherit; display:block;">
                    <img src="${p.imagen_url}"> <h3 style="margin-bottom: 5px;">${p.nombre}</h3>
                </a>
                <div class="stars-container" onclick="abrirResenas(${p.id}, '${p.nombre}')">${pText}${tHTML}</div>
                <p style="color:#888; font-size:0.9rem; margin-bottom:10px; min-height: 40px;">${p.descripcion ? p.descripcion.substring(0, 50) + '...' : ''}</p>
                <p style="font-weight:bold; font-size:1.3rem; margin-bottom:15px; color:#d4af37;">$${p.precio}</p>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <button class="btn-add" onclick="agregarAlCarrito(${p.id}, '${p.nombre}', ${p.precio})" style="margin:0;">Agregar al Carrito</button>
                    <a href="https://wa.me/?text=${linkWA}" target="_blank" class="btn-add" style="margin:0; background:#25d366; text-decoration:none; display:flex; justify-content:center; align-items:center;" title="Compartir"><i class="fab fa-whatsapp"></i> Compartir</a>
                </div>
            </div>`;
    }
}

// --- 3. LÓGICA DE RESEÑAS ---
async function abrirResenas(id, nombre) {
    const modal = document.getElementById('modal-resenas');
    if(!modal) return;
    document.getElementById('r-perfume-id').value = id;
    document.getElementById('resena-titulo').innerText = `Opiniones sobre ${nombre}`;
    modal.style.display = 'block';
    cargarResenas(id);
}
function cerrarResenas() { document.getElementById('modal-resenas').style.display = 'none'; }
async function cargarResenas(id) {
    const res = await fetch(`/api/perfumes/${id}/resenas`);
    const resenas = await res.json();
    const div = document.getElementById('lista-resenas');
    div.innerHTML = resenas.length === 0 ? '<p style="color:#888; text-align:center;">Sé el primero en opinar!</p>' : resenas.map(r => `
        <div style="border-bottom:1px solid #f0f0f0; padding:10px 0;"><strong style="font-size:0.9rem;">${r.nombre}</strong> <span style="color:#d4af37; font-size:0.8rem;">${'⭐'.repeat(r.estrellas)}</span><br><small style="color:#555; display:block; margin-top:5px;">${r.comentario}</small></div>
    `).join('');
}
async function enviarResena() {
    const id = document.getElementById('r-perfume-id').value;
    const nombre = document.getElementById('r-nombre').value, estrellas = document.getElementById('r-estrellas').value, comentario = document.getElementById('r-comentario').value;
    if (!nombre || !comentario) return alert('Por favor, escribe tu nombre y un comentario.');
    await fetch(`/api/perfumes/${id}/resenas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, estrellas, comentario }) });
    document.getElementById('r-nombre').value = ''; document.getElementById('r-comentario').value = '';
    cargarResenas(id); renderizarProductos(categoriaActual); // Refrescar para ver tooltip nuevo
}

document.addEventListener('DOMContentLoaded', () => { actualizarCarritoUI(); cargarCatalogo(); });