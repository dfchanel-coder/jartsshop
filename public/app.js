if (localStorage.getItem('jarts_carrito')) {
    const tempCart = JSON.parse(localStorage.getItem('jarts_carrito'));
    if (tempCart.length > 0 && !tempCart[0].categoria) {
        localStorage.removeItem('jarts_carrito'); 
    }
}

let carrito = JSON.parse(localStorage.getItem('jarts_carrito')) || [];
let todosLosProductos = []; 
let categoriaActual = 'Todas';
let subcategoriaActual = 'Todas'; 

// Lógica de Paginación
let itemsMostrados = 12; 

let cotizacionBRL = 8.50; 
let monedaActual = localStorage.getItem('jarts_moneda') || 'UYU';
let idioma = monedaActual === 'BRL' ? 'pt' : 'es';
const WA_UY = '59899822758';
const WA_BR = '5555996679276';

const textos = {
    es: { vacio: "Tu carrito está vacío", quitar: "Quitar", agregar: "Agregar al Carrito", nuevo: "Nuevo", sePrimero: "Sé el primero en opinar", sinProd: "No hay productos en esta categoría.", agotado: "Sin Stock", agregado: "¡Agregado al carrito!", sinBusqueda: "No se encontraron resultados.", limitePerfumes: "Límite máximo: 2 perfumes por pedido.", cargarMas: "Cargar más productos <i class='fa fa-chevron-down'></i>" },
    pt: { vacio: "Seu carrinho está vazio", quitar: "Remover", agregar: "Adicionar ao Carrinho", novo: "Novo", sePrimeiro: "Seja o primeiro a avaliar", sinProd: "Nenhum produto encontrado nesta categoria.", agotado: "Esgotado", agregado: "Adicionado ao carrinho!", sinBusqueda: "Nenhum resultado encontrado.", limitePerfumes: "Limite máximo: 2 perfumes por pedido.", cargarMas: "Carregar mais produtos <i class='fa fa-chevron-down'></i>" }
};

async function initConfig() {
    try {
        const res = await fetch('/api/configuracion?t=' + new Date().getTime(), { cache: 'no-store' });
        const data = await res.json();
        cotizacionBRL = data.cotizacion || 8.50;
        
        const topBar = document.getElementById('top-announcement');
        if (topBar && data.mensaje_envios && data.mensaje_envios.trim() !== '') {
            topBar.innerText = data.mensaje_envios;
            topBar.style.display = 'block';
        }

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
    
    if (document.getElementById('catalogo')) {
        cargarCatalogo();
        configurarBuscador();
    }
    if (document.getElementById('producto-detalle')) cargarProductoIndividual();
}

function inyectarBotonMoneda() {
    if (document.getElementById('btn-moneda')) return;
    const div = document.createElement('div');
    div.innerHTML = `<button id="btn-moneda" onclick="cambiarMoneda()" style="background:var(--card-bg); border:1px solid var(--border); padding:8px 15px; border-radius:20px; cursor:pointer; font-weight:600; color:var(--text); font-size:1.05rem; transition:0.3s; font-family:'Inter', sans-serif;">${monedaActual === 'UYU' ? '🇺🇾 UYU' : '🇧🇷 BRL'}</button>`;
    
    const headerActions = document.querySelector('.header-actions');
    const header = document.querySelector('header');
    
    if (headerActions) {
        headerActions.insertBefore(div, headerActions.querySelector('.cart-icon'));
    } else if (header) {
        div.style.marginLeft = 'auto'; 
        div.style.marginRight = '20px';
        const cartIcon = header.querySelector('.cart-icon');
        if (cartIcon) header.insertBefore(div, cartIcon);
        else header.appendChild(div);
    }
}

function cambiarMoneda() {
    monedaActual = monedaActual === 'UYU' ? 'BRL' : 'UYU';
    localStorage.setItem('jarts_moneda', monedaActual);
    location.reload(); 
}

function aplicarTraduccionesDOM() { 
    document.querySelectorAll('[data-es]').forEach(el => {
        if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = el.getAttribute(`data-${idioma}`);
        } else {
            el.innerText = el.getAttribute(`data-${idioma}`);
        }
    }); 
}

function formatPrecio(precioBaseUYU) { return monedaActual === 'BRL' ? `R$ ${(precioBaseUYU / cotizacionBRL).toFixed(2)}` : `$ ${precioBaseUYU}`; }
function getWaLink(texto) { return `https://wa.me/${monedaActual === 'BRL' ? WA_BR : WA_UY}?text=${encodeURIComponent(texto)}`; }
function actualizarLinkWhatsApp() { const waFloat = document.getElementById('wa-float'); if (waFloat) waFloat.href = `https://wa.me/${monedaActual === 'BRL' ? WA_BR : WA_UY}`; }

