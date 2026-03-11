/** * EL IZQUIERDO C.A - PRODUCCIÓN 2026 
 * Versión Final: Carrito Estable, PDF con Logo a la derecha, IVA, y Botón Dinámico.
 * Instrucción: No romper el sitio web.
 */

const SHEET_ID = "1wWBUWFJRtm3MnPD6OmRYNa8tXvxjeL9sYcQvN4Mcrdg";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxo7We1nlGbdQEI66zPjFUN4yfhHtYXHSkxDqs5t3JWjgRfCwRaST2GThP7lSif3AE8fg/exec";
const AUTH_TOKEN = "IZQ_SECURE_2026_PRO";
const WHATSAPP_NUMBER = "584143126327";
const PROVEEDORES = ["Proveedor_A", "Proveedor_B"];

let allProducts = [], filteredProducts = [], cart = [], currentPage = 1;
const productsPerPage = 12;

// --- 1. INICIALIZACIÓN ---
async function init() {
    const loader = document.getElementById("loader");
    allProducts = [];
    
    for (const prov of PROVEEDORES) {
        const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(prov)}`;
        try {
            const res = await fetch(URL);
            const csv = await res.text();
            const rows = csv.split("\n").slice(1);
            
            rows.forEach((row) => {
                const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                if (cols.length >= 3) {
                    allProducts.push({
                        nombre: cols[0].replace(/"/g, "").trim(),
                        desc: cols[1] ? cols[1].replace(/"/g, "").trim() : "",
                        precio: parseFloat(cols[2].replace(/"/g, "").trim()) || 0,
                        img: cols[3] ? cols[3].replace(/"/g, "").trim() : "",
                        provider: prov
                    });
                }
            });
        } catch (e) { console.error("Error cargando proveedor: " + prov); }
    }
    
    if (loader) loader.style.display = "none";
    filteredProducts = [...allProducts];
    updateDisplay();
    setupValidation();
}

// --- 2. GESTIÓN DEL CARRITO ---
function toggleCart() {
    const panel = document.getElementById("cart-panel");
    if (panel) panel.classList.toggle("active");
}

function addToCart(name, price, provider) {
    cart.push({ name, price, provider });
    updateCartUI();
}

function removeFromCart(name) {
    const index = cart.findLastIndex(item => item.name === name);
    if (index !== -1) cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    const itemsDiv = document.getElementById("cart-items");
    const countLabel = document.getElementById("cart-count");
    if (!itemsDiv) return;

    const agrupados = {};
    cart.forEach(item => {
        if (!agrupados[item.name]) agrupados[item.name] = { ...item, cantidad: 0, subtotal: 0 };
        agrupados[item.name].cantidad++;
        agrupados[item.name].subtotal += item.price;
    });

    let total = 0;
    itemsDiv.innerHTML = Object.values(agrupados).map(item => {
        total += item.subtotal;
        const nombreEsc = item.name.replace(/'/g, "\\'");
        return `<div class="cart-item-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
            <div style="font-size:0.9rem;"><b>(${item.cantidad}) ${item.name}</b><br><span style="color:#004080; font-weight:bold;">$${item.subtotal.toFixed(2)}</span></div>
            <button onclick="removeFromCart('${nombreEsc}')" style="color:#ff4757; border:none; background:none; cursor:pointer; font-size:1.3rem;">&times;</button>
        </div>`;
    }).join("");

    const totalDisplay = document.getElementById("cart-total-value");
    if (totalDisplay) totalDisplay.innerText = total.toFixed(2);
    if (countLabel) countLabel.innerText = cart.length;
    validateForm();
}

// --- 3. PDF CON LOGO A LA DERECHA Y PIE DE PÁGINA ---
async function generarNotaPDF(datos) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const sub = parseFloat(datos.subtotal);
    const iva = sub * 0.16;
    const totalF = sub + iva;

    const loadImg = (url) => new Promise((res) => {
        const img = new Image();
        img.src = url;
        img.onload = () => res(img);
        img.onerror = () => res(null);
    });
    const logo = await loadImg('logo.png');

    // Membrete: Nombre a la izquierda, Logo a la derecha
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 64, 128);
    doc.text("EL IZQUIERDO C.A.", 20, 25);

    if (logo) {
        doc.addImage(logo, 'PNG', 155, 10, 30, 30); 
    }

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("NOTA DE ENTREGA / COTIZACIÓN DIGITAL", 20, 32);

    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 50);
    doc.text(`Cliente: ${datos.cliente}`, 20, 56);
    doc.text(`Cédula/RIF: ${datos.cedula}`, 20, 62);
    doc.line(20, 65, 190, 65);

    let y = 75;
    const resumen = {};
    cart.forEach(i => { resumen[i.name] = (resumen[i.name] || {q:0, p:i.price}); resumen[i.name].q++; });

    doc.setFont("helvetica", "bold");
    doc.text("CANT.", 20, y); doc.text("DESCRIPCIÓN", 45, y); doc.text("TOTAL", 185, y, {align:"right"});
    y += 5; doc.line(20, y, 190, y); y += 8;

    doc.setFont("helvetica", "normal");
    for (const n in resumen) {
        doc.text(resumen[n].q.toString(), 25, y, {align:"center"});
        doc.text(n, 45, y);
        doc.text(`$${(resumen[n].q * resumen[n].p).toFixed(2)}`, 185, y, {align:"right"});
        y += 8;
        if (y > 260) { doc.addPage(); y = 20; }
    }

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Subtotal: $${sub.toFixed(2)}`, 185, y, {align:"right"}); y += 6;
    doc.text(`IVA (16%): $${iva.toFixed(2)}`, 185, y, {align:"right"}); y += 8;
    doc.setFontSize(12);
    doc.text(`TOTAL A PAGAR: $${totalF.toFixed(2)}`, 185, y, {align:"right"});

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text("________________________________________________________________________________", 105, 280, {align:"center"});
    doc.text("Tlf: 0414-3126327 | Instagram: @el_izquierdo | Correo: ventaselizquierdo@gmail.com", 105, 285, {align:"center"});

    doc.save(`Nota_${datos.cliente.replace(/\s+/g, "_")}.pdf`);
}

