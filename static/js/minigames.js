"use strict";

const reducirMovimientoMini = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const MINI_CONFIG = {
    agua: {
        titulo: "Las llaves de la plaza", instruccion: "Cierra las llaves que gotean: al cerrar unas, se abrirán otras.", duracion: 60, etapa: 2,
        tutorial: "Evita que se desperdicie agua durante 1 minuto. Siempre habrá tres llaves goteando: cuando cierres una, otra se abrirá.",
        control: "Toca o haz clic únicamente sobre las llaves que muestran una gota.",
    },
    energia: {
        titulo: "La casa encendida", instruccion: "Recorre la casa con el puntero y apaga todas las luces.", duracion: 60, etapa: 3,
        tutorial: "Encuentra las seis habitaciones iluminadas y apaga sus luces antes de que se agote el tiempo.",
        control: "Toca o haz clic sobre cada habitación que tenga la bombilla encendida.",
    },
    reforestacion: {
        titulo: "El bosque vuelve", instruccion: "Cava, planta y riega cada terreno en ese orden.", duracion: 60, etapa: 4,
        tutorial: "Recupera los seis terrenos siguiendo tres pasos en orden: cavar, plantar y regar.",
        control: "Elige una herramienta y luego toca el terreno donde quieres utilizarla.",
    },
};

const campania = {
    nombre: "Guardaparques", modo: "individual", puntos: {}, reciclados: 0,
    comenzar(nombre, modo) {
        this.nombre = nombre || "Guardaparques";
        this.modo = modo === "versus" ? "versus" : modo === "cooperativo" ? "cooperativo" : "individual";
        this.puntos = {}; this.reciclados = 0;
        document.body.classList.add("en-campania");
    },
    registrarParque(puntos, reciclados) {
        this.puntos.reciclaje = puntos;
        this.reciclados = reciclados;
        mostrarTransicion("Etapa 1 completada", "El parque está limpio. Ahora, protege el agua.", () => iniciarMinijuego("agua", this.nombre));
    },
    total() { return Object.values(this.puntos).reduce((suma, valor) => suma + valor, 0); },
    siguiente(tipo, puntos) {
        this.puntos[tipo] = puntos;
        const siguiente = tipo === "agua" ? "energia" : tipo === "energia" ? "reforestacion" : null;
        if (siguiente) {
            mostrarTransicion(`Etapa ${MINI_CONFIG[tipo].etapa} completada`, `Sumaste ${puntos} puntos. La misión continúa.`, () => iniciarMinijuego(siguiente, this.nombre));
        } else {
            mostrarTransicion("¡Las cuatro etapas están completas!", `Puntaje acumulado: ${this.total()} puntos.`, mostrarCuestionario);
        }
    },
};
window.Campania = campania;

const mini = { canvas: null, ctx: null, tipo: "", puntos: 0, tiempo: 0, activo: false, ultimo: 0, objetos: [], herramienta: "", impacto: 0, raf: 0, hover: -1, puntero: { x: 480, y: 280 } };

function configurarMiniCanvas() {
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    mini.canvas.width = Math.round(960 * escala);
    mini.canvas.height = Math.round(560 * escala);
    mini.ctx.setTransform(escala, 0, 0, escala, 0, 0);
    mini.ctx.imageSmoothingEnabled = true;
    mini.ctx.imageSmoothingQuality = "high";
}

function iniciarMinijuego(tipo, nombre) {
    const config = MINI_CONFIG[tipo];
    Object.assign(mini, { canvas: document.querySelector("#canvas-mini"), tipo, puntos: 0, tiempo: config.duracion, activo: false, ultimo: 0, objetos: [], herramienta: tipo === "reforestacion" ? "cavar" : "", impacto: 0 });
    mini.ctx = mini.canvas.getContext("2d");
    configurarMiniCanvas();
    document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto"));
    document.querySelector("#pantalla-minijuego").classList.remove("oculto");
    document.querySelector("#mini-titulo").textContent = config.titulo;
    document.querySelector("#mini-instruccion").textContent = config.instruccion;
    document.querySelector("#mini-ceja").textContent = `Etapa ${config.etapa} · aventura ecológica`;
    document.querySelector("#mini-etapa").textContent = `Etapa ${config.etapa} de 4`;
    document.querySelector(".ruta-compacta i").style.width = `${config.etapa * 25}%`;
    document.querySelector("#mini-total").textContent = `Total: ${campania.total()} pts`;
    prepararHerramientas(); sembrarEscena(); actualizarMiniHUD(); dibujarMini();
    document.querySelector("#mini-tutorial-titulo").textContent = config.titulo;
    document.querySelector("#mini-tutorial-texto").textContent = config.tutorial;
    document.querySelector("#mini-tutorial-control").textContent = config.control;
    document.querySelector("#mini-tutorial").classList.remove("oculto");
    cancelAnimationFrame(mini.raf);
}