function showToast(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = tipo === 'success' ? `<i class="fa fa-check-circle" style="font-size:1.2rem; color:#10b981;"></i> ${mensaje}` : `<i class="fa fa-exclamation-circle" style="font-size:1.2rem; color:#ef4444;"></i> ${mensaje}`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 400); }, 3000);
}

async function compartirProducto(titulo, texto, url) {
    if (navigator.share) {
        try { await navigator.share({ title: titulo, text: texto, url: url }); } catch (err) {}
    } else {
        navigator.clipboard.writeText(texto + " " + url).then(() => { showToast(idioma === 'pt' ? 'Link copiado!' : '¡Enlace copiado!', 'success'); });
    }
}

function guardarCarrito() { localStorage.setItem('jarts_carrito', JSON.stringify(carrito)); actualizarCarritoUI(); }

function agregarAlCarrito(id, title, unit_price, categoria) {
    if (categoria === 'Perfumes') {
        const cantidadDePerfumesEnCarrito = carrito.filter(item => item.categoria === 'Perfumes').reduce((suma, item) => suma + item.quantity, 0);
        if (cantidadDePerfumesEnCarrito >= 2) {
            showToast(textos[idioma].limitePerfumes, 'error');
            return; 
        }
    }
    const existe = carrito.find(i => i.id === id);
    if (existe) existe.quantity++; else carrito.push({ id, title, unit_price, quantity: 1, categoria: categoria });
    guardarCarrito(); 
    showToast(textos[idioma].agregado, 'success');
}

function actualizarCarritoUI() {
    const countEl = document.getElementById('cart-count');
    if (countEl) {
        const totalItems = carrito.reduce((a, b) => a + b.quantity, 0);
        countEl.innerText = totalItems;
        countEl.style.transform = 'scale(1.3)';
        setTimeout(() => countEl.style.transform = 'scale(1)', 200);
    }
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

function sumarItem(index) { 
    if (carrito[index].categoria === 'Perfumes') {
        const cantidadDePerfumesEnCarrito = carrito.filter(item => item.categoria === 'Perfumes').reduce((suma, item) => suma + item.quantity, 0);
        if (cantidadDePerfumesEnCarrito >= 2) {
            showToast(textos[idioma].limitePerfumes, 'error');
            return;
        }
    }
    carrito[index].quantity++; 
    guardarCarrito(); 
}

function restarItem(index) { if (carrito[index].quantity > 1) carrito[index].quantity--; else { carrito.splice(index, 1); } guardarCarrito(); }
function eliminarItem(idx) { carrito.splice(idx, 1); guardarCarrito(); }
function vaciarCarrito() { carrito = []; guardarCarrito(); }
function toggleCart() { const modal = document.getElementById('cart-modal'); if (modal) modal.style.display = modal.style.display === 'block' ? 'none' : 'block'; }
function irAlCheckout() { window.location.href = '/checkout.html'; }

function configurarBuscador() {
    const inputBuscador = document.getElementById('buscador-productos');
    if (!inputBuscador) return;
    inputBuscador.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        itemsMostrados = 12; // Resetea la paginación al buscar
        renderizarProductos(categoriaActual, subcategoriaActual, query);
    });
}

async function cargarCatalogo() {
    if (todosLosProductos.length === 0) {
        const res = await fetch('/api/perfumes?t=' + new Date().getTime()); 
        todosLosProductos = await res.json();
    }
    renderizarFiltros();
    renderizarProductos(categoriaActual, subcategoriaActual);
}

