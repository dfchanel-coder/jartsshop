let carrito = [];
let metodoPagoSeleccionado = 'mercadopago';
const mp = new MercadoPago('TU_PUBLIC_KEY_AQUI'); // PONER CLAVE PUBLICA MP

async function cargarCatalogo() {
    const res = await fetch('/api/perfumes');
    const perfumes = await res.json();
    const container = document.getElementById('catalogo');
    container.innerHTML = '';

    const grupos = {};
    perfumes.forEach(p => {
        if (!grupos[p.categoria]) grupos[p.categoria] = [];
        grupos[p.categoria].push(p);
    });

    for (const [cat, items] of Object.entries(grupos)) {
        const section = document.createElement('div');
        section.innerHTML = `<h2 class="category-title">${cat}</h2><div class="products-grid"></div>`;
        const grid = section.querySelector('.products-grid');
        
        for (const p of items) {
            // Cargar reseñas para promedio y tooltip
            const resenasReq = await fetch(`/api/perfumes/${p.id}/resenas`);
            const resenas = await resenasReq.json();
            
            let pText = '', tHTML = '';
            if (resenas.length > 0) {
                const prom = (resenas.reduce((a, b) => a + b.estrellas, 0) / resenas.length).toFixed(1);
                pText = `⭐ ${prom} (${resenas.length})`;
                const msg = resenas[0].comentario.substring(0, 50) + '...';
                tHTML = `<span class="stars-tooltip">"${msg}"<br><small>- ${resenas[0].nombre}</small><br><em>Clic para leer más</em></span>`;
            } else {
                pText = `⭐ Nuevo`;
                tHTML = `<span class="stars-tooltip">Sé el primero en opinar<br><em>Clic para comentar</em></span>`;
            }

            const linkProd = `${window.location.origin}/producto.html?id=${p.id}`;
            const linkWA = encodeURIComponent(`¡Mirá este perfume!\n${p.nombre} a $${p.precio}\n${linkProd}`);

            grid.innerHTML += `
                <div class="product-card">
                    <a href="/producto.html?id=${p.id}" style="text-decoration:none; color:inherit;">
                        <img src="${p.imagen_url}"> <h3 style="margin-bottom:5px;">${p.nombre}</h3>
                    </a>
                    <div class="stars-container" onclick="abrirResenas(${p.id}, '${p.nombre}')">${pText}${tHTML}</div>
                    <p style="color:#888; font-size:0.9rem; min-height:40px;">${p.descripcion ? p.descripcion.substring(0, 50) + '...' : ''}</p>
                    <p style="font-weight:bold; font-size:1.3rem; margin-bottom:15px; color:#d4af37;">$${p.precio}</p>
                    
                    <div style="display:flex; gap:8px;">
                        <button class="btn-add" onclick="agregarAlCarrito(${p.id}, '${p.nombre}', ${p.precio})" style="flex:3; margin:0;">Agregar</button>
                        <a href="https://wa.me/?text=${linkWA}" target="_blank" class="btn-add" style="flex:1; margin:0; background:#25d366; text-decoration:none; display:flex; justify-content:center; align-items:center;"><i class="fab fa-whatsapp"></i></a>
                    </div>
                </div>`;
        }
        container.appendChild(section);
    }
}

