let carrito = JSON.parse(localStorage.getItem('jarts_carrito')) || [];
let todosLosProductos = []; 
let categoriaActual = 'Todas';

// --- MULTIMONEDA E IDIOMA ---
let cotizacionBRL = 8.50; 
let monedaActual = localStorage.getItem('jarts_moneda') || 'UYU';
let idioma = monedaActual === 'BRL' ? 'pt' : 'es';
const WA_UY = '59899822758';
const WA_BR = '5555996679276';

// Textos dinámicos genéricos
const textos = {
    es: { vacio: "Tu carrito está vacío", quitar: "Quitar", agregar: "Agregar al Carrito", nuevo: "Nuevo", sePrimero: "Sé el primero en opinar", sinProd: "No hay productos en esta categoría." },
    pt: { vacio: "Seu carrinho está vazio", quitar: "Remover", agregar: "Adicionar ao Carrinho", novo: "Novo", sePrimeiro: "Seja o primeiro a avaliar", sinProd: "Nenhum produto encontrado nesta categoria." }
};

async function initConfig() {
    try {
        const res = await fetch('/api/configuracion');
        const data = await res.json();
        cotizacionBRL = data.cotizacion || 8.50;
        
        // Cargar Banner si estamos en el Index y hay una URL configurada
        const bannerSection = document.getElementById('banner-section');
        if (bannerSection && data.banner_url && data.banner_url.trim() !== '') {
            bannerSection.innerHTML = `<div class="banner-container fade-in"><img src="${data.banner_url}" alt="Banner Promocional Jarts Shop"></div>`;
            bannerSection.style.display = 'block';
        }

    } catch (e) { console.error('Error config', e); }
    
    inyectarBotonMoneda();
    aplicarTraduccionesDOM();
    actualizarCarritoUI();
    if (document.getElementById('catalogo')) cargarCatalogo();
}

function inyectarBotonMoneda() {
    const header = document.querySelector('header');
    if (!header || document.getElementById('btn-moneda')) return;
    const div = document.createElement('div');
    div.style.marginLeft = 'auto'; div.style.marginRight = '20px';
    div.innerHTML = `<button id="btn-moneda" onclick="cambiarMoneda()" style="background:#f3f4f6; border:1px solid #d1d5db; padding:8px 15px; border-radius:20px; cursor:pointer; font-weight:600; color:#374151; font-size:1.05rem; transition:0.3s; font-family:'Inter', sans-serif;">${monedaActual === 'UYU' ? '🇺🇾 UYU' : '🇧🇷 BRL'}</button>`;
    header.insertBefore(div, header.querySelector('.cart-icon'));
}

function cambiarMoneda() {
    monedaActual = monedaActual === 'UYU' ? 'BRL' : 'UYU';
    localStorage.setItem('jarts_moneda', monedaActual);
    location.reload(); 
}

function aplicarTraduccionesDOM() {
    document.querySelectorAll('[data-es]').forEach(el => {
        el.innerText = el.getAttribute(`data-${idioma}`);
    });
}

function formatPrecio(precioBaseUYU) {
    if (monedaActual === 'BRL') {
        const precioReal = precioBaseUYU / cotizacionBRL;
        return `R$ ${precioReal.toFixed(2)}`;
    }
    return `$ ${precioBaseUYU}`; 
}

