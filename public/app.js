let carrito = [];
let metodoPagoSeleccionado = 'mercadopago';
const mp = new MercadoPago('TU_PUBLIC_KEY_AQUI'); // ¡No olvides poner tu clave real aquí!

// --- 1. CARGA DEL CATÁLOGO ---
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
        
        items.forEach(p => {
            // Link para enviar por WhatsApp
            const linkProducto = `${window.location.origin}/producto.html?id=${p.id}`;
            const msjWhatsapp = encodeURIComponent(`¡Mirá este perfume que me encantó en Jart's!\n${p.nombre} a $${p.precio}\n\nPodés verlo acá: ${linkProducto}`);

            grid.innerHTML += `
                <div class="product-card">
                    <a href="/producto.html?id=${p.id}" style="text-decoration:none; color:inherit; display:block;">
                        <img src="${p.imagen_url}" alt="Perfume ${p.nombre}" style="cursor:zoom-in;"> 
                        <h3 style="cursor:pointer; margin-bottom: 5px;">${p.nombre}</h3>
                    </a>
                    
                    <p style="color:#888; font-size:0.9rem; margin-bottom:10px; min-height: 40px;">
                        ${p.descripcion ? p.descripcion.substring(0, 50) + '...' : ''}
                    </p>
                    <p style="font-weight:bold; font-size:1.3rem; margin-bottom:15px; color:#d4af37;">$${p.precio}</p>
                    
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button class="btn-add" onclick="agregarAlCarrito(${p.id}, '${p.nombre}', ${p.precio})" style="margin:0;">Agregar al Carrito</button>
                        
                        <div style="display:flex; gap:8px;">
                            <a href="https://wa.me/?text=${msjWhatsapp}" target="_blank" class="btn-add" style="flex:1; margin:0; background:#25d366; text-decoration:none; display:flex; justify-content:center; align-items:center;" title="Enviar a alguien para que te lo regale 😉">
                                <i class="fab fa-whatsapp"></i> Compartir
                            </a>
                            <button class="btn-add" onclick="abrirResenas(${p.id}, '${p.nombre}')" style="flex:1; margin:0; background:#f0f0f0; color:#333;" title="Ver opiniones">
                                ⭐ Reseñas
                            </button>
                        </div>
                    </div>
                </div>`;
        });
        container.appendChild(section);
    }
}

// --- 2. LÓGICA DE RESEÑAS ---
async function abrirResenas(id, nombre) {
    document.getElementById('r-perfume-id').value = id;
    document.getElementById('resena-titulo').innerText = `Opiniones sobre ${nombre}`;
    document.getElementById('modal-resenas').style.display = 'block';
    cargarResenas(id);
}

function cerrarResenas() {
    document.getElementById('modal-resenas').style.display = 'none';
}

async function cargarResenas(id) {
    const res = await fetch(`/api/perfumes/${id}/resenas`);
    const resenas = await res.json();
    const div = document.getElementById('lista-resenas');
    
    if (resenas.length === 0) {
        div.innerHTML = '<p style="color:#888; text-align:center;">Aún no hay reseñas. ¡Sé el primero en opinar!</p>';
    } else {
        div.innerHTML = resenas.map(r => `
            <div style="border-bottom:1px solid #f0f0f0; padding:10px 0;">
                <strong style="font-size:0.9rem;">${r.nombre}</strong> 
                <span style="color:#d4af37; font-size:0.8rem;">${'⭐'.repeat(r.estrellas)}</span><br>
                <small style="color:#555; display:block; margin-top:5px;">${r.comentario}</small>
            </div>
        `).join('');
    }
}