// Reseñas Modal
async function abrirResenas(id, nombre) {
    document.getElementById('r-perfume-id').value = id;
    document.getElementById('resena-titulo').innerText = `Opiniones: ${nombre}`;
    document.getElementById('modal-resenas').style.display = 'block';
    cargarResenas(id);
}
function cerrarResenas() { document.getElementById('modal-resenas').style.display = 'none'; }
async function cargarResenas(id) {
    const res = await fetch(`/api/perfumes/${id}/resenas`);
    const resenas = await res.json();
    const div = document.getElementById('lista-resenas');
    div.innerHTML = resenas.length === 0 ? '<p style="color:#888; text-align:center;">Aún no hay reseñas.</p>' : resenas.map(r => `
        <div style="border-bottom:1px solid #f0f0f0; padding:10px 0;"><strong>${r.nombre}</strong> <span style="color:#d4af37;">${'⭐'.repeat(r.estrellas)}</span><br><small style="color:#555;">${r.comentario}</small></div>
    `).join('');
}
async function enviarResena() {
    const id = document.getElementById('r-perfume-id').value;
    const nombre = document.getElementById('r-nombre').value, estrellas = document.getElementById('r-estrellas').value, comentario = document.getElementById('r-comentario').value;
    if (!nombre || !comentario) return alert('Datos incompletos.');
    await fetch(`/api/perfumes/${id}/resenas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre, estrellas, comentario }) });
    document.getElementById('r-nombre').value = ''; document.getElementById('r-comentario').value = ''; cargarResenas(id); cargarCatalogo();
}

// Carrito
function toggleCart() { const m = document.getElementById('cart-modal'); m.style.display = m.style.display === 'block' ? 'none' : 'block'; }
function agregarAlCarrito(id, title, unit_price) {
    const ex = carrito.find(i => i.id === id);
    if (ex) ex.quantity++; else carrito.push({ id, title, unit_price, quantity: 1 });
    actualizarCarritoUI(); toggleCart();
}
function actualizarCarritoUI() {
    document.getElementById('cart-count').innerText = carrito.reduce((a, b) => a + b.quantity, 0);
    const div = document.getElementById('cart-items');
    div.innerHTML = carrito.length === 0 ? '<p style="text-align:center;">Carrito vacío</p>' : carrito.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
            <div style="flex:1;"><strong>${item.title}</strong><br><small>$${item.unit_price} c/u</small></div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button onclick="restarItem(${idx})" style="background:#f0f0f0; border:none; width:28px; height:28px; border-radius:50%; cursor:pointer;">-</button>
                <span style="font-weight:600;">${item.quantity}</span>
                <button onclick="sumarItem(${idx})" style="background:#222; border:none; width:28px; height:28px; border-radius:50%; cursor:pointer; color:white;">+</button>
            </div>
            <div style="text-align:right;"><strong>$${item.unit_price * item.quantity}</strong><br><small onclick="eliminarItem(${idx})" style="color:red; cursor:pointer;">Quitar</small></div>
        </div>
    `).join('');
    document.getElementById('cart-total').innerText = carrito.reduce((a, b) => a + (b.unit_price * b.quantity), 0);
}
function sumarItem(idx) { carrito[idx].quantity++; actualizarCarritoUI(); }
function restarItem(idx) { if (carrito[idx].quantity > 1) carrito[idx].quantity--; else if (confirm('¿Eliminar?')) carrito.splice(idx, 1); actualizarCarritoUI(); }
function eliminarItem(idx) { carrito.splice(idx, 1); actualizarCarritoUI(); }

// Checkout
function selectPago(m) {
    metodoPagoSeleccionado = m;
    document.getElementById('opt-mp').classList.toggle('selected', m === 'mercadopago');
    document.getElementById('opt-transf').classList.toggle('selected', m === 'transferencia');
    document.getElementById('wallet_container').innerHTML = ''; document.getElementById('info-transferencia').style.display = 'none';
}
async function finalizarCompra() {
    const nombre = document.getElementById('c-nombre').value, tel = document.getElementById('c-tel').value, dir = document.getElementById('c-dir').value;
    if (!nombre || !tel || !dir || carrito.length === 0) return alert('Completa datos y agrega productos.');
    const res = await fetch('/api/nueva-orden', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: carrito, comprador: { nombre, telefono: tel, direccion: dir }, metodo_pago: metodoPagoSeleccionado }) });
    const data = await res.json();
    if (data.error) return alert(data.error);
    if (data.type === 'mp') mp.bricks().create("wallet", "wallet_container", { initialization: { preferenceId: data.id } });
    else if (data.type === 'transfer') {
        document.getElementById('info-transferencia').style.display = 'block';
        document.getElementById('btn-whatsapp-pedido').href = `https://wa.me/59899822758?text=${encodeURIComponent('Hola! Hice un pedido #' + data.id + '. Te envío comprobante.')}`;
        alert('Pedido OK. Realiza transferencia.');
    }
}
cargarCatalogo();