function renderizarFiltros() {
    const container = document.getElementById('filtros-categoria');
    if (!container) return;
    
    const categorias = ['Todas', ...new Set(todosLosProductos.map(p => p.categoria))];
    let html = '<div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; width:100%;">';
    html += categorias.map(c => `<button class="filter-btn ${c === categoriaActual ? 'active' : ''}" onclick="filtrarPor('${c}')">${c === 'Todas' ? (idioma === 'pt' ? 'Todas' : 'Todas') : c}</button>`).join('');
    html += '</div>';

    if (categoriaActual !== 'Todas') {
        const prodsDeCat = todosLosProductos.filter(p => p.categoria === categoriaActual);
        const subcategoriasRaw = [...new Set(prodsDeCat.map(p => p.subcategoria))].filter(s => s && s.trim() !== '');
        
        if (subcategoriasRaw.length > 0) {
            const subcategorias = ['Todas', ...subcategoriasRaw];
            html += '<div class="fade-in" style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap; width:100%; margin-top: 15px; border-top: 1px dashed var(--border); padding-top: 15px; max-width: 600px;">';
            html += subcategorias.map(s => {
                const btnLabel = s === 'Todas' ? (idioma === 'pt' ? 'Ver Tudo' : 'Ver Todo') : s;
                const bg = s === subcategoriaActual ? 'var(--accent)' : 'rgba(255,255,255,0.05)';
                const color = s === subcategoriaActual ? 'white' : 'var(--text-muted)';
                const border = s === subcategoriaActual ? 'var(--accent)' : 'var(--border)';
                return `<button style="padding: 8px 18px; border-radius: 20px; border: 1px solid ${border}; background: ${bg}; color: ${color}; font-size: 0.85rem; cursor: pointer; transition: 0.3s; font-weight: 600; font-family:'Inter', sans-serif;" onclick="filtrarPorSub('${s}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='${border}'">${btnLabel}</button>`;
            }).join('');
            html += '</div>';
        }
    }
    container.innerHTML = html;
}

function filtrarPor(cat) { 
    categoriaActual = cat; subcategoriaActual = 'Todas'; itemsMostrados = 12; // RESETEA PAGINACIÓN
    const buscador = document.getElementById('buscador-productos');
    if(buscador) buscador.value = ''; 
    renderizarFiltros(); renderizarProductos(cat, subcategoriaActual); 
}

function filtrarPorSub(subcat) {
    subcategoriaActual = subcat; itemsMostrados = 12; // RESETEA PAGINACIÓN
    const buscador = document.getElementById('buscador-productos');
    if(buscador) buscador.value = ''; 
    renderizarFiltros(); renderizarProductos(categoriaActual, subcat);
}

// FIX: Botón "Cargar Más" blindado
function cargarMas() {
    itemsMostrados += 12;
    const buscador = document.getElementById('buscador-productos');
    const query = buscador ? buscador.value.trim() : '';
    renderizarProductos(categoriaActual, subcategoriaActual, query);
}

