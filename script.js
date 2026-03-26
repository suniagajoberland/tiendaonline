/**
 * EL IZQUIERDO C.A. - SISTEMA DE PRODUCCIÓN FINAL 2026
 * - Web: Precios Base | Carrito: IVA 16%
 * - PDF y Google Sheets: Desglose completo
 * - WhatsApp: Datos de formulario y Totalización en Bs.
 * - UX: Efecto de pulso al añadir productos y en navegación.
 */

// --- 0. ESTILOS DE ANIMACIÓN Y PAGINACIÓN ---
const style = document.createElement('style');
style.innerHTML = `
    @keyframes cart-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.4); }
        100% { transform: scale(1); }
    }
    @keyframes nav-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); box-shadow: 0 0 10px rgba(0,64,128,0.5); }
        100% { transform: scale(1); }
    }
    @keyframes active-page-pulse {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,64,128, 0.4); }
        70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(0,64,128, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,64,128, 0); }
    }
    .cart-animate {
        animation: cart-pulse 0.4s ease-in-out;
        color: #25D366 !important;
    }
    .nav-click-pulse {
        animation: nav-pulse 0.3s ease-out;
    }
    #pagination-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        margin: 30px 0;
        width: 100%;
    }
    #pagination-controls button {
        padding: 8px 14px;
        border: 1px solid #ddd;
        background: #fff;
        cursor: pointer;
        border-radius: 8px;
        font-weight: 800;
        transition: all 0.2s;
        color: #004080;
    }
    #pagination-controls button.active {
        background: #004080;
        color: #fff;
        border-color: #004080;
        animation: active-page-pulse 2s infinite;
    }
    #pagination-controls button:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        filter: grayscale(1);
    }
`;
document.head.appendChild(style);

const SHEET_ID = "1wWBUWFJRtm3MnPD6OmRYNa8tXvxjeL9sYcQvN4Mcrdg";
const WHATSAPP_NUMBER = "584143126327";
const PROVEEDORES = ["Proveedor_A", "Proveedor_B"]; 
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzyxTlHMjrGM8_rSvLH7YShgAK8stwlLplgdOQPgEiop2-wIhCEoUnc3r8ODlEzRBEUOw/exec";

let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentPage = 1;
const productsPerPage = 12;