async function enviarResena() {
    const id = document.getElementById('r-perfume-id').value;
    const nombre = document.getElementById('r-nombre').value;
    const estrellas = document.getElementById('r-estrellas').value;
    const comentario = document.getElementById('r-comentario').value;

    if (!nombre || !comentario) return alert('Por favor, escribe tu nombre y un comentario.');

    await fetch(`/api/perfumes/${id}/resenas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, estrellas, comentario })
    });

    document.getElementById('r-nombre').value = '';
    document.getElementById('r-comentario').value = '';
    cargarResenas(id); // Refresca la lista al instante
}

// --- 3. LÓGICA DE CARRITO Y PAGOS ---
function agregarAlCarrito(id, title, unit_price) {
    const existe = carrito.find(i => i.id === id);
    if (existe) {
        existe.quantity++;
    } else {
        carrito.push({ id, title, unit_price, quantity: 1 });
    }
    actualizarCarritoUI();
    toggleCart(); // Abre el modal del carrito
}

function actualizarCarritoUI() {
    document.getElementById('cart-count').innerText = carrito.reduce((a, b) => a + b.quantity, 0);
    const div = document.getElementById('cart-items');
    
    if (carrito.length === 0) {
        div.innerHTML = '<p style="text-align:center; color:#888;">Tu carrito está vacío</p>';
    } else {
        div.innerHTML = carrito.map((item, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div style="flex:1;">
                    <strong style="font-size:0.95rem;">${item.title}</strong><br>
                    <small style="color:#888;">$${item.unit_price} c/u</small>
                </div>
                
                <div style="display:flex; align-items:center; gap:8px; margin:0 10px;">
                    <button onclick="restarItem(${idx})" style="background:#f0f0f0; border:none; width:28px; height:28px; border-radius:50%; cursor:pointer; font-weight:bold; color:#333;">-</button>
                    <span style="font-weight:600; min-width:20px; text-align:center;">${item.quantity}</span>
                    <button onclick="sumarItem(${idx})" style="background:#222; border:none; width:28px; height:28px; border-radius:50%; cursor:pointer; font-weight:bold; color:white;">+</button>
                </div>

                <div style="text-align:right;">
                    <strong style="display:block;">$${item.unit_price * item.quantity}</strong>
                    <small onclick="eliminarItem(${idx})" style="color:red; cursor:pointer; text-decoration:underline; font-size:0.8rem;">Quitar</small>
                </div>
            </div>
        `).join('');
    }
    
    const total = carrito.reduce((a, b) => a + (b.unit_price * b.quantity), 0);
    document.getElementById('cart-total').innerText = total;
}

function sumarItem(index) {
    carrito[index].quantity++;
    actualizarCarritoUI();
}

function restarItem(index) {
    if (carrito[index].quantity > 1) {
        carrito[index].quantity--;
    } else {
        if (confirm('¿Quieres eliminar este perfume del carrito?')) {
            carrito.splice(index, 1);
        }
    }
    actualizarCarritoUI();
}

function eliminarItem(idx) {
    carrito.splice(idx, 1);
    actualizarCarritoUI();
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

function selectPago(metodo) {
    metodoPagoSeleccionado = metodo;
    document.getElementById('opt-mp').classList.toggle('selected', metodo === 'mercadopago');
    document.getElementById('opt-transf').classList.toggle('selected', metodo === 'transferencia');
    document.getElementById('wallet_container').innerHTML = ''; // Limpiar botón de MP si estaba abierto
    document.getElementById('info-transferencia').style.display = 'none';
}

// --- 4. CHECKOUT (ENVIAR ORDEN) ---
async function finalizarCompra() {
    const nombre = document.getElementById('c-nombre').value;
    const tel = document.getElementById('c-tel').value;
    const dir = document.getElementById('c-dir').value;

    if (!nombre || !tel || !dir || carrito.length === 0) {
        return alert('Por favor, completa todos los datos de envío y agrega productos al carrito.');
    }

    const res = await fetch('/api/nueva-orden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            items: carrito, 
            comprador: { nombre, telefono: tel, direccion: dir }, 
            metodo_pago: metodoPagoSeleccionado 
        })
    });

    const data = await res.json();
    
    if (data.error) return alert('Hubo un error al procesar la orden: ' + data.error);

    if (data.type === 'mp') {
        // Mostrar botón de Mercado Pago
        mp.bricks().create("wallet", "wallet_container", { initialization: { preferenceId: data.id } });
    } else if (data.type === 'transfer') {
        // Mostrar datos de transferencia y botón de WhatsApp
        document.getElementById('info-transferencia').style.display = 'block';
        const msg = `Hola! Acabo de hacer un pedido de perfumes (Orden #${data.id}). Te envío el comprobante de transferencia BROU.`;
        document.getElementById('btn-whatsapp-pedido').href = `https://wa.me/59899822758?text=${encodeURIComponent(msg)}`;
        alert('Pedido registrado con éxito. Por favor, realiza la transferencia para que podamos procesar el envío.');
    }
}

// Iniciar cargando la tienda
cargarCatalogo();