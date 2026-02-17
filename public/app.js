let carrito = JSON.parse(localStorage.getItem('jarts_carrito')) || [];
let todosLosProductos = []; 
let categoriaActual = 'Todas';

// --- MULTIMONEDA E IDIOMA ---
let cotizacionBRL = 8.50; 
let monedaActual = localStorage.getItem('jarts_moneda') || 'UYU';
let idioma = monedaActual === 'BRL' ? 'pt' : 'es';
const WA_UY = '59899822758';
const WA_BR = '5555996679276';

const textos = {
    es: { vacio: "Tu carrito está vacío", quitar: "Quitar", agregar: "Agregar al Carrito", nuevo: "Nuevo", sePrimero: "Sé el primero en opinar", sinProd: "No hay productos en esta categoría.", agotado: "Sin Stock" },
    pt: { vacio: "Seu carrinho está vazio", quitar: "Remover", agregar: "Adicionar ao Carrinho", novo: "Novo", sePrimeiro: "Seja o primeiro a avaliar", sinProd: "Nenhum produto encontrado nesta categoria.", agotado: "Esgotado" }
};

async function initConfig() {
    try {
        const res = await fetch('/api/configuracion?t=' + new Date().getTime(), { cache: 'no-store' });
        const data = await res.json();
        cotizacionBRL = data.cotizacion || 8.50;
        
        const bannerSection = document.getElementById('banner-section');
        if (bannerSection && data.banner_url && data.banner_url.trim() !== '') {
            bannerSection.innerHTML = `<div class="banner-container fade-in"><img src="${data.banner_url}" alt="Banner Promocional"></div>`;
            bannerSection.style.display = 'block';
        }
    } catch (e) { console.error('Error config', e); }
    
    inyectarBotonMoneda();
    aplicarTraduccionesDOM();
    actualizarCarritoUI();
    actualizarLinkWhatsApp(); 
    if (document.getElementById('catalogo')) cargarCatalogo();
    if (document.getElementById('producto-detalle')) cargarProductoIndividual();
}

function inyectarBotonMoneda() {
    const header = document.querySelector('header');
    if (!header || document.getElementById('btn-moneda')) return;
    const div = document.createElement('div');
    div.style.marginLeft = 'auto'; div.style.marginRight = '20px';
    div.innerHTML = `<button id="btn-moneda" onclick="cambiarMoneda()" style="background:var(--card-bg); border:1px solid var(--border); padding:8px 15px; border-radius:20px; cursor:pointer; font-weight:600; color:var(--text); font-size:1.05rem; transition:0.3s; font-family:'Inter', sans-serif;">${monedaActual === 'UYU' ? '🇺🇾 UYU' : '🇧🇷 BRL'}</button>`;
    header.insertBefore(div, header.querySelector('.cart-icon'));
}

function cambiarMoneda() {
    monedaActual = monedaActual === 'UYU' ? 'BRL' : 'UYU';
    localStorage.setItem('jarts_moneda', monedaActual);
    location.reload(); 
}