async function renderizarProductos(categoriaSeleccionada, subcategoriaSeleccionada = 'Todas', searchQuery = '') {
    const container = document.getElementById('catalogo');
    if (!container) return; // Evita errores si no está en la página principal
    
    if (!document.getElementById('grid-container-main')) {
        container.innerHTML = '<div class="fade-in" id="grid-container-main"></div>';
    }
    const mainContainer = document.getElementById('grid-container-main');

    let filtrados = [];
    if (searchQuery !== '') {
        filtrados = todosLosProductos.filter(p => p.nombre.toLowerCase().includes(searchQuery) || (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery)));
    } else {
        let base = categoriaSeleccionada === 'Todas' ? todosLosProductos : todosLosProductos.filter(p => p.categoria === categoriaSeleccionada);
        if (subcategoriaSeleccionada !== 'Todas') base = base.filter(p => p.subcategoria === subcategoriaSeleccionada);
        filtrados = base;
    }

    if (filtrados.length === 0) { 
        const msjVacio = searchQuery !== '' ? textos[idioma].sinBusqueda : textos[idioma].sinProd;
        mainContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:1.1rem; padding: 50px;"><i class="fa fa-search" style="font-size:2rem; margin-bottom:15px; display:block; opacity:0.5;"></i>${msjVacio}</p>`; 
        return; 
    }

    // CORTE DE PAGINACIÓN
    const productosAMostrar = filtrados.slice(0, itemsMostrados);
    let htmlAcumulado = '';

    if (searchQuery !== '') {
        const tituloBusqueda = idioma === 'pt' ? 'Resultados da Pesquisa' : 'Resultados de Búsqueda';
        htmlAcumulado += `<h2 style="margin-top: 20px; margin-bottom: 25px; font-size: 1.5rem; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 10px;">${tituloBusqueda}</h2><div class="products-grid">`;
        htmlAcumulado += generarTarjetasHTML(productosAMostrar);
        htmlAcumulado += `</div>`;
    } else {
        const categoriasARenderizar = categoriaSeleccionada === 'Todas' ? [...new Set(productosAMostrar.map(p => p.categoria))] : [categoriaSeleccionada]; 
        for (const cat of categoriasARenderizar) {
            const productosDeCategoria = productosAMostrar.filter(p => p.categoria === cat);
            if (productosDeCategoria.length > 0) {
                if (categoriaSeleccionada === 'Todas') {
                    htmlAcumulado += `<h2 style="margin-top: 50px; margin-bottom: 25px; font-size: 1.8rem; color: var(--text); border-bottom: 2px solid var(--border); padding-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight:700;">${cat}</h2>`;
                }
                const subcategoriasARenderizar = subcategoriaSeleccionada === 'Todas' ? [...new Set(productosDeCategoria.map(p => p.subcategoria || ''))] : [subcategoriaSeleccionada];
                for (const sub of subcategoriasARenderizar) {
                    const prodSub = productosDeCategoria.filter(p => (p.subcategoria || '') === sub);
                    if (prodSub.length > 0) {
                        if (sub !== '' && subcategoriaSeleccionada === 'Todas') {
                            htmlAcumulado += `<h3 style="margin-top: 20px; margin-bottom: 15px; font-size: 1.3rem; color: var(--accent); border-bottom: 1px dashed var(--border); padding-bottom: 5px; width: fit-content;">${sub}</h3>`;
                        }
                        htmlAcumulado += `<div class="products-grid">` + generarTarjetasHTML(prodSub) + `</div>`;
                    }
                }
            }
        }
    }
    
    // Inyectar Botón "Cargar Más" si quedaron productos afuera
    if (filtrados.length > itemsMostrados) {
        htmlAcumulado += `
            <div style="text-align:center; margin-top: 40px; margin-bottom: 20px;">
                <button onclick="cargarMas()" class="btn-add" style="width:auto; padding: 14px 40px; border-radius: 30px; font-size: 1rem; background: var(--card-bg); border: 1px solid var(--accent); color: var(--text); box-shadow: 0 5px 15px rgba(0,0,0,0.2); transition: 0.3s;" onmouseover="this.style.background='var(--accent)'; this.style.color='white';" onmouseout="this.style.background='var(--card-bg)'; this.style.color='var(--text)';">
                    ${textos[idioma].cargarMas}
                </button>
            </div>`;
    }

    mainContainer.innerHTML = htmlAcumulado;

    // FIX: Activamos el Scroll Reveal al terminar de pintar las tarjetas
    iniciarScrollReveal();

    productosAMostrar.forEach(async (p) => {
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

function generarTarjetasHTML(arrayDeProductos) {
    let html = '';
    for (const p of arrayDeProductos) {
        const linkProd = `${window.location.origin}/producto.html?id=${p.id}`;
        const shareText = idioma === 'pt' ? `Olha este produto na Jart's Shop! ${p.nombre} por ${formatPrecio(p.precio)}` : `¡Mirá este producto en Jart's Shop! ${p.nombre} a ${formatPrecio(p.precio)}`;
        const safeShareText = shareText.replace(/'/g, "\\'");
        const safeNombre = p.nombre.replace(/'/g, "\\'");
        const safeCat = p.categoria.replace(/'/g, "\\'");

        // FIX: Agregamos la clase "reveal" para la animación al hacer scroll
        html += `
            <div class="product-card reveal ${!p.activo ? 'agotado' : ''}">
                <a href="/producto.html?id=${p.id}" style="text-decoration:none; color:inherit; display:block; position:relative;">
                    ${!p.activo ? `<div style="position:absolute; top:10px; right:10px; background:#ef4444; color:white; padding:4px 10px; border-radius:6px; font-weight:bold; font-size:0.8rem; z-index:2;">${textos[idioma].agotado}</div>` : ''}
                    <img src="${p.imagen_url}" alt="${p.nombre}" loading="lazy" style="${!p.activo ? 'opacity:0.5; filter:grayscale(100%);' : ''}"> 
                    <h3>${p.nombre}</h3>
                </a>
                <div class="stars-container" id="stars-${p.id}" onclick="abrirResenas(${p.id}, '${safeNombre}')">
                    <span style="color:var(--text-muted); font-size:0.8rem;"><i class="fa fa-spinner fa-spin"></i> Cargando...</span>
                </div>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:15px; min-height: 40px; line-height: 1.4;">${p.descripcion ? p.descripcion.substring(0, 60) + '...' : ''}</p>
                <p style="font-weight:700; font-size:1.4rem; margin-bottom:15px; color:var(--text);">${formatPrecio(p.precio)}</p>
                <div style="display:flex; gap:10px; margin-top:auto;">
                    <button class="btn-add" style="flex:1; ${!p.activo ? 'background:var(--border); color:var(--text-muted); cursor:not-allowed;' : ''}" ${p.activo ? `onclick="agregarAlCarrito(${p.id}, '${safeNombre}', ${p.precio}, '${safeCat}')"` : 'disabled'}>${p.activo ? textos[idioma].agregar : textos[idioma].agotado}</button>
                    <button onclick="compartirProducto('${safeNombre}', '${safeShareText}', '${linkProd}')" class="btn-share" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); color:var(--text); width:44px; height:44px; border-radius:8px; display:flex; justify-content:center; align-items:center; cursor:pointer; transition:0.3s;" title="Compartir" onmouseover="this.style.background='#25d366'; this.style.color='white'; this.style.borderColor='#25d366';" onmouseout="this.style.background='rgba(255,255,255,0.05)'; this.style.color='var(--text)'; this.style.borderColor='var(--border)';"><i class="fas fa-share-nodes"></i></button>
                </div>
            </div>`;
    }
    return html;
}

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
        document.getElementById('p-btn-add').onclick = () => agregarAlCarrito(p.id, p.nombre, p.precio, p.categoria);
    }

    const shareText = idioma === 'pt' ? `Olha este produto na Jart's Shop! ${p.nombre} por ${formatPrecio(p.precio)}` : `¡Mirá este produto en Jart's Shop! ${p.nombre} a ${formatPrecio(p.precio)}`;
    const shareUrl = window.location.href;
    const btnShare = document.getElementById('p-btn-wa');
    if (btnShare) {
        btnShare.removeAttribute('href'); btnShare.removeAttribute('target'); btnShare.style.cursor = 'pointer';
        btnShare.onclick = (e) => { e.preventDefault(); compartirProducto(p.nombre, shareText, shareUrl); };
    }
    
    cargarResenasProducto(id);
}

async function cargarResenasProducto(id) {
    const res = await fetch(`/api/perfumes/${id}/resenas`);
    const resenas = await res.json();
    const div = document.getElementById('lista-resenas-prod');
    div.innerHTML = resenas.length === 0 ? `<p style="color:var(--text-muted);">${textos[idioma].sePrimero}</p>` : resenas.map(r => `<div style="border-bottom:1px solid var(--border); padding:15px 0;"><strong style="color:var(--text);">${r.nombre}</strong> <span style="color:var(--gold); font-size:0.9rem;">${'⭐'.repeat(r.estrellas)}</span><br><p style="color:var(--text-muted); font-size:0.95rem; margin-top:8px;">${r.comentario}</p></div>`).join('');
}

async function abrirResenas(id, nombre) { const modal = document.getElementById('modal-resenas'); if(!modal) return; document.getElementById('r-perfume-id').value = id; document.getElementById('resena-titulo').innerText = idioma==='pt'?`Avaliações: ${nombre}`:`Opiniones: ${nombre}`; modal.style.display = 'block'; cargarResenas(id); }
function cerrarResenas() { document.getElementById('modal-resenas').style.display = 'none'; }
async function cargarResenas(id) { const res = await fetch(`/api/perfumes/${id}/resenas`); const resenas = await res.json(); const div = document.getElementById('lista-resenas'); div.innerHTML = resenas.length === 0 ? `<p style="color:var(--text-muted); text-align:center;">${textos[idioma].sePrimero}</p>` : resenas.map(r => `<div style="border-bottom:1px solid var(--border); padding:12px 0;"><strong style="color:var(--text);">${r.nombre}</strong> <span style="color:var(--gold); font-size:0.9rem;">${'⭐'.repeat(r.estrellas)}</span><br><small style="color:var(--text-muted); font-size:0.9rem; display:block; margin-top:4px;">${r.comentario}</small></div>`).join(''); }
async function enviarResena() { const id = document.getElementById('r-perfume-id').value, nombre = document.getElementById('r-nombre').value, estrellas = document.getElementById('r-estrellas').value, comentario = document.getElementById('r-comentario').value; if (!nombre || !comentario) return; await fetch(`/api/perfumes/${id}/resenas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, estrellas, comentario }) }); document.getElementById('r-nombre').value = ''; document.getElementById('r-comentario').value = ''; cargarResenas(id); renderizarProductos(categoriaActual, subcategoriaActual); }

// FIX: Función de Animación al hacer Scroll
function iniciarScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('.reveal:not(.active)').forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', initConfig);