// --- 4. PROCESO DE PEDIDO ---
async function processOrder() {
    const btn = document.getElementById("btn-finalize");
    const name = document.getElementById("cust-name").value.trim();
    const id = document.getElementById("cust-id").value.trim();
    const phone = document.getElementById("cust-phone").value.trim();
    const addr = document.getElementById("cust-address").value.trim();
    const sub = parseFloat(document.getElementById("cart-total-value").innerText);

    const pedidoData = {
        auth_token: AUTH_TOKEN,
        cliente: name, cedula: "'" + id, telefono: phone, direccion: addr,
        productos: cart.map(i => i.name).join(", "),
        proveedores_internos: cart.map(i => `${i.name} (${i.provider})`).join(" | "),
        subtotal: sub.toFixed(2),
        iva: (sub * 0.16).toFixed(2),
        total: (sub * 1.16).toFixed(2)
    };

    btn.innerText = "GENERANDO PEDIDO...";
    await generarNotaPDF(pedidoData);

    try {
        fetch(APPS_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(pedidoData) });
    } catch (e) { console.error("Error al registrar"); }

    const resW = {}; cart.forEach(i => { resW[i.name] = (resW[i.name] || 0) + 1; });
    let msg = `*EL IZQUIERDO C.A. - ORDEN*%0A👤 *Cliente:* ${name}%0A💳 *CI/RIF:* ${id}%0A%0A*PEDIDO:*%0A`;
    for (const n in resW) { msg += `• (${resW[n]}) ${n}%0A`; }
    msg += `%0A💰 *TOTAL: $${pedidoData.total}*`;
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");

    setTimeout(() => {
        cart = []; updateCartUI();
        ["cust-name", "cust-id", "cust-phone", "cust-address"].forEach(f => document.getElementById(f).value = "");
        if (document.getElementById("cart-panel").classList.contains("active")) toggleCart();
    }, 1500);
}

// --- 5. VALIDACIÓN Y COLOR DEL BOTÓN ---
function setupValidation() {
    ["cust-name", "cust-id", "cust-phone", "cust-address"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", validateForm);
    });
}

function validateForm() {
    const btn = document.getElementById("btn-finalize");
    if (!btn) return;

    const n = document.getElementById("cust-name").value.trim();
    const i = document.getElementById("cust-id").value.trim();
    const p = document.getElementById("cust-phone").value.trim();
    const a = document.getElementById("cust-address").value.trim();

    if (n && i && p && a && cart.length > 0) {
        btn.disabled = false;
        btn.style.backgroundColor = "#25D366"; // VERDE CUANDO ESTÁ LLENO
        btn.style.color = "#fff";
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.style.fontWeight = "bold";
        btn.innerText = "ENVIAR PEDIDO POR WHATSAPP";
    } else {
        btn.disabled = true;
        btn.style.backgroundColor = "#cccccc"; // GRIS CUANDO ESTÁ INCOMPLETO
        btn.style.color = "#666666";
        btn.style.opacity = "0.7";
        btn.style.cursor = "not-allowed";
        btn.innerText = "COMPLETE LOS DATOS";
    }
}

// --- 6. DISPLAY CON TAMAÑO DE IMAGEN CORREGIDO ---
function updateDisplay() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    const start = (currentPage - 1) * productsPerPage;
    grid.innerHTML = filteredProducts.slice(start, start + productsPerPage).map(p => `
        <div class="card">
            <div style="width:100%; height:180px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#f9f9f9; border-radius:8px 8px 0 0;">
                <img src="${p.img}" alt="${p.nombre}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.src='https://via.placeholder.com/300x200'">
            </div>
            <div style="padding:15px;">
                <h3 style="font-size:1.1rem; margin-bottom:5px;">${p.nombre}</h3>
                <p style="font-size:0.9rem; color:#666; height:40px; overflow:hidden;">${p.desc}</p>
                <div class="price" style="font-weight:bold; color:#004080; margin:10px 0;">$${p.precio.toFixed(2)}</div>
                <button class="btn-add" onclick="addToCart('${p.nombre.replace(/'/g, "\\")}', ${p.precio}, '${p.provider}')">Añadir</button>
            </div>
        </div>
    `).join("");
    renderPagination();
}

function renderPagination() {
    const total = Math.ceil(filteredProducts.length / productsPerPage);
    const container = document.getElementById("pagination-controls");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 1; i <= total; i++) {
        const b = document.createElement("button");
        b.innerText = i;
        b.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        b.onclick = () => { currentPage = i; updateDisplay(); window.scrollTo(0, 0); };
        container.appendChild(b);
    }
}

document.getElementById("searchInput")?.addEventListener("input", (e) => {
    filteredProducts = allProducts.filter(p => p.nombre.toLowerCase().includes(e.target.value.toLowerCase()));
    currentPage = 1;
    updateDisplay();
});

document.addEventListener("DOMContentLoaded", init);