function aplicarTraduccionesDOM() { document.querySelectorAll('[data-es]').forEach(el => el.innerText = el.getAttribute(`data-${idioma}`)); }
function formatPrecio(precioBaseUYU) { return monedaActual === 'BRL' ? `R$ ${(precioBaseUYU / cotizacionBRL).toFixed(2)}` : `$ ${precioBaseUYU}`; }
function getWaLink(texto) { return `https://wa.me/${monedaActual === 'BRL' ? WA_BR : WA_UY}?text=${encodeURIComponent(texto)}`; }
function actualizarLinkWhatsApp() { const waFloat = document.getElementById('wa-float'); if (waFloat) waFloat.href = `https://wa.me/${monedaActual === 'BRL' ? WA_BR : WA_UY}`; }

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
        div.innerHTML = `<p style="text-align:center; color:var(--text-muted); margin:30px 0;">${textos[idioma].vacio}</p>`;
        document.getElementById('btn-ir-pagar').style.display = 'none';
    } else {
        document.getElementById('btn-ir-pagar').style.display = 'block';
        div.innerHTML = carrito.map((item, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:12px;">
                <div style="flex:1;"><strong style="font-size:0.95rem; color:var(--text);">${item.title}</strong><br><small style="color:var(--text-muted);">${formatPrecio(item.unit_price)} c/u</small></div>
                <div style="display:flex; align-items:center; gap:8px; margin:0 10px;">
                    <button onclick="restarItem(${idx})" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); width:28px; height:28px; border-radius:6px; cursor:pointer; font-weight:bold; color:var(--text);">-</button>
                    <span style="font-weight:600; min-width:20px; text-align:center; color:var(--text);">${item.quantity}</span>
                    <button onclick="sumarItem(${idx})" style="background:var(--accent); color:white; border:none; width:28px; height:28px; border-radius:6px; cursor:pointer; font-weight:bold;">+</button>
                </div>
                <div style="text-align:right;"><strong style="display:block; color:var(--text);">${formatPrecio(item.unit_price * item.quantity)}</strong><small onclick="eliminarItem(${idx})" style="color:#ef4444; cursor:pointer; text-decoration:underline; font-size:0.8rem; font-weight:600;">${textos[idioma].quitar}</small></div>
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
        const res = await fetch('/api/perfumes?t=' + new Date().getTime()); 
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

// LÓGICA DE RENDERIZADO TURBO 🚀
async function renderizarProductos(categoriaSeleccionada) {
    const container = document.getElementById('catalogo');
    container.innerHTML = '<div class="fade-in" id="grid-container-main"></div>';
    const mainContainer = document.getElementById('grid-container-main');

    if (todosLosProductos.length === 0 || (categoriaSeleccionada !== 'Todas' && !todosLosProductos.some(p => p.categoria === categoriaSeleccionada))) { 
        mainContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:1.1rem; padding: 30px;">${textos[idioma].sinProd}</p>`; 
        return; 
    }

    const categoriasARenderizar = categoriaSeleccionada === 'Todas' 
        ? [...new Set(todosLosProductos.map(p => p.categoria))] 
        : [categoriaSeleccionada]; 

    const filtrados = categoriaSeleccionada === 'Todas' ? todosLosProductos : todosLosProductos.filter(p => p.categoria === categoriaSeleccionada);
    let htmlAcumulado = '';

    for (const cat of categoriasARenderizar) {
        const productosDeCategoria = todosLosProductos.filter(p => p.categoria === cat);
        
        if (productosDeCategoria.length > 0) {
            if (categoriaSeleccionada === 'Todas') {
                htmlAcumulado += `<h2 style="margin-top: 50px; margin-bottom: 25px; font-size: 1.8rem; color: var(--text); border-bottom: 2px solid var(--border); padding-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight:700;">${cat}</h2>`;
            }
            htmlAcumulado += `<div class="products-grid">`;
            
            // Dibuja TODA la tarjeta instantáneamente (Nótese el loading="lazy" en la img)
            for (const p of productosDeCategoria) {
                const linkProd = `${window.location.origin}/producto.html?id=${p.id}`;
                const msgWaText = idioma === 'pt' ? `Olha este produto na Jart's Shop!\n${p.nombre} por ${formatPrecio(p.precio)}\n\nVeja aqui: ${linkProd}` : `¡Mirá este producto en Jart's Shop!\n${p.nombre} a ${formatPrecio(p.precio)}\n\nPodés verlo acá: ${linkProd}`;
                const linkWA = getWaLink(msgWaText);

                htmlAcumulado += `
                    <div class="product-card ${!p.activo ? 'agotado' : ''}">
                        <a href="/producto.html?id=${p.id}" style="text-decoration:none; color:inherit; display:block; position:relative;">
                            ${!p.activo ? `<div style="position:absolute; top:10px; right:10px; background:#ef4444; color:white; padding:4px 10px; border-radius:6px; font-weight:bold; font-size:0.8rem; z-index:2;">${textos[idioma].agotado}</div>` : ''}
                            <img src="${p.imagen_url}" alt="${p.nombre}" loading="lazy" style="${!p.activo ? 'opacity:0.5; filter:grayscale(100%);' : ''}"> 
                            <h3>${p.nombre}</h3>
                        </a>
                        <div class="stars-container" id="stars-${p.id}" onclick="abrirResenas(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
                            <span style="color:var(--text-muted); font-size:0.8rem;"><i class="fa fa-spinner fa-spin"></i> Cargando...</span>
                        </div>
                        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:15px; min-height: 40px; line-height: 1.4;">${p.descripcion ? p.descripcion.substring(0, 60) + '...' : ''}</p>
                        <p style="font-weight:700; font-size:1.4rem; margin-bottom:15px; color:var(--text);">${formatPrecio(p.precio)}</p>
                        <div style="display:flex; gap:10px; margin-top:auto;">
                            <button class="btn-add" style="flex:1; ${!p.activo ? 'background:var(--border); color:var(--text-muted); cursor:not-allowed;' : ''}" ${p.activo ? `onclick="agregarAlCarrito(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', ${p.precio})"` : 'disabled'}>${p.activo ? textos[idioma].agregar : textos[idioma].agotado}</button>
                            <a href="${linkWA}" target="_blank" class="btn-share" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); color:var(--text); width:44px; height:44px; border-radius:8px; display:flex; justify-content:center; align-items:center; text-decoration:none; transition:0.3s;" title="Compartir" onmouseover="this.style.background='#25d366'; this.style.color='white'; this.style.borderColor='#25d366';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='var(--text)'; this.style.borderColor='var(--border)';"><i class="fas fa-share-nodes"></i></a>
                        </div>
                    </div>`;
            }
            htmlAcumulado += `</div>`;
        }
    }
    
    // Inyecta el HTML en la pantalla de golpe
    mainContainer.innerHTML = htmlAcumulado;

    // MAGIA ASÍNCRONA: Descarga las estrellitas de fondo sin congelar la página
    filtrados.forEach(async (p) => {
        try {
            const resenasReq = await fetch(`/api/perfumes/${p.id}/resenas`);
            const resenas = await resenasReq.json();
            const starBox = document.getElementById(`stars-${p.id}`);
            if (!starBox) return;

            let pText = '', tHTML = '';
            if (resenas.length > 0) {
                const prom = (resenas.reduce((a, b) => a + b.estrellas, 0) / resenas.length).toFixed(1);
                pText = `⭐ ${prom} (${resenas.length})`;
                const msg = resenas[0].comentario.substring(0, 50) + (resenas[0].comentario.length > 50 ? '...' : '');
                tHTML = `<span class="stars-tooltip">"${msg}"<br><small style="color:var(--text-muted);">- ${resenas[0].nombre}</small></span>`;
            } else {
                pText = `⭐ ${textos[idioma].nuevo}`; tHTML = `<span class="stars-tooltip">${textos[idioma].sePrimero}</span>`;
            }
            starBox.innerHTML = pText + tHTML;
        } catch (error) { console.error('Error cargando reseña', error); }
    });
}

// --- PÁGINA DE PRODUCTO INDIVIDUAL ---
async function cargarProductoIndividual() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;

    const res = await fetch(`/api/perfumes/${id}`);
    const p = await res.json();
    
    document.getElementById('p-img').src = p.imagen_url;
    document.getElementById('p-nombre').innerText = p.nombre;
    document.getElementById('p-desc').innerText = p.descripcion;
    document.getElementById('p-precio').innerText = formatPrecio(p.precio);
    
    if(!p.activo) {
        const btn = document.getElementById('p-btn-add');
        btn.innerText = textos[idioma].agotado;
        btn.disabled = true;
        btn.style.background = 'var(--border)';
        btn.style.color = 'var(--text-muted)';
        btn.style.cursor = 'not-allowed';
    } else {
        document.getElementById('p-btn-add').innerText = textos[idioma].agregar;
        document.getElementById('p-btn-add').onclick = () => agregarAlCarrito(p.id, p.nombre, p.precio);
    }

    const msgWaText = idioma === 'pt' ? `Olha este produto na Jart's Shop!\n${p.nombre} por ${formatPrecio(p.precio)}\n\nVeja aqui: ${window.location.href}` : `¡Mirá este produto en Jart's Shop!\n${p.nombre} a ${formatPrecio(p.precio)}\n\nPodés verlo acá: ${window.location.href}`;
    document.getElementById('p-btn-wa').href = getWaLink(msgWaText);
    
    cargarResenasProducto(id);
}

async function cargarResenasProducto(id) {
    const res = await fetch(`/api/perfumes/${id}/resenas`);
    const resenas = await res.json();
    const div = document.getElementById('lista-resenas-prod');
    div.innerHTML = resenas.length === 0 ? `<p style="color:var(--text-muted);">${textos[idioma].sePrimero}</p>` : resenas.map(r => `
        <div style="border-bottom:1px solid var(--border); padding:15px 0;">
            <strong style="color:var(--text);">${r.nombre}</strong> <span style="color:var(--gold); font-size:0.9rem;">${'⭐'.repeat(r.estrellas)}</span><br>
            <p style="color:var(--text-muted); font-size:0.95rem; margin-top:8px;">${r.comentario}</p>
        </div>
    `).join('');
}

// --- RESEÑAS MODAL ---
async function abrirResenas(id, nombre) { const modal = document.getElementById('modal-resenas'); if(!modal) return; document.getElementById('r-perfume-id').value = id; document.getElementById('resena-titulo').innerText = idioma==='pt'?`Avaliações: ${nombre}`:`Opiniones: ${nombre}`; modal.style.display = 'block'; cargarResenas(id); }
function cerrarResenas() { document.getElementById('modal-resenas').style.display = 'none'; }
async function cargarResenas(id) { const res = await fetch(`/api/perfumes/${id}/resenas`); const resenas = await res.json(); const div = document.getElementById('lista-resenas'); div.innerHTML = resenas.length === 0 ? `<p style="color:var(--text-muted); text-align:center;">${textos[idioma].sePrimero}</p>` : resenas.map(r => `<div style="border-bottom:1px solid var(--border); padding:12px 0;"><strong style="color:var(--text);">${r.nombre}</strong> <span style="color:var(--gold); font-size:0.9rem;">${'⭐'.repeat(r.estrellas)}</span><br><small style="color:var(--text-muted); font-size:0.9rem; display:block; margin-top:4px;">${r.comentario}</small></div>`).join(''); }
async function enviarResena() { const id = document.getElementById('r-perfume-id').value, nombre = document.getElementById('r-nombre').value, estrellas = document.getElementById('r-estrellas').value, comentario = document.getElementById('r-comentario').value; if (!nombre || !comentario) return; await fetch(`/api/perfumes/${id}/resenas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, estrellas, comentario }) }); document.getElementById('r-nombre').value = ''; document.getElementById('r-comentario').value = ''; cargarResenas(id); renderizarProductos(categoriaActual); }

document.addEventListener('DOMContentLoaded', initConfig);