function comenzarMinijuego() {
    if (mini.activo || !mini.tipo) return;
    document.querySelector("#mini-tutorial").classList.add("oculto");
    mini.activo = true;
    mini.ultimo = performance.now();
    mini.raf = requestAnimationFrame(bucleMini);
}

function prepararHerramientas() {
    const barra = document.querySelector("#mini-herramientas"); barra.replaceChildren();
    if (mini.tipo !== "reforestacion") return;
    [["cavar", "⛏ 1. Cavar"], ["plantar", "🌱 2. Plantar"], ["regar", "💧 3. Regar"]].forEach(([valor, texto]) => {
        const boton = document.createElement("button"); boton.type = "button"; boton.textContent = texto;
        boton.setAttribute("aria-pressed", String(valor === mini.herramienta));
        boton.addEventListener("click", () => { mini.herramienta = valor; barra.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === boton))); });
        barra.appendChild(boton);
    });
}

function sembrarEscena() {
    if (mini.tipo === "agua") mini.objetos = Array.from({ length: 6 }, (_, i) => ({
        x: 150 + (i % 3) * 330,
        y: 180 + Math.floor(i / 3) * 240,
        fuga: i < 3,
    }));
    else if (mini.tipo === "energia") mini.objetos = [
        { x: 195, y: 180, nombre: "Cocina" }, { x: 480, y: 180, nombre: "Dormitorio" }, { x: 765, y: 180, nombre: "Baño" },
        { x: 195, y: 410, nombre: "Sala" }, { x: 480, y: 410, nombre: "Estudio" }, { x: 765, y: 410, nombre: "Entrada" },
    ].map((o) => ({ ...o, encendida: true }));
    else mini.objetos = Array.from({ length: 6 }, (_, i) => ({ x: 155 + (i % 3) * 325, y: 185 + Math.floor(i / 3) * 245, etapa: 0 }));
    mini.objetos.forEach((objeto, indice) => Object.assign(objeto, { indice, pulso: 0 }));
}

function bucleMini(timestamp) {
    if (!mini.activo) return;
    const delta = Math.min((timestamp - mini.ultimo) / 1000, .05); mini.ultimo = timestamp; mini.tiempo = Math.max(0, mini.tiempo - delta);
    if (mini.tipo === "agua") mini.objetos.forEach((o) => {
        if (o.fuga) mini.impacto += delta * 1.5;
    });
    if (mini.tipo === "energia") mini.impacto += mini.objetos.filter((o) => o.encendida).length * delta * .18;
    mini.objetos.forEach((o) => { o.pulso = Math.max(0, o.pulso - delta * 4); });
    dibujarMini(); actualizarMiniHUD();
    if (mini.tiempo <= 0) terminarMinijuego(); else mini.raf = requestAnimationFrame(bucleMini);
}

function puntoCanvas(evento) { const r = mini.canvas.getBoundingClientRect(); return { x: (evento.clientX - r.left) * 960 / r.width, y: (evento.clientY - r.top) * 560 / r.height }; }
function pulsarMini(evento) {
    if (!mini.activo) return; const p = puntoCanvas(evento); const o = mini.objetos.find((item) => Math.hypot(item.x - p.x, item.y - p.y) < 75); if (!o) return;
    o.pulso = 1;
    if (mini.tipo === "agua") {
        if (o.fuga) {
            o.fuga = false;
            abrirOtraLlave(o);
            mini.puntos += 18;
            mensajeMini("¡Llave cerrada! Otra comenzó a gotear · +18");
        } else mensajeMini("Esta llave ya está cerrada");
    }
    else if (mini.tipo === "energia") { if (o.encendida) { o.encendida = false; mini.puntos += 20; mensajeMini(`Luz de ${o.nombre.toLowerCase()} apagada +20`); } else mensajeMini("Esa luz ya está apagada"); }
    else { const orden = ["cavar", "plantar", "regar"]; if (orden[o.etapa] === mini.herramienta) { o.etapa++; mini.puntos += o.etapa === 3 ? 24 : 8; mensajeMini(o.etapa === 3 ? "¡Árbol establecido! +24" : "Buen trabajo +8"); } else mensajeMini(`Primero debes ${orden[o.etapa] || "cuidar este árbol"}`); }
    const completo = mini.tipo === "agua" ? false : mini.tipo === "energia" ? mini.objetos.every((x) => !x.encendida) : mini.objetos.every((x) => x.etapa === 3);
    if (completo) terminarMinijuego(true);
}