// --- 1. INICIALIZACIÓN ---
async function init() {
    const loader = document.getElementById("loader");
    allProducts = [];
    
    for (const prov of PROVEEDORES) {
        const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(prov)}`;
        try {
            const res = await fetch(URL);
            const csvText = await res.text();
            const rows = csvText.trim().split(/\r?\n/).slice(1); 
            
            rows.forEach((row) => {
                const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                if (cols.length >= 3) {
                    const nombre = cols[0].replace(/^"|"$/g, "").trim();
                    const precioBaseUSD = parseFloat(cols[2].replace(/^"|"$/g, "").replace(",", ".").trim()) || 0;
                    
                    let precioBaseBs = 0;
                    if (cols[7]) {
                        let rawBs = cols[7].replace(/^"|"$/g, "").trim();
                        precioBaseBs = parseFloat(rawBs.replace(/\./g, "").replace(",", ".")) || 0;
                    }

                    if (nombre) { 
                        allProducts.push({
                            nombre: nombre,
                            desc: cols[1] ? cols[1].replace(/^"|"$/g, "").trim() : "Sin descripción",
                            precioBase: precioBaseUSD,
                            precioBaseBs: precioBaseBs,
                            img: cols[3] ? cols[3].replace(/^"|"$/g, "").trim() : "https://via.placeholder.com/300x200",
                            prov: prov 
                        });
                    }
                }
            });
        } catch (e) { console.error("Error cargando datos", e); }
    }
    if (loader) loader.style.display = "none";
    filteredProducts = [...allProducts];
    updateDisplay();
    setupEventListeners();
    validateForm(); 
}

// --- 2. VALIDACIÓN ---
function validateForm() {
    const name = document.getElementById("cust-name").value.trim();
    const id = document.getElementById("cust-id").value.trim();
    const phone = document.getElementById("cust-phone").value.trim();
    const address = document.getElementById("cust-address").value.trim();
    const btn = document.getElementById("btn-finalize");

    const isReady = cart.length > 0 && name && id && phone && address;

    if(btn) {
        btn.disabled = !isReady;
        btn.style.background = isReady ? "#25D366" : "#cccccc";
        btn.style.opacity = isReady ? "1" : "0.6";
        btn.style.cursor = isReady ? "pointer" : "not-allowed";
    }
}

function setupEventListeners() {
    document.getElementById("searchInput").addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        filteredProducts = allProducts.filter(p => p.nombre.toLowerCase().includes(term));
        currentPage = 1;
        updateDisplay();
    });

    ["cust-name", "cust-id", "cust-phone", "cust-address"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener("input", validateForm);
    });
}

// --- 3. LOGICA DE CARRITO ---
function updateDisplay() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    const start = (currentPage - 1) * productsPerPage;
    const items = filteredProducts.slice(start, start + productsPerPage);

    grid.innerHTML = items.map(p => {
        const nEsc = p.nombre.replace(/'/g, "\\'");
        const dEsc = p.desc.replace(/'/g, "\\'");
        const provEsc = p.prov.replace(/'/g, "\\'"); 
        return `
        <div class="product-card" style="display: flex; flex-direction: column; height: 100%; border: 1px solid #eee; border-radius: 15px; background: #fff; padding: 15px;">
            <div style="height: 140px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                <img src="${p.img}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.src='https://via.placeholder.com/300x200'">
            </div>
            <div style="flex-grow: 1;">
                <h3 style="font-size: 0.85rem; font-weight: 800; color: #333; margin-bottom: 4px; height: 2.4em; overflow: hidden;">${p.nombre}</h3>
                <p style="font-size: 0.7rem; color: #64748b; margin-bottom: 8px; height: 3em; overflow: hidden; line-height: 1.2;">${p.desc}</p>
                <div style="background: #f8fafc; border-radius: 10px; padding: 8px; margin-bottom: 15px; border: 1px solid #f1f5f9;">
                    <div style="color: #059669; font-weight: 900; font-size: 1.1rem;">$${p.precioBase.toFixed(2)}</div>
                    <div style="color: #64748b; font-size: 0.75rem;">${p.precioBaseBs.toLocaleString('es-VE')} Bs</div>
                </div>
            </div>
            <button onclick="addToCart('${nEsc}', '${dEsc}', ${p.precioBase}, ${p.precioBaseBs}, '${provEsc}')" 
                    style="width: 100%; background: #004080; color: #fff; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 0.7rem; text-transform: uppercase;">
                Añadir al Carrito
            </button>
        </div>`;
    }).join("");
    renderPagination();
}

function addToCart(name, desc, baseUsd, baseBs, prov) {
    const precioFinalUsd = baseUsd * 1.16;
    const precioFinalBs = baseBs * 1.16;
    cart.push({ name, desc, baseUsd, baseBs, precioFinalUsd, precioFinalBs, prov });
    
    updateCartUI();
    validateForm();
    
    const cartBadge = document.getElementById("cart-count");
    if (cartBadge) {
        cartBadge.classList.add("cart-animate");
        setTimeout(() => cartBadge.classList.remove("cart-animate"), 400);
    }

    const btn = event.target;
    btn.innerText = "¡AÑADIDO!";
    btn.style.background = "#10b981";
    setTimeout(() => { 
        btn.innerText = "Añadir al Carrito"; 
        btn.style.background = "#004080"; 
    }, 800);
}

function updateCartUI() {
    const itemsDiv = document.getElementById("cart-items");
    const totalUsdDisp = document.getElementById("cart-total-value");
    const cartCount = document.getElementById("cart-count");
    let totalBsDisp = document.getElementById("cart-total-bs-value");

    if (totalUsdDisp && !totalBsDisp) {
        const row = document.createElement("div");
        row.style = "display: flex; justify-content: space-between; margin-top: 5px; color: #64748b; font-weight: 800; font-size: 0.9rem;";
        row.innerHTML = `<span>Total Bs:</span> <span><span id="cart-total-bs-value">0.00</span> Bs</span>`;
        totalUsdDisp.closest('div').parentElement.appendChild(row);
        totalBsDisp = document.getElementById("cart-total-bs-value");
    }

    let sumUSD = 0, sumBS = 0;
    const agrupados = {};
    cart.forEach(i => {
        if(!agrupados[i.name]) agrupados[i.name] = { q: 0, p: i.precioFinalUsd };
        agrupados[i.name].q++;
        sumUSD += i.precioFinalUsd;
        sumBS += i.precioFinalBs;
    });

    if(itemsDiv) {
        itemsDiv.innerHTML = Object.keys(agrupados).map(k => `
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:5px;">
                <span><b>${agrupados[k].q}x</b> ${k}</span>
                <span>$${(agrupados[k].q * agrupados[k].p).toFixed(2)}</span>
            </div>`).join("");
    }

    if(totalUsdDisp) totalUsdDisp.innerText = sumUSD.toFixed(2);
    if(totalBsDisp) totalBsDisp.innerText = sumBS.toLocaleString('es-VE', {minimumFractionDigits: 2});
    if(cartCount) cartCount.innerText = cart.length;
}

// --- 4. PROCESAMIENTO ---
async function processOrder() {
    let subtotalBaseUsd = 0;
    let subtotalBaseBs = 0;
    let listado = [];
    let provsUnicos = new Set();

    cart.forEach(i => {
        subtotalBaseUsd += i.baseUsd;
        subtotalBaseBs += i.baseBs;
        listado.push(`${i.name}`);
        provsUnicos.add(i.prov);
    });

    const totalUsd = document.getElementById("cart-total-value").innerText;
    const totalBs = document.getElementById("cart-total-bs-value").innerText;
    const iva = (parseFloat(totalUsd) - subtotalBaseUsd).toFixed(2);

    const payload = {
        auth_token: "IZQ_SECURE_2026_PRO",
        cliente: document.getElementById("cust-name").value.trim(),
        cedula: document.getElementById("cust-id").value.trim(),
        telefono: document.getElementById("cust-phone").value.trim(),
        direccion: document.getElementById("cust-address").value.trim(),
        productos: listado.join(", "),
        proveedores: Array.from(provsUnicos).join(", "),
        subtotal: subtotalBaseUsd.toFixed(2),
        iva: iva,
        total: totalUsd,
        totalBs: totalBs
    };

    try {
        fetch(WEB_APP_URL, {
            method: "POST",
            // mode: "no-cors", // Descomenta si tienes problemas de CORS
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (e) { console.error("Error al vincular con Sheets", e); }

    generatePDF(payload);

    let msg = `*NUEVO PEDIDO - EL IZQUIERDO C.A.*%0A%0A`;
    msg += `*Cliente:* ${payload.cliente}%0A`;
    msg += `*C.I/RIF:* ${payload.cedula}%0A`;
    msg += `*Teléfono:* ${payload.telefono}%0A`;
    msg += `*Dirección:* ${payload.direccion}%0A%0A`;
    msg += `*MERCANCÍA:*%0A`;
    
    const agrupadosMsg = {};
    cart.forEach(i => { agrupadosMsg[i.name] = (agrupadosMsg[i.name] || 0) + 1; });
    for(const p in agrupadosMsg) { msg += `- ${agrupadosMsg[p]}x ${p}%0A`; }
    
    msg += `%0A*TOTAL USD:* $${payload.total}%0A`;
    msg += `*TOTAL BS:* ${payload.totalBs} Bs%0A%0A`;
    msg += `_Enviado desde el portal web._`;
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");

    setTimeout(() => {
        cart = [];
        ["cust-name", "cust-id", "cust-phone", "cust-address"].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "";
        });
        updateCartUI();
        validateForm();
        toggleCart();
    }, 2000);
}

// --- 5. FUNCIONES DE APOYO ---
function generatePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18); doc.setTextColor(0, 64, 128);
    doc.text("EL IZQUIERDO C.A.", 105, 20, { align: "center" });
    
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`Cliente: ${data.cliente} | C.I/RIF: ${data.cedula}`, 20, 40);
    doc.text(`Teléfono: ${data.telefono}`, 20, 46);
    doc.text(`Dirección: ${data.direccion}`, 20, 52);
    doc.line(20, 58, 190, 58);

    let y = 68;
    doc.setFont(undefined, 'bold');
    doc.text("Producto / Descripción", 25, y);
    doc.text("Cant.", 130, y);
    doc.text("Precio Final ($)", 175, y, { align: "right" });
    
    doc.setFont(undefined, 'normal');
    y += 10;

    const agrupadosPDF = {};
    cart.forEach(i => {
        if(!agrupadosPDF[i.name]) {
            agrupadosPDF[i.name] = { 
                q: 0, 
                p: i.precioFinalUsd,
                desc: i.desc // Guardamos la descripción para el PDF
            };
        }
        agrupadosPDF[i.name].q++;
    });

    for (const key in agrupadosPDF) {
        // Título del Producto
        doc.setFont(undefined, 'bold');
        doc.text(key, 25, y);
        doc.text(agrupadosPDF[key].q.toString(), 133, y);
        doc.text(`$${(agrupadosPDF[key].q * agrupadosPDF[key].p).toFixed(2)}`, 175, y, { align: "right" });
        
        y += 5;
        
        // Descripción (en fuente más pequeña y normal)
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100);
        
        // Ajustamos la descripción para que no se salga del margen
        const splitDesc = doc.splitTextToSize(agrupadosPDF[key].desc, 100);
        doc.text(splitDesc, 25, y);
        
        // Calculamos el espacio ocupado por la descripción
        y += (splitDesc.length * 4) + 2; 
        doc.setTextColor(0); 
        doc.setFontSize(10);

        if (y > 270) { doc.addPage(); y = 20; }
    }

    y += 5; doc.line(120, y, 190, y); y += 10;
    doc.text("Base Imponible:", 125, y); doc.text("$" + data.subtotal, 175, y, { align: "right" });
    y += 6; doc.text("IVA (16%):", 125, y); doc.text("$" + data.iva, 175, y, { align: "right" });
    y += 10; doc.setFont(undefined, 'bold');
    doc.text("TOTAL USD:", 125, y); doc.text("$" + data.total, 175, y, { align: "right" });
    y += 7; doc.text("TOTAL BS:", 125, y); doc.text(data.totalBs + " Bs", 175, y, { align: "right" });

    doc.save(`Pedido_${data.cliente.replace(/\s+/g, '_')}.pdf`);
}

function toggleCart() { 
    const panel = document.getElementById("cart-panel");
    if(panel) panel.classList.toggle("active"); 
}

function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const container = document.getElementById("pagination-controls");
    if (!container || totalPages <= 1) { if(container) container.innerHTML = ""; return; }
    
    container.innerHTML = "";
    
    // Función auxiliar para efecto visual en flechas
    const addPulse = (el) => {
        el.classList.add('nav-click-pulse');
        setTimeout(() => el.classList.remove('nav-click-pulse'), 300);
    };

    // Flecha Atrás
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "&laquo;";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = (e) => { 
        addPulse(e.target);
        currentPage--; 
        updateDisplay(); 
        window.scrollTo(0,0); 
    };
    container.appendChild(prevBtn);

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i < 1) continue;
        const b = document.createElement("button");
        b.innerText = i;
        b.className = i === currentPage ? "active" : "";
        b.onclick = () => { 
            currentPage = i; 
            updateDisplay(); 
            window.scrollTo(0,0); 
        };
        container.appendChild(b);
    }

    // Flecha Siguiente
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "&raquo;";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = (e) => { 
        addPulse(e.target);
        currentPage++; 
        updateDisplay(); 
        window.scrollTo(0,0); 
    };
    container.appendChild(nextBtn);
}

document.addEventListener("DOMContentLoaded", init);