function getWaLink(texto) {
    const numero = monedaActual === 'BRL' ? WA_BR : WA_UY;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

// --- CARRITO ---
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
        div.innerHTML = `<p style="text-align:center; color:#6b7280; margin:30px 0;">${textos[idioma].vacio}</p>`;
        document.getElementById('btn-ir-pagar').style.display = 'none';
    } else {
        document.getElementById('btn-ir-pagar').style.display = 'block';
        div.innerHTML = carrito.map((item, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #e5e7eb; padding-bottom:12px;">
                <div style="flex:1;"><strong style="font-size:0.95rem; color:#1f2937;">${item.title}</strong><br><small style="color:#6b7280;">${formatPrecio(item.unit_price)} c/u</small></div>
                <div style="display:flex; align-items:center; gap:8px; margin:0 10px;">
                    <button onclick="restarItem(${idx})" style="background:#f3f4f6; border:1px solid #d1d5db; width:28px; height:28px; border-radius:6px; cursor:pointer; font-weight:bold; color:#374151;">-</button>
                    <span style="font-weight:600; min-width:20px; text-align:center; color:#1f2937;">${item.quantity}</span>
                    <button onclick="sumarItem(${idx})" style="background:#1f2937; color:white; border:none; width:28px; height:28px; border-radius:6px; cursor:pointer; font-weight:bold;">+</button>
                </div>
                <div style="text-align:right;"><strong style="display:block; color:#1f2937;">${formatPrecio(item.unit_price * item.quantity)}</strong><small onclick="eliminarItem(${idx})" style="color:#ef4444; cursor:pointer; text-decoration:underline; font-size:0.8rem; font-weight:600;">${textos[idioma].quitar}</small></div>
            </div>
        `).join('');
    }
    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.innerText = formatPrecio(carrito.reduce((a, b) => a + (b.unit_price * b.quantity), 0));
}
function sumarItem(index) { carrito[index].quantity++; guardarCarrito(); }
function restarItem(index) { if (carrito[index].quantity > 1) carrito[index].quantity--; else { carrito.splice(index, 1); } guardarCarrito(); }
function eliminarItem(idx) { carrito.splice(idx, 1); guardarCarrito(); }
function vaciarCarrito() { carrito = []; guardarCarrito(); }
function toggleCart() { const modal = document.getElementById('cart-modal'); if (modal) modal.style.display = modal.style.display === 'block' ? 'none' : 'block'; }
function irAlCheckout() { window.location.href = '/checkout.html'; }

// --- CATÁLOGO ---
async function cargarCatalogo() {
    if (todosLosProductos.length === 0) {
        const res = await fetch('/api/perfumes'); 
        todosLosProductos = await res.json();
    }
    renderizarFiltros();
    renderizarProductos(categoriaActual);
}

function renderizarFiltros() {
    const container = document.getElementById('filtros-categoria');
    if (!container) return;
    const categorias = ['Todas', ...new Set(todosLosProductos.map(p => p.categoria))];
    container.innerHTML = categorias.map(c => `<button class="filter-btn ${c === categoriaActual ? 'active' : ''}" onclick="filtrarPor('${c}')">${c === 'Todas' ? (idioma === 'pt' ? 'Todas' : 'Todas') : c}</button>`).join('');
}

function filtrarPor(cat) { categoriaActual = cat; renderizarFiltros(); renderizarProductos(cat); }

async function renderizarProductos(categoria) {
    const container = document.getElementById('catalogo');
    container.innerHTML = '<div class="products-grid fade-in" id="grid-productos"></div>';
    const grid = document.getElementById('grid-productos');
    const filtrados = categoria === 'Todas' ? todosLosProductos : todosLosProductos.filter(p => p.categoria === categoria);

    if (filtrados.length === 0) { grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#6b7280; font-size:1.1rem; padding: 30px;">${textos[idioma].sinProd}</p>`; return; }

    for (const p of filtrados) {
        const resenasReq = await fetch(`/api/perfumes/${p.id}/resenas`);
        const resenas = await resenasReq.json();
        
        let pText = '', tHTML = '';
        if (resenas.length > 0) {
            const prom = (resenas.reduce((a, b) => a + b.estrellas, 0) / resenas.length).toFixed(1);
            pText = `⭐ ${prom} (${resenas.length})`;
            const msg = resenas[0].comentario.substring(0, 50) + (resenas[0].comentario.length > 50 ? '...' : '');
            tHTML = `<span class="stars-tooltip">"${msg}"<br><small style="color:#9ca3af;">- ${resenas[0].nombre}</small></span>`;
        } else {
            pText = `⭐ ${textos[idioma].nuevo}`; tHTML = `<span class="stars-tooltip">${textos[idioma].sePrimero}</span>`;
        }

        const linkProd = `${window.location.origin}/producto.html?id=${p.id}`;
        const msgWaText = idioma === 'pt' ? `Olha este produto na Jart's Shop!\n${p.nombre} por ${formatPrecio(p.precio)}\n\nVeja aqui: ${linkProd}` : `¡Mirá este producto en Jart's Shop!\n${p.nombre} a ${formatPrecio(p.precio)}\n\nPodés verlo acá: ${linkProd}`;
        const linkWA = getWaLink(msgWaText);

        grid.innerHTML += `
            <div class="product-card">
                <a href="/producto.html?id=${p.id}" style="text-decoration:none; color:inherit; display:block;">
                    <img src="${p.imagen_url}" alt="${p.nombre}"> 
                    <h3>${p.nombre}</h3>
                </a>
                <div class="stars-container" onclick="abrirResenas(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">${pText}${tHTML}</div>
                <p style="color:#6b7280; font-size:0.9rem; margin-bottom:15px; min-height: 40px; line-height: 1.4;">${p.descripcion ? p.descripcion.substring(0, 60) + '...' : ''}</p>
                <p style="font-weight:700; font-size:1.4rem; margin-bottom:15px; color:#1f2937;">${formatPrecio(p.precio)}</p>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button class="btn-add" onclick="agregarAlCarrito(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', ${p.precio})" style="margin:0;">${textos[idioma].agregar}</button>
                    <a href="${linkWA}" target="_blank" class="btn-add" style="margin:0; background:#25d366; color:white; text-decoration:none; display:flex; justify-content:center; align-items:center; gap:8px;"><i class="fab fa-whatsapp" style="font-size:1.1rem;"></i> ${idioma === 'pt' ? 'Compartilhar' : 'Compartir'}</a>
                </div>
            </div>`;
    }
}

// --- RESEÑAS ---
async function abrirResenas(id, nombre) {
    const modal = document.getElementById('modal-resenas');
    if(!modal) return;
    document.getElementById('r-perfume-id').value = id;
    document.getElementById('resena-titulo').innerText = idioma==='pt'?`Avaliações: ${nombre}`:`Opiniones: ${nombre}`;
    modal.style.display = 'block'; cargarResenas(id);
}
function cerrarResenas() { document.getElementById('modal-resenas').style.display = 'none'; }
async function cargarResenas(id) {
    const res = await fetch(`/api/perfumes/${id}/resenas`);
    const resenas = await res.json();
    const div = document.getElementById('lista-resenas');
    div.innerHTML = resenas.length === 0 ? `<p style="color:#6b7280; text-align:center;">${textos[idioma].sePrimero}</p>` : resenas.map(r => `
        <div style="border-bottom:1px solid #e5e7eb; padding:12px 0;">
            <strong style="color:#1f2937;">${r.nombre}</strong> <span style="color:#d4af37; font-size:0.9rem;">${'⭐'.repeat(r.estrellas)}</span><br>
            <small style="color:#4b5563; font-size:0.9rem; display:block; margin-top:4px;">${r.comentario}</small>
        </div>
    `).join('');
}
async function enviarResena() {
    const id = document.getElementById('r-perfume-id').value, nombre = document.getElementById('r-nombre').value, estrellas = document.getElementById('r-estrellas').value, comentario = document.getElementById('r-comentario').value;
    if (!nombre || !comentario) return;
    await fetch(`/api/perfumes/${id}/resenas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, estrellas, comentario }) });
    document.getElementById('r-nombre').value = ''; document.getElementById('r-comentario').value = '';
    cargarResenas(id); renderizarProductos(categoriaActual);
}

document.addEventListener('DOMContentLoaded', initConfig);