function moverPunteroMini(evento) {
    const p = puntoCanvas(evento);
    mini.puntero = p;
    mini.hover = mini.objetos.findIndex((item) => Math.hypot(item.x - p.x, item.y - p.y) < 78);
    mini.canvas.style.cursor = mini.hover >= 0 && mini.activo ? "pointer" : "default";
}

function transformarObjeto(c, o) {
    const activo = mini.hover === o.indice;
    const escala = 1 + (activo ? .045 : 0) + o.pulso * .055;
    const ahora = reducirMovimientoMini ? 0 : performance.now() / 1000;
    const animado = mini.tipo === "agua" ? o.fuga : mini.tipo === "energia" ? o.encendida : o.etapa >= 2;
    const balanceo = animado ? Math.sin(ahora * 2.6 + o.indice) * .012 : 0;
    const flotacion = animado ? Math.sin(ahora * 3 + o.indice) * 2.2 : 0;
    c.translate(o.x, o.y);
    c.rotate(balanceo);
    c.scale(escala, escala);
    c.translate(-o.x, -o.y - (activo ? 4 : 0) - flotacion);
    c.shadowColor = activo ? "rgba(244,197,66,.48)" : "rgba(16,47,43,.24)";
    c.shadowBlur = activo ? 22 : 10;
    c.shadowOffsetY = activo ? 10 : 6;
}

function abrirOtraLlave(cerrada) {
    const candidatas = mini.objetos.filter((llave) => llave !== cerrada && !llave.fuga);
    if (!candidatas.length) return;
    const siguiente = candidatas[Math.floor(Math.random() * candidatas.length)];
    siguiente.fuga = true;
}

function dibujarMini() { const c = mini.ctx; c.save(); c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,mini.canvas.width,mini.canvas.height); c.restore(); if (mini.tipo === "agua") dibujarAgua(c); else if (mini.tipo === "energia") dibujarCasa(c); else dibujarBosque(c); }
function dibujarAgua(c) {
    const cielo = c.createLinearGradient(0,0,0,560); cielo.addColorStop(0,"#66bbcf"); cielo.addColorStop(.56,"#bde2d3"); cielo.addColorStop(.57,"#8cc675"); cielo.addColorStop(1,"#68a85e"); c.fillStyle=cielo;c.fillRect(0,0,960,560);
    const deriva=(mini.puntero.x-480)*.012;c.fillStyle="#76a969";c.beginPath();c.moveTo(-40+deriva,170);c.quadraticCurveTo(150+deriva,55,335+deriva,170);c.quadraticCurveTo(535+deriva,65,760+deriva,170);c.lineTo(1000,190);c.lineTo(-40,190);c.fill();
    c.fillStyle="#f4c542";c.beginPath();c.arc(80,72,34,0,Math.PI*2);c.fill();
    c.fillStyle="rgba(255,255,255,.74)";[[190,78,48],[236,72,36],[735,90,43],[777,85,31]].forEach(([x,y,r])=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();});
    c.fillStyle="#315b58";for(let x=0;x<960;x+=55){c.beginPath();c.arc(x,153+(x%3)*9,45,0,Math.PI*2);c.fill();}
    c.fillStyle="#e7d4a4";c.beginPath();c.roundRect(38,115,884,414,28);c.fill();c.strokeStyle="#b7955f";c.lineWidth=5;c.stroke();
    c.fillStyle="#c8ad78";for(let x=65;x<910;x+=55){for(let y=137;y<518;y+=45){c.fillRect(x+(y%2)*12,y,3,3);}}
    c.fillStyle="#267b91";c.font="800 15px 'Atkinson Hyperlegible'";c.textAlign="center";c.fillText("PLAZA DEL AGUA · TOCA SOLO LAS LLAVES QUE GOTEAN",480,142);
    mini.objetos.forEach((o, i) => {
        c.save(); transformarObjeto(c, o);
        c.fillStyle="rgba(23,63,53,.16)";c.beginPath();c.ellipse(o.x+4,o.y+73,85,13,0,0,Math.PI*2);c.fill();
        c.fillStyle="#b8a77c";c.beginPath();c.moveTo(o.x-94,o.y-69);c.lineTo(o.x-82,o.y-80);c.lineTo(o.x+106,o.y-80);c.lineTo(o.x+94,o.y-69);c.closePath();c.fill();
        c.fillStyle="#a4936d";c.beginPath();c.moveTo(o.x+94,o.y-69);c.lineTo(o.x+106,o.y-80);c.lineTo(o.x+106,o.y+57);c.lineTo(o.x+94,o.y+70);c.closePath();c.fill();
        c.fillStyle="#fff9e8";c.strokeStyle="#173f35";c.lineWidth=4;c.beginPath();c.roundRect(o.x-94,o.y-69,188,139,18);c.fill();c.stroke();
        c.fillStyle=o.fuga?"#dff6fb":"#e1ecd7";c.beginPath();c.roundRect(o.x-84,o.y-59,168,82,12);c.fill();
        c.fillStyle="#315b58";c.fillRect(o.x-38,o.y-14,76,20);c.fillRect(o.x+20,o.y-14,18,43);
        c.fillStyle="#dc5942";c.fillRect(o.x-26,o.y-43,52,12);c.fillRect(o.x-6,o.y-51,12,26);
        if(o.fuga){const pulso=2+Math.sin(performance.now()/100)*2;c.fillStyle="#249dc1";c.beginPath();c.moveTo(o.x+29,o.y+35);c.quadraticCurveTo(o.x+13,o.y+55+pulso,o.x+29,o.y+65);c.quadraticCurveTo(o.x+45,o.y+55+pulso,o.x+29,o.y+35);c.fill();}
        c.fillStyle="#173f35";c.font="700 15px Atkinson Hyperlegible";c.fillText(`LLAVE ${i+1} · ${o.fuga?"GOTEA":"CERRADA"}`,o.x,o.y+55);
        c.restore();
    });
}
function dibujarCasa(c) {
    const luz=c.createRadialGradient(480,190,30,480,250,620);luz.addColorStop(0,"#315e62");luz.addColorStop(1,"#102f3a");c.fillStyle=luz;c.fillRect(0,0,960,560);c.fillStyle="rgba(255,255,255,.035)";for(let x=0;x<960;x+=64)c.fillRect(x,0,2,560);
    c.fillStyle="#0b272d";c.beginPath();c.moveTo(22,118);c.lineTo(480,0);c.lineTo(938,118);c.lineTo(910,130);c.lineTo(480,34);c.lineTo(50,130);c.closePath();c.fill();
    c.fillStyle="#dc5942";c.beginPath();c.moveTo(50,108);c.lineTo(480,12);c.lineTo(910,108);c.closePath();c.fill();c.strokeStyle="#f3ca70";c.lineWidth=6;c.stroke();
    c.fillStyle="#fff2cf";c.font="800 15px 'Atkinson Hyperlegible'";c.textAlign="center";c.fillText("CASA EFICIENTE · ENCUENTRA Y APAGA LAS 6 LUCES",480,92);
    mini.objetos.forEach((o,i)=>{
        c.save(); transformarObjeto(c, o);
        const enc=o.encendida;const colores=["#86b7a7","#d7966b","#79a8b1","#a9c97c","#a98eb8","#d3b66f"];
        c.fillStyle="rgba(0,0,0,.25)";c.fillRect(o.x-125,o.y-86,250,184);
        c.fillStyle="#0a2529";c.beginPath();c.moveTo(o.x-119,o.y-92);c.lineTo(o.x-103,o.y-107);c.lineTo(o.x+135,o.y-107);c.lineTo(o.x+119,o.y-92);c.closePath();c.fill();
        c.fillStyle="#14383b";c.beginPath();c.moveTo(o.x+119,o.y-92);c.lineTo(o.x+135,o.y-107);c.lineTo(o.x+135,o.y+69);c.lineTo(o.x+119,o.y+84);c.closePath();c.fill();
        c.fillStyle=enc?"#ffe39a":colores[i];c.beginPath();c.roundRect(o.x-119,o.y-92,238,176,6);c.fill();c.strokeStyle="#f7edd0";c.lineWidth=7;c.stroke();
        c.fillStyle=enc?"rgba(255,237,156,.7)":"rgba(16,47,43,.18)";c.beginPath();c.moveTo(o.x,o.y-55);c.lineTo(o.x-72,o.y+48);c.lineTo(o.x+72,o.y+48);c.closePath();c.fill();
        c.strokeStyle="#173f35";c.lineWidth=4;c.beginPath();c.moveTo(o.x,o.y-92);c.lineTo(o.x,o.y-55);c.stroke();
        c.fillStyle=enc?"#f4c542":"#476265";c.strokeStyle="#173f35";c.lineWidth=3;c.beginPath();c.arc(o.x,o.y-40,24,0,Math.PI*2);c.fill();c.stroke();
        c.fillStyle="#173f35";c.fillRect(o.x-48,o.y+35,96,12);c.fillStyle=enc?"#173f35":"#fff";c.font="700 18px Baloo 2";c.fillText(o.nombre,o.x,o.y+24);c.font="700 12px Atkinson Hyperlegible";c.fillText(enc?"TOCA PARA APAGAR":"LUZ APAGADA",o.x,o.y+67);
        c.restore();
    });
}
function dibujarBosque(c) {
    const fondo=c.createLinearGradient(0,0,0,560);fondo.addColorStop(0,"#5d9c75");fondo.addColorStop(.55,"#98c874");fondo.addColorStop(1,"#5b984e");c.fillStyle=fondo;c.fillRect(0,0,960,560);
    const deriva=(mini.puntero.x-480)*.016;c.fillStyle="#477f63";c.beginPath();c.moveTo(-60+deriva,150);c.quadraticCurveTo(150+deriva,25,350+deriva,150);c.quadraticCurveTo(570+deriva,5,1020+deriva,155);c.lineTo(1020,210);c.lineTo(-60,210);c.fill();
    c.fillStyle="rgba(255,247,195,.16)";for(let i=0;i<9;i++){const t=performance.now()/1800+i;c.beginPath();c.arc((i*137+t*8)%1040-40,75+(i%4)*62+Math.sin(t)*10,3+(i%3),0,Math.PI*2);c.fill();}
    c.fillStyle="#245f43";for(let i=0;i<15;i++){c.beginPath();c.arc(i*75,30+(i%2)*20,52,0,Math.PI*2);c.fill();}
    c.fillStyle="#d9c48e";c.beginPath();c.moveTo(390,0);c.bezierCurveTo(350,210,520,330,355,560);c.lineTo(620,560);c.bezierCurveTo(560,320,650,180,565,0);c.closePath();c.fill();
    c.fillStyle="#173f35";c.font="800 15px 'Atkinson Hyperlegible'";c.textAlign="center";c.fillText("VIVERO NATIVO · CAVA, PLANTA Y RIEGA",480,28);
    mini.objetos.forEach((o,i)=>{
        c.save(); transformarObjeto(c, o);
        c.fillStyle="rgba(23,63,53,.2)";c.beginPath();c.ellipse(o.x+4,o.y+44,73,20,0,0,Math.PI*2);c.fill();
        c.fillStyle="#573823";c.beginPath();c.ellipse(o.x,o.y+36,65,31,0,0,Math.PI*2);c.fill();
        c.fillStyle="#8a5b38";c.strokeStyle="#4f3928";c.lineWidth=4;c.beginPath();c.ellipse(o.x,o.y+27,65,31,0,0,Math.PI*2);c.fill();c.stroke();
        if(o.etapa>=1){c.fillStyle="#443125";c.beginPath();c.ellipse(o.x,o.y+23,37,16,0,0,Math.PI*2);c.fill();}
        if(o.etapa>=2){c.fillStyle="#71452d";c.fillRect(o.x-8,o.y-45,16,70);c.fillStyle=o.etapa===3?"#28623b":"#72a947";[[0,-52,32],[-24,-42,21],[24,-42,21]].forEach(([x,y,r])=>{c.beginPath();c.arc(o.x+x,o.y+y,o.etapa===3?r:r*.65,0,Math.PI*2);c.fill();});}
        if(o.etapa===3){c.fillStyle="#4ca9c2";for(let d=-1;d<=1;d++){c.beginPath();c.arc(o.x+d*17,o.y+49+Math.abs(d)*5,5,0,Math.PI*2);c.fill();}}
        c.fillStyle="#fffaf0";c.strokeStyle="#173f35";c.lineWidth=2;c.beginPath();c.roundRect(o.x-48,o.y+58,96,26,8);c.fill();c.stroke();c.fillStyle="#173f35";c.font="700 13px Atkinson Hyperlegible";c.fillText(`${i+1} · ${["CAVAR","PLANTAR","REGAR","RECUPERADO"][o.etapa]}`,o.x,o.y+76);
        c.restore();
    });
}
function actualizarMiniHUD() { document.querySelector("#mini-tiempo").textContent = Math.ceil(mini.tiempo); document.querySelector("#mini-puntos").textContent = mini.puntos; const texto = mini.tipo === "agua" ? `${Math.round(mini.impacto)} litros perdidos` : mini.tipo === "energia" ? `${Math.round(mini.impacto)} unidades consumidas` : `${mini.objetos.filter((o) => o.etapa === 3).length} árboles recuperados`; document.querySelector("#mini-impacto").textContent = `Impacto: ${texto}`; }
function mensajeMini(texto) { const el = document.querySelector("#mini-mensaje"); el.textContent = texto; el.classList.remove("oculto"); clearTimeout(mini.mensajeTimer); mini.mensajeTimer = setTimeout(() => el.classList.add("oculto"), 1100); }
function terminarMinijuego(completo = false) { if (!mini.activo) return; mini.activo = false; cancelAnimationFrame(mini.raf); const bono = completo ? Math.ceil(mini.tiempo) * 2 : 0; mini.puntos += bono; mensajeMini(completo ? `¡Objetivo logrado! Bono +${bono}` : "Tiempo terminado"); setTimeout(() => campania.siguiente(mini.tipo, mini.puntos), 1300); }
function mostrarTransicion(titulo, texto, continuar) { const capa = document.createElement("div"); capa.className = "transicion-etapa"; capa.innerHTML = `<div><span aria-hidden="true">✓</span><p>Ruta ecológica</p><h2>${titulo}</h2><strong>${texto}</strong></div>`; document.body.appendChild(capa); setTimeout(() => { capa.classList.add("salir"); setTimeout(() => { capa.remove(); continuar(); }, 320); }, 1500); }
function mostrarCuestionario() { document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto")); document.querySelector("#pantalla-cuestionario").classList.remove("oculto"); }

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#mini-empezar").addEventListener("click", comenzarMinijuego);
    document.querySelector("#canvas-mini").addEventListener("pointerdown", (e) => { e.preventDefault(); pulsarMini(e); });
    document.querySelector("#canvas-mini").addEventListener("pointermove", moverPunteroMini);
    document.querySelector("#canvas-mini").addEventListener("pointerleave", () => { mini.hover = -1; mini.canvas.style.cursor = "default"; });
    document.querySelector("#mini-salir").addEventListener("click", () => { mini.activo = false; cancelAnimationFrame(mini.raf); document.body.classList.remove("en-campania"); document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto")); document.querySelector("#pantalla-inicio").classList.remove("oculto"); });
    document.querySelector("#form-cuestionario").addEventListener("submit", async (evento) => {
        evento.preventDefault(); const boton = document.querySelector("#enviar-cuestionario"); const form = new FormData(evento.currentTarget); const respuestas = { q1: form.get("q1"), q2: form.get("q2"), q3: form.get("q3") }; const correctas = Number(respuestas.q1 === "caja") + Number(respuestas.q2 === "apagar") + Number(respuestas.q3 === "reparar"); const aprendizaje = document.querySelector("#respuesta-aprendizaje").value.trim();
        boton.disabled = true; boton.textContent = "Guardando resultado…";
        try { const respuesta = await fetch("/api/resultados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: campania.nombre, modo: campania.modo, puntos: campania.total(), objetos_reciclados: campania.reciclados, puntajes_etapas: campania.puntos, respuestas, respuestas_correctas: correctas, aprendizaje }) }); if (!respuesta.ok) throw new Error((await respuesta.json()).error || "No se pudo guardar"); window.mostrarFinalCampania(correctas); }
        catch (error) { const el = document.querySelector("#quiz-error"); el.textContent = error.message; el.classList.remove("oculto"); boton.disabled = false; boton.textContent = "Guardar y ver clasificación →"; }
    });
});
