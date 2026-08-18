"use strict";

const ANCHO = 960;
const ALTO = 600;
const DURACION = 100;
const ECO_META = 75;
const ESCALA_JUGADOR = 1.18;
const LIMITE_JUGADOR = { izquierda: 46, derecha: ANCHO - 46, arriba: 138, abajo: ALTO - 96 };

const CATEGORIAS = {
    plastico: { nombre: "Plástico", corto: "PET", color: "#e3b83f", simbolo: "P" },
    papel: { nombre: "Papel", corto: "PAP", color: "#3a83a6", simbolo: "▤" },
    vidrio: { nombre: "Vidrio", corto: "VID", color: "#4b925c", simbolo: "◇" },
    organico: { nombre: "Orgánico", corto: "ORG", color: "#9b643b", simbolo: "●" },
    metal: { nombre: "Metal", corto: "MET", color: "#707b83", simbolo: "⬡" },
};

const TIPOS = [
    { nombre: "Periódico", categoria: "papel", icono: "📰", nivel: 1 },
    { nombre: "Caja de cartón", categoria: "papel", icono: "📦", nivel: 1 },
    { nombre: "Cáscara de fruta", categoria: "organico", icono: "🍌", nivel: 1 },
    { nombre: "Botella plástica", categoria: "plastico", icono: "🧴", nivel: 2 },
    { nombre: "Lata", categoria: "metal", icono: "🥫", nivel: 2 },
    { nombre: "Frasco de vidrio", categoria: "vidrio", icono: "🍾", nivel: 2 },
    { nombre: "Pila usada", categoria: "metal", icono: "🔋", nivel: 3 },
    { nombre: "Envase químico", categoria: "plastico", icono: "☣️", nivel: 3 },
];

const CONTAMINACION = {
    1: { nombre: "Baja", puntos: 8, duracion: 14, color: "#36713d", marca: "I" },
    2: { nombre: "Media", puntos: 16, duracion: 10, color: "#b36b20", marca: "II" },
    3: { nombre: "Alta", puntos: 32, duracion: 7, color: "#b73d32", marca: "III" },
};

const MISIONES = [
    { nombre: "Limpia el sendero", objetivo: 3, detalle: "Clasifica 3 residuos" },
    { nombre: "Activa la racha verde", objetivo: 3, detalle: "Consigue 3 aciertos seguidos" },
    { nombre: "Rescate del claro", objetivo: 4, detalle: "Recicla 4 residuos; los dorados valen más" },
];

const PERSONAJES = {
    exploradora: { nombre: "Sofía", piel: "#c9835d", pelo: "#4b3027", camiseta: "#267b91", peloLargo: false },
    guardaparque: { nombre: "Tomás", piel: "#b96f47", pelo: "#2d241f", camiseta: "#b73d32", peloLargo: false },
    voluntaria: { nombre: "Amaya", piel: "#8d513d", pelo: "#241e1c", camiseta: "#6c5795", peloLargo: true },
};

const CONTENEDORES = [
    { categoria: "plastico", x: 100, y: 72 },
    { categoria: "papel", x: 290, y: 72 },
    { categoria: "vidrio", x: 480, y: 72 },
    { categoria: "organico", x: 670, y: 72 },
    { categoria: "metal", x: 860, y: 72 },
].map((item) => ({ ...item, radio: 44 }));

const canvas = document.querySelector("#canvas-juego");
const ctx = canvas.getContext("2d");
const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function configurarResolucionCanvas() {
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    const anchoReal = Math.round(ANCHO * escala);
    const altoReal = Math.round(ALTO * escala);
    if (canvas.width !== anchoReal || canvas.height !== altoReal) {
        canvas.width = anchoReal;
        canvas.height = altoReal;
    }
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
}

configurarResolucionCanvas();
const $ = (selector) => document.querySelector(selector);
const pantallas = ["#pantalla-inicio", "#pantalla-juego", "#pantalla-final", "#pantalla-minijuego", "#pantalla-cuestionario"].map($);

const ui = {
    inicio: $("#pantalla-inicio"),
    juego: $("#pantalla-juego"),
    final: $("#pantalla-final"),
    form: $("#form-inicio"),
    nombre: $("#input-nombre"),
    puntos: $("#hud-puntos"),
    tiempo: $("#hud-tiempo"),
    combo: $("#hud-combo"),
    objeto: $("#hud-objeto-actual"),
    energia: $("#barra-energia"),
    energiaMeter: $(".energia"),
    mensaje: $("#mensaje-flotante"),
    mision: $("#mision-texto"),
    misionProgreso: $("#mision-progreso"),
    misionEtapa: $("#mision-etapa"),
    progreso: $("#barra-progreso"),
    progresoRole: $(".progreso"),
    cuenta: $("#cuenta-atras"),
    pausa: $("#pausa-overlay"),
};

const estado = {
    jugador: { x: 480, y: 430, vx: 0, vy: 0, dirX: 0, dirY: -1, energia: 100 },
    residuos: [],
    particulas: [],
    llevando: null,
    puntos: 0,
    reciclados: 0,
    combo: 0,
    mejorCombo: 0,
    entregas: 0,
    errores: 0,
    tiempo: DURACION,
    mision: 0,
    progresoMision: 0,
    aparicion: 0,
    jugando: false,
    pausado: false,
    enCuenta: false,
    ultimoTiempo: null,
    nombre: "Guardaparques",
    sacudida: 0,
    personaje: "exploradora",
    vida: 3,
    vidaMaxima: 3,
    invulnerable: 0,
    ayudas: [],
    aparicionAyuda: 6,
    boost: null,
    boostRestante: 0,
    ecosistema: { agua: 35, suelo: 35, vida: 35 },
    tutorialPaso: 0,
};

const entrada = { arriba: false, abajo: false, izquierda: false, derecha: false, correr: false };
const ajustes = cargarAjustes();
let audioCtx = null;
let musicaTimer = null;
let pasoMusical = 0;
let mensajeTimer = null;
let idResiduo = 0;
const red = {
    modo: "solo", codigo: "", token: "", jugadorId: "", anfitrion: false,
    jugadores: [], intervalo: null, envioAnterior: 0, partidaIniciada: false,
    enviando: false, suavizados: {}, desfaseServidor: 0, relojSincronizado: false,
};

function cargarAjustes() {
    try {
        return { sonido: true, musica: true, particulas: true, sacudida: true, contraste: false, ...JSON.parse(localStorage.getItem("eco-ajustes") || "{}") };
    } catch {
        return { sonido: true, musica: true, particulas: true, sacudida: true, contraste: false };
    }
}

function guardarAjustes() {
    localStorage.setItem("eco-ajustes", JSON.stringify(ajustes));
}

function aleatorio(min, max) { return min + Math.random() * (max - min); }
function distancia(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function limitar(valor, min, max) { return Math.max(min, Math.min(max, valor)); }
function elegir(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
function esModoLocal() { return red.modo === "solo" || red.modo === "ecosistema"; }

function mostrarPantalla(activa) {
    pantallas.forEach((pantalla) => pantalla.classList.toggle("oculto", pantalla !== activa));
}

function desconectarSala() {
    clearInterval(red.intervalo);
    Object.assign(red, {
        modo: "solo", codigo: "", token: "", jugadorId: "", anfitrion: false,
        jugadores: [], intervalo: null, partidaIniciada: false,
        enviando: false, suavizados: {}, desfaseServidor: 0, relojSincronizado: false,
    });
    $("#hud-red").classList.add("oculto");
}

function reiniciar() {
    Object.assign(estado, {
        residuos: [], particulas: [], llevando: null, puntos: 0, reciclados: 0,
        combo: 0, mejorCombo: 0, entregas: 0, errores: 0, tiempo: DURACION,
        mision: 0, progresoMision: 0, aparicion: 0, jugando: false,
        pausado: false, enCuenta: true, ultimoTiempo: null, sacudida: 0,
        vida: 3, invulnerable: 0, ayudas: [], aparicionAyuda: 6,
        boost: null, boostRestante: 0, ecosistema: { agua: 35, suelo: 35, vida: 35 }, tutorialPaso: 0,
    });
    Object.assign(estado.jugador, { x: 480, y: 430, vx: 0, vy: 0, dirX: 0, dirY: -1, energia: 100 });
    Object.keys(entrada).forEach((clave) => { entrada[clave] = false; });
    for (let i = 0; i < 4; i += 1) crearResiduo(false);
    actualizarHUD();
    configurarTutorial();
    dibujar();
}

const PASOS_TUTORIAL = [
    ["Muévete por el parque", "Usa las flechas, WASD o la cruceta táctil. Avanzarás al moverte."],
    ["Recoge un residuo", "Camina hasta un residuo. Sólo puedes transportar uno a la vez."],
    ["Clasifícalo", "Llévalo al contenedor que coincide con su símbolo y categoría."],
];

function configurarTutorial() { estado.tutorialPaso = 0; actualizarTutorial(); }
function actualizarTutorial() {
    const panel = $("#tutorial");
    if (estado.tutorialPaso >= PASOS_TUTORIAL.length) {
        panel.classList.add("oculto");
        localStorage.setItem("eco-tutorial-completado", "1");
        return;
    }
    panel.classList.remove("oculto");
    $("#tutorial-numero").textContent = `${estado.tutorialPaso + 1} de ${PASOS_TUTORIAL.length}`;
    $("#tutorial-titulo").textContent = PASOS_TUTORIAL[estado.tutorialPaso][0];
    $("#tutorial-texto").textContent = PASOS_TUTORIAL[estado.tutorialPaso][1];
}
function avanzarTutorial(paso) {
    if (estado.tutorialPaso === paso) { estado.tutorialPaso += 1; actualizarTutorial(); }
}

async function comenzar() {
    estado.nombre = ui.nombre.value.trim() || "Guardaparques";
    estado.personaje = document.querySelector('input[name="personaje"]:checked').value;
    Campania.comenzar(estado.nombre, red.modo);
    reiniciar();
    mostrarPantalla(ui.juego);
    await cuentaAtras();
    estado.jugando = true;
    estado.enCuenta = false;
    estado.ultimoTiempo = performance.now();
    iniciarMusica();
    requestAnimationFrame(bucle);
}

async function comenzarDesdeSala(sala) {
    if (red.partidaIniciada) return;
    red.partidaIniciada = true;
    clearInterval(red.intervalo);
    red.intervalo = null;
    estado.nombre = ui.nombre.value.trim() || "Guardaparques";
    estado.personaje = document.querySelector('input[name="personaje"]:checked').value;
    Campania.comenzar(estado.nombre, red.modo);
    reiniciar();
    mostrarPantalla(ui.juego);
    $("#hud-red").classList.remove("oculto");
    $("#hud-modo").textContent = red.modo === "cooperativo" ? "Equipo" : "Versus";
    if (sala) aplicarEstadoCompartido(sala);
    await cuentaAtrasRed(sala?.inicio_ms);
    estado.jugando = true;
    estado.enCuenta = false;
    estado.ultimoTiempo = performance.now();
    iniciarMusica();
    requestAnimationFrame(bucle);
}

async function cuentaAtras() {
    ui.cuenta.classList.remove("oculto");
    for (const texto of ["3", "2", "1", "¡Vamos!"]) {
        ui.cuenta.textContent = texto;
        tono(texto === "¡Vamos!" ? 640 : 360, .08);
        await new Promise((resolver) => setTimeout(resolver, texto === "¡Vamos!" ? 350 : 500));
    }
    ui.cuenta.classList.add("oculto");
}

async function cuentaAtrasRed(inicioMs) {
    if (!inicioMs) return cuentaAtras();
    ui.cuenta.classList.remove("oculto");
    let anterior = "";
    while (true) {
        const restante = inicioMs - (Date.now() + red.desfaseServidor);
        if (restante <= 0) break;
        const texto = String(Math.max(1, Math.ceil(restante / 1000)));
        ui.cuenta.textContent = texto;
        if (texto !== anterior) {
            tono(360, .08);
            anterior = texto;
        }
        await new Promise((resolver) => setTimeout(resolver, 50));
    }
    ui.cuenta.textContent = "¡Vamos!";
    tono(640, .08);
    await new Promise((resolver) => setTimeout(resolver, 250));
    ui.cuenta.classList.add("oculto");
}

function crearResiduo(especialPermitido = true) {
    if (estado.residuos.length >= 5 + estado.mision * 2) return;
    let posicion;
    for (let intento = 0; intento < 30; intento += 1) {
        posicion = { x: aleatorio(55, 905), y: aleatorio(175, 550) };
        const libre = CONTENEDORES.every((c) => distancia(posicion, c) > 100)
            && distancia(posicion, estado.jugador) > 90
            && estado.residuos.every((r) => distancia(posicion, r) > 55);
        if (libre) break;
    }
    const tipo = elegir(TIPOS);
    const dorado = especialPermitido && estado.mision === 2 && Math.random() < .2;
    const contaminacion = CONTAMINACION[tipo.nivel];
    estado.residuos.push({
        ...tipo, ...posicion, id: ++idResiduo, dorado,
        pulso: Math.random() * 6.28, vida: contaminacion.duracion,
        vidaMaxima: contaminacion.duracion,
    });
}

function manejarEntrada(codigo, activa) {
    const mapa = {
        KeyW: "arriba", ArrowUp: "arriba", KeyS: "abajo", ArrowDown: "abajo",
        KeyA: "izquierda", ArrowLeft: "izquierda", KeyD: "derecha", ArrowRight: "derecha",
        Space: "correr",
    };
    if (mapa[codigo]) {
        entrada[mapa[codigo]] = activa;
        return true;
    }
    return false;
}

window.addEventListener("keydown", (evento) => {
    const elemento = evento.target;
    const escribiendo =
        elemento instanceof HTMLInputElement ||
        elemento instanceof HTMLTextAreaElement ||
        elemento instanceof HTMLSelectElement ||
        elemento?.isContentEditable;

    // No interceptar letras cuando el jugador escribe su nombre o el código.
    if (escribiendo) return;

    if (estado.jugando && manejarEntrada(evento.code, true)) {
        evento.preventDefault();
    }
    if (estado.jugando && (evento.code === "KeyP" || evento.code === "Escape")) {
        evento.preventDefault();
        alternarPausa();
    }
});
window.addEventListener("keyup", (evento) => {
    if (estado.jugando) manejarEntrada(evento.code, false);
});
window.addEventListener("blur", () => {
    Object.keys(entrada).forEach((clave) => { entrada[clave] = false; });
    if (estado.jugando && !estado.pausado) alternarPausa();
});

document.querySelectorAll("[data-direccion]").forEach((boton) => {
    const direccion = boton.dataset.direccion;
    const activar = (evento) => { evento.preventDefault(); entrada[direccion] = true; };
    const soltar = (evento) => { evento.preventDefault(); entrada[direccion] = false; };
    boton.addEventListener("pointerdown", activar);
    boton.addEventListener("pointerup", soltar);
    boton.addEventListener("pointercancel", soltar);
    boton.addEventListener("pointerleave", soltar);
});
const botonCorrer = $("#boton-correr");
botonCorrer.addEventListener("pointerdown", (e) => { e.preventDefault(); entrada.correr = true; });
["pointerup", "pointercancel", "pointerleave"].forEach((tipo) => botonCorrer.addEventListener(tipo, () => { entrada.correr = false; }));

function alternarPausa() {
    if (!estado.jugando || estado.enCuenta) return;
    estado.pausado = !estado.pausado;
    ui.pausa.classList.toggle("oculto", !estado.pausado);
    $("#boton-pausa").textContent = estado.pausado ? "▶" : "Ⅱ";
    if (estado.pausado) detenerMusica(); else iniciarMusica();
    if (!estado.pausado) {
        estado.ultimoTiempo = performance.now();
        requestAnimationFrame(bucle);
    }
}

function actualizar(delta) {
    const j = estado.jugador;
    let dx = Number(entrada.derecha) - Number(entrada.izquierda);
    let dy = Number(entrada.abajo) - Number(entrada.arriba);
    const moviendo = dx !== 0 || dy !== 0;
    if (moviendo) avanzarTutorial(0);
    if (moviendo) {
        const largo = Math.hypot(dx, dy);
        dx /= largo; dy /= largo;
        j.dirX = dx; j.dirY = dy;
    }

    const corriendo = entrada.correr && moviendo && j.energia > 1;
    const impulsoVelocidad = estado.boost === "velocidad" ? 1.35 : 1;
    const velocidad = (corriendo ? 330 : 225) * impulsoVelocidad;
    const respuesta = moviendo ? 12 : 16;
    j.vx += (dx * velocidad - j.vx) * Math.min(1, respuesta * delta);
    j.vy += (dy * velocidad - j.vy) * Math.min(1, respuesta * delta);
    j.x = limitar(j.x + j.vx * delta, LIMITE_JUGADOR.izquierda, LIMITE_JUGADOR.derecha);
    // Permite acercarse lo suficiente a la fila superior de contenedores.
    j.y = limitar(j.y + j.vy * delta, LIMITE_JUGADOR.arriba, LIMITE_JUGADOR.abajo);
    j.energia = limitar(j.energia + (corriendo ? -34 : 20) * delta, 0, 100);

    if (corriendo && ajustes.particulas && Math.random() < delta * 12) {
        crearParticulas(j.x - j.dirX * 18, j.y - j.dirY * 18, "#e9e2bc", 1);
    }

    if (esModoLocal()) {
        if (!estado.llevando) {
            const indice = estado.residuos.findIndex((residuo) => distancia(j, residuo) < 39);
            if (indice >= 0) {
                estado.llevando = estado.residuos.splice(indice, 1)[0];
                avanzarTutorial(1);
                efectoSonido("recoger");
                const riesgo = CONTAMINACION[estado.llevando.nivel];
                mostrarMensaje(`${estado.llevando.icono} ${estado.llevando.nombre} · Nivel ${riesgo.marca} · ${riesgo.puntos} pts`, false);
            }
        } else {
            const contenedor = CONTENEDORES.find((c) => distancia(j, c) < 70);
            if (contenedor) entregar(contenedor);
        }

        procesarCaducidad(delta);
        procesarAyudas(delta);

        estado.aparicion += delta;
        const intervalo = [2.4, 1.9, 1.45][estado.mision];
        if (estado.aparicion >= intervalo) {
            estado.aparicion = 0;
            crearResiduo();
        }
        estado.invulnerable = Math.max(0, estado.invulnerable - delta);
        if (estado.boostRestante > 0) {
            estado.boostRestante = Math.max(0, estado.boostRestante - delta);
            if (estado.boostRestante === 0) estado.boost = null;
        }
        estado.tiempo = Math.max(0, estado.tiempo - delta);
        if (red.modo === "ecosistema") actualizarEcosistema(delta);
    }
    estado.particulas.forEach((p) => { p.x += p.vx * delta; p.y += p.vy * delta; p.vida -= delta; });
    estado.particulas = estado.particulas.filter((p) => p.vida > 0);
    estado.sacudida = Math.max(0, estado.sacudida - delta * 24);
    sincronizarJugador();
    if (estado.tiempo <= 0) terminar();
    actualizarHUD();
}

function actualizarEcosistema(delta) {
    const eco = estado.ecosistema;
    eco.agua = limitar(eco.agua - delta * .12, 0, 100);
    eco.suelo = limitar(eco.suelo - delta * .1, 0, 100);
    eco.vida = limitar(eco.vida - delta * .14, 0, 100);
    if (Math.min(eco.agua, eco.suelo, eco.vida) <= 0) terminar(false, "ecosistema");
}

function impactoEcologico(categoria, nivel) {
    const impactos = {
        plastico: { agua: 8, suelo: 2, vida: 4 }, papel: { agua: 2, suelo: 7, vida: 5 },
        vidrio: { agua: 6, suelo: 5, vida: 3 }, organico: { agua: 2, suelo: 9, vida: 7 },
        metal: { agua: 7, suelo: 3, vida: 6 },
    };
    Object.entries(impactos[categoria]).forEach(([clave, valor]) => {
        estado.ecosistema[clave] = limitar(estado.ecosistema[clave] + valor * (1 + (nivel - 1) * .25), 0, 100);
    });
    const minimo = Math.round(Math.min(...Object.values(estado.ecosistema)));
    mostrarMensaje(`Cadena recuperada · el indicador más bajo está en ${minimo}%`, false);
    if (Object.values(estado.ecosistema).every((valor) => valor >= ECO_META)) terminar(true, "ecosistema");
}

function procesarCaducidad(delta) {
    const expirados = [];
    estado.residuos.forEach((residuo) => {
        residuo.vida -= delta;
        if (residuo.vida <= 3 && !residuo.avisado && residuo.nivel >= 2) {
            residuo.avisado = true;
            mostrarMensaje(`Atención: ${residuo.nombre} desaparecerá pronto`, true);
            tono(residuo.nivel === 3 ? 180 : 240, .08);
        }
        if (residuo.vida <= 0) expirados.push(residuo);
    });
    if (!expirados.length) return;
    estado.residuos = estado.residuos.filter((residuo) => residuo.vida > 0);
    expirados.forEach((residuo) => {
        crearParticulas(residuo.x, residuo.y, CONTAMINACION[residuo.nivel].color, 8);
        if (residuo.nivel >= 2) recibirDano(residuo.nivel === 3
            ? "Un residuo altamente contaminante dañó el parque"
            : "Un residuo contaminante desapareció");
    });
}

function recibirDano(motivo) {
    if (estado.invulnerable > 0 || !estado.jugando) return;
    estado.vida = Math.max(0, estado.vida - 1);
    estado.invulnerable = 1.25;
    estado.combo = 0;
    estado.sacudida = ajustes.sacudida ? 10 : 0;
    mostrarMensaje(`−1 corazón · ${motivo}`, true);
    efectoSonido("dano");
    if (estado.vida === 0) terminar(false, "sin-vida");
}

function crearAyuda() {
    if (estado.ayudas.length >= 1) return;
    const necesitaVida = estado.vida < estado.vidaMaxima;
    const opciones = necesitaVida
        ? ["vida", "vida", "velocidad", "puntos"]
        : ["velocidad", "puntos"];
    estado.ayudas.push({
        id: `ayuda-${++idResiduo}`, tipo: elegir(opciones),
        x: aleatorio(70, ANCHO - 70), y: aleatorio(190, ALTO - 55),
        vida: 9, pulso: Math.random() * 6.28,
    });
}

function procesarAyudas(delta) {
    estado.aparicionAyuda -= delta;
    if (estado.aparicionAyuda <= 0) {
        crearAyuda();
        estado.aparicionAyuda = aleatorio(11, 16);
    }
    estado.ayudas.forEach((ayuda) => { ayuda.vida -= delta; });
    estado.ayudas = estado.ayudas.filter((ayuda) => ayuda.vida > 0);
    const indice = estado.ayudas.findIndex((ayuda) => distancia(estado.jugador, ayuda) < 42);
    if (indice < 0) return;
    const ayuda = estado.ayudas.splice(indice, 1)[0];
    if (ayuda.tipo === "vida") {
        estado.vida = Math.min(estado.vidaMaxima, estado.vida + 1);
        mostrarMensaje("+1 corazón · Botiquín", false);
        efectoSonido("vida");
    } else {
        estado.boost = ayuda.tipo;
        estado.boostRestante = 8;
        mostrarMensaje(ayuda.tipo === "velocidad" ? "Impulso veloz · 8 segundos" : "Puntos dobles · 8 segundos", false);
        efectoSonido("potenciador");
    }
    crearParticulas(ayuda.x, ayuda.y, ayuda.tipo === "vida" ? "#b73d32" : "#f4c542", 14);
}

function entregar(contenedor) {
    const residuo = estado.llevando;
    if (contenedor.categoria !== residuo.categoria) {
        estado.errores += 1;
        estado.combo = 0;
        estado.puntos = Math.max(0, estado.puntos - 4);
        estado.sacudida = ajustes.sacudida ? 7 : 0;
        mostrarMensaje(`No: ${residuo.nombre} va en ${CATEGORIAS[residuo.categoria].nombre}`, true);
        efectoSonido("error");
        jRebote();
        return;
    }

    const multiplicador = Math.min(4, 1 + Math.floor(estado.combo / 3));
    const contaminacion = CONTAMINACION[residuo.nivel];
    const base = residuo.dorado ? contaminacion.puntos * 2 : contaminacion.puntos;
    const boostPuntos = estado.boost === "puntos" ? 2 : 1;
    const ganados = base * multiplicador * boostPuntos;
    estado.puntos += ganados;
    estado.reciclados += 1;
    estado.entregas += 1;
    estado.combo += 1;
    estado.mejorCombo = Math.max(estado.mejorCombo, estado.combo);
    estado.llevando = null;
    avanzarTutorial(2);
    if (red.modo === "ecosistema") impactoEcologico(residuo.categoria, residuo.nivel);
    crearParticulas(contenedor.x, contenedor.y, residuo.dorado ? "#f4c542" : CATEGORIAS[residuo.categoria].color, residuo.dorado ? 18 : 10);
    efectoSonido(residuo.dorado ? "dorado" : estado.combo >= 3 ? "racha" : "acierto");
    mostrarMensaje(`${residuo.dorado ? "¡Hallazgo dorado! " : ""}+${ganados} · Contaminación ${contaminacion.nombre}`, false);
    avanzarMision();
}

function jRebote() {
    const j = estado.jugador;
    j.x = limitar(j.x - j.dirX * 32, LIMITE_JUGADOR.izquierda, LIMITE_JUGADOR.derecha);
    j.y = limitar(j.y - j.dirY * 32, LIMITE_JUGADOR.arriba, LIMITE_JUGADOR.abajo);
}

function avanzarMision() {
    if (estado.mision === 1) {
        estado.progresoMision = estado.combo;
    } else {
        estado.progresoMision += 1;
    }
    const mision = MISIONES[estado.mision];
    if (estado.progresoMision < mision.objetivo) return;
    if (estado.mision === MISIONES.length - 1) {
        estado.puntos += 100 + Math.ceil(estado.tiempo) * 2;
        terminar(true);
        return;
    }
    estado.mision += 1;
    estado.progresoMision = 0;
    estado.tiempo = Math.min(DURACION, estado.tiempo + 12);
    for (let i = 0; i < 3; i += 1) crearResiduo();
    mostrarMensaje(`Etapa superada · +12 segundos`, false);
    efectoSonido("mision");
}

function crearParticulas(x, y, color, cantidad) {
    if (!ajustes.particulas) return;
    for (let i = 0; i < cantidad; i += 1) {
        const angulo = Math.random() * Math.PI * 2;
        const rapidez = aleatorio(35, 115);
        estado.particulas.push({ x, y, color, vx: Math.cos(angulo) * rapidez, vy: Math.sin(angulo) * rapidez, vida: aleatorio(.35, .75), tam: aleatorio(3, 7) });
    }
}

function obtenerAudio() {
    try {
        audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();
        return audioCtx;
    } catch { return null; }
}

function tono(frecuencia, duracion, tipo = "sine", volumen = .05, retraso = 0) {
    if (!ajustes.sonido || !obtenerAudio()) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const inicio = audioCtx.currentTime + retraso;
        osc.type = tipo;
        osc.frequency.value = frecuencia;
        gain.gain.setValueAtTime(volumen, inicio);
        gain.gain.exponentialRampToValueAtTime(.001, inicio + duracion);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(inicio);
        osc.stop(inicio + duracion);
    } catch { /* El juego continúa si Web Audio no está disponible. */ }
}

function efectoSonido(tipo) {
    const efectos = {
        recoger: [[440, .05, "triangle", .045, 0], [590, .07, "sine", .035, .04]],
        acierto: [[523, .08, "triangle", .05, 0], [659, .1, "triangle", .04, .06]],
        racha: [[523, .07, "triangle", .05, 0], [659, .08, "triangle", .045, .05], [784, .12, "sine", .04, .1]],
        dorado: [[659, .08, "sine", .05, 0], [831, .1, "sine", .05, .06], [988, .16, "triangle", .04, .12]],
        error: [[190, .12, "square", .035, 0], [145, .16, "sawtooth", .025, .08]],
        dano: [[150, .15, "sawtooth", .04, 0], [95, .24, "square", .025, .1]],
        vida: [[523, .09, "sine", .045, 0], [659, .1, "sine", .045, .07], [880, .15, "sine", .035, .14]],
        potenciador: [[440, .07, "triangle", .04, 0], [660, .1, "triangle", .04, .05], [880, .14, "triangle", .035, .1]],
        mision: [[392, .1, "triangle", .045, 0], [523, .12, "triangle", .045, .09], [659, .18, "sine", .04, .18]],
    };
    (efectos[tipo] || []).forEach((nota) => tono(...nota));
}

function iniciarMusica() {
    detenerMusica();
    if (!ajustes.musica || !estado.jugando || estado.pausado) return;
    const melodia = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
    const tocarPaso = () => {
        if (!ajustes.musica || !estado.jugando || estado.pausado) return;
        const nota = melodia[pasoMusical % melodia.length];
        const efectosActivos = ajustes.sonido;
        ajustes.sonido = true;
        tono(nota, .34, "triangle", .035);
        if (pasoMusical % 2 === 0) tono(nota / 2, .42, "sine", .022);
        ajustes.sonido = efectosActivos;
        pasoMusical += 1;
        musicaTimer = setTimeout(tocarPaso, 430);
    };
    tocarPaso();
}

function detenerMusica() {
    clearTimeout(musicaTimer);
    musicaTimer = null;
}

function mostrarMensaje(texto, negativo) {
    clearTimeout(mensajeTimer);
    ui.mensaje.textContent = texto;
    ui.mensaje.classList.remove("oculto");
    ui.mensaje.classList.toggle("negativo", negativo);
    mensajeTimer = setTimeout(() => ui.mensaje.classList.add("oculto"), 1300);
}

function actualizarHUD() {
    const mision = MISIONES[estado.mision];
    const progreso = estado.mision === 1 ? Math.min(estado.combo, mision.objetivo) : estado.progresoMision;
    ui.puntos.textContent = estado.puntos.toLocaleString("es");
    ui.tiempo.textContent = Math.ceil(estado.tiempo);
    ui.combo.textContent = `×${Math.min(4, 1 + Math.floor(estado.combo / 3))}`;
    const corazones = Array.from({ length: estado.vidaMaxima }, (_, indice) =>
        indice < estado.vida ? "♥" : "♡"
    ).join(" ");
    $("#hud-vida").textContent = corazones;
    $("#hud-vida").setAttribute("aria-label", `${estado.vida} de ${estado.vidaMaxima} corazones`);
    ui.objeto.textContent = estado.llevando ? `${estado.llevando.icono} ${estado.llevando.nombre}` : "Manos libres";
    ui.energia.style.width = `${estado.jugador.energia}%`;
    ui.energiaMeter.setAttribute("aria-valuenow", Math.round(estado.jugador.energia));
    ui.mision.textContent = red.modo === "ecosistema" ? "Equilibra la cadena ecológica" : mision.nombre;
    ui.misionProgreso.textContent = `${progreso} / ${mision.objetivo}`;
    ui.misionEtapa.textContent = `Etapa ${estado.mision + 1} de ${MISIONES.length}`;
    ui.progreso.style.width = `${(progreso / mision.objetivo) * 100}%`;
    ui.progresoRole.setAttribute("aria-valuemax", mision.objetivo);
    ui.progresoRole.setAttribute("aria-valuenow", progreso);
    const hudBoost = $("#hud-boost");
    hudBoost.classList.toggle("oculto", !estado.boost);
    if (estado.boost) {
        $("#hud-boost-texto").textContent = `${estado.boost === "velocidad" ? "⚡ Velocidad" : "★ Puntos ×2"} · ${Math.ceil(estado.boostRestante)}s`;
    }
    ui.tiempo.closest(".hud-dato").classList.toggle("urgente", estado.tiempo < 15);
    $("#panel-ecosistema").classList.toggle("oculto", red.modo !== "ecosistema");
    Object.entries(estado.ecosistema).forEach(([clave, valor]) => {
        $(`#eco-${clave}`).value = valor;
        $(`#eco-${clave}-valor`).textContent = Math.round(valor);
    });
}

function dibujar() {
    ctx.save();
    if (estado.sacudida) ctx.translate(aleatorio(-estado.sacudida, estado.sacudida), aleatorio(-estado.sacudida, estado.sacudida));
    dibujarParque();
    dibujarContenedores();
    dibujarResiduos();
    dibujarAyudas();
    red.jugadores
        .filter((jugador) => jugador.id !== red.jugadorId)
        .forEach((jugador) => dibujarJugadorRemoto(jugador));
    dibujarJugador();
    dibujarParticulas();
    dibujarPrimerPlanoParque();
    ctx.restore();
}

function dibujarParque() {
    const cesped = ctx.createLinearGradient(0, 0, 0, ALTO);
    cesped.addColorStop(0, "#b8dc91");
    cesped.addColorStop(.48, "#94c97c");
    cesped.addColorStop(1, "#78b56d");
    ctx.fillStyle = cesped;
    ctx.fillRect(0, 0, ANCHO, ALTO);

    ctx.fillStyle = "#dce9c4";
    ctx.fillRect(0, 0, ANCHO, 130);
    const luzLejana = ctx.createLinearGradient(0, 22, 0, 150);
    luzLejana.addColorStop(0, "rgba(255,255,255,.42)");
    luzLejana.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = luzLejana;
    ctx.fillRect(0, 22, ANCHO, 145);
    ctx.fillStyle = "rgba(23,63,53,.1)";
    for (let x = 0; x < ANCHO; x += 32) ctx.fillRect(x, 118 + (x % 64 ? 4 : 0), 22, 4);
    ctx.fillStyle = "#173f35";
    ctx.font = "700 11px 'Atkinson Hyperlegible'";
    ctx.textAlign = "left";
    ctx.fillText("PUNTO LIMPIO DEL BARRIO", 18, 21);

    ctx.strokeStyle = "rgba(92,68,38,.3)";
    ctx.lineWidth = 238;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(487, 119); ctx.bezierCurveTo(417, 245, 572, 360, 477, 640); ctx.stroke();
    ctx.strokeStyle = "#b09b6a";
    ctx.lineWidth = 228;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(480, 118); ctx.bezierCurveTo(410, 245, 565, 360, 470, 640); ctx.stroke();
    ctx.strokeStyle = "#e1ce99";
    ctx.lineWidth = 210;
    ctx.beginPath();
    ctx.moveTo(480, 118); ctx.bezierCurveTo(410, 245, 565, 360, 470, 640); ctx.stroke();
    ctx.lineCap = "butt";

    ctx.fillStyle = "rgba(101,77,43,.16)";
    [[430,185,9,4],[512,232,12,5],[452,290,8,4],[536,350,11,5],[430,415,10,4],[505,482,9,4],[405,550,12,5]].forEach(([x,y,rx,ry]) => {
        ctx.beginPath(); ctx.ellipse(x,y,rx,ry,-.2,0,Math.PI*2); ctx.fill();
    });

    ctx.strokeStyle = "rgba(38,96,73,.22)";
    ctx.lineWidth = 2;
    for (let x = 24; x < ANCHO; x += 54) {
        for (let y = 160 + (x % 76); y < ALTO; y += 88) {
            if (x > 330 && x < 635) continue;
            ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.quadraticCurveTo(x - 6, y, x - 2, y - 8);
            ctx.moveTo(x, y + 7); ctx.quadraticCurveTo(x + 7, y, x + 4, y - 9); ctx.stroke();
        }
    }

    dibujarArbol(30, 236, 1.05); dibujarArbol(918, 245, 1.12);
    dibujarArbol(54, 520, .9); dibujarArbol(907, 520, 1.02);
    dibujarArbusto(132, 174, .78); dibujarArbusto(830, 175, .82);
    dibujarArbusto(205, 525, .8); dibujarArbusto(765, 535, .75);
    dibujarBanco(190, 285); dibujarCartel(744, 238);

    [[115,360,"#f4c542"],[845,350,"#f7e8d1"],[250,430,"#dc5942"],[705,450,"#6f5aa5"]].forEach(([x,y,color]) => {
        ctx.fillStyle = color;
        for (let a=0;a<Math.PI*2;a+=Math.PI/2) { ctx.beginPath(); ctx.arc(x+Math.cos(a)*5,y+Math.sin(a)*5,4,0,Math.PI*2); ctx.fill(); }
        ctx.fillStyle="#f4c542"; ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
    });
}

function dibujarArbol(x, y, escala) {
    ctx.save(); ctx.translate(x,y); ctx.scale(escala,escala);
    ctx.fillStyle = "rgba(16,47,43,.2)"; ctx.beginPath(); ctx.ellipse(4,32,42,13,-.15,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#855832"; ctx.fillRect(-8,-12,16,52);
    ctx.fillStyle = "#245f43";
    [[0,-32,38],[-28,-18,29],[29,-16,31],[2,-61,30]].forEach(([cx,cy,r]) => { ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill(); });
    ctx.fillStyle = "#4d8a4e";
    [[-17,-45,16],[20,-39,18],[2,-68,15]].forEach(([cx,cy,r]) => { ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill(); });
    ctx.restore();
}

function dibujarBanco(x, y) {
    ctx.save(); ctx.translate(x,y); ctx.fillStyle="rgba(16,47,43,.17)";ctx.beginPath();ctx.ellipse(0,20,54,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#70462e";ctx.fillRect(-48,-8,96,12);ctx.fillRect(-45,9,90,10);ctx.fillRect(-35,18,7,18);ctx.fillRect(28,18,7,18);
    ctx.strokeStyle="#173f35";ctx.lineWidth=3;ctx.strokeRect(-48,-8,96,12);ctx.restore();
}

function dibujarCartel(x, y) {
    ctx.save();ctx.translate(x,y);ctx.fillStyle="rgba(16,47,43,.15)";ctx.beginPath();ctx.ellipse(0,38,35,8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#795033";ctx.fillRect(-5,-2,10,42);ctx.fillStyle="#fff3cf";ctx.strokeStyle="#173f35";ctx.lineWidth=3;rectRedondo(-51,-34,102,38,8);ctx.fill();ctx.stroke();
    ctx.fillStyle="#173f35";ctx.textAlign="center";ctx.font="700 11px 'Atkinson Hyperlegible'";ctx.fillText("CLASIFICA",0,-18);ctx.fillText("Y SUMA",0,-6);ctx.restore();
}

function dibujarPrimerPlanoParque() {
    ctx.save(); ctx.fillStyle = "#1b513b";
    [[-8,590,40],[25,612,34],[938,600,38],[973,577,35]].forEach(([x,y,r]) => { ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill(); });
    ctx.fillStyle = "#3f7b49";
    [[20,585,20],[948,574,19]].forEach(([x,y,r]) => { ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill(); });
    ctx.restore();
}

function dibujarArbusto(x, y, escala) {
    ctx.save(); ctx.translate(x, y); ctx.scale(escala, escala);
    ctx.fillStyle = "rgba(16,47,43,.16)"; ctx.beginPath(); ctx.ellipse(0,17,31,9,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#397446";
    [[0,0,23],[18,5,18],[-17,7,17]].forEach(([cx,cy,r]) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#f4c542";
    [[-12,-2],[13,2],[2,-13]].forEach(([cx,cy]) => { ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
}

function dibujarContenedores() {
    CONTENEDORES.forEach((c) => {
        const cat = CATEGORIAS[c.categoria];
        const cerca = estado.llevando && distancia(estado.jugador, c) < 100;
        ctx.save(); ctx.translate(c.x, c.y);
        if (cerca) {
            const correcto = estado.llevando.categoria === c.categoria;
            ctx.fillStyle = correcto ? "rgba(244,197,66,.3)" : "rgba(220,89,66,.24)";
            ctx.beginPath(); ctx.arc(0, 2, 54, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = correcto ? "#f4c542" : "#dc5942"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 2, 50, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = "rgba(23,51,45,.2)"; ctx.beginPath(); ctx.ellipse(3, 38, 40, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#17332d"; rectRedondo(-38, -34, 76, 74, 11); ctx.fill();
        ctx.fillStyle = cat.color; rectRedondo(-33, -29, 66, 64, 8); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.24)"; rectRedondo(-27, -24, 10, 52, 5); ctx.fill();
        ctx.fillStyle = "#17332d"; rectRedondo(-40, -38, 80, 15, 6); ctx.fill();
        ctx.fillStyle = "#fffaf0"; ctx.font = "700 21px 'Atkinson Hyperlegible'"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(cat.simbolo, 0, 1);
        ctx.fillStyle = "#fffaf0"; rectRedondo(-28, 19, 56, 13, 4); ctx.fill();
        ctx.fillStyle = "#17332d"; ctx.font = "700 10px 'Atkinson Hyperlegible'"; ctx.fillText(cat.corto, 0, 26);
        ctx.restore();
    });
}

function dibujarResiduos() {
    const ahora = movimientoReducido ? 0 : performance.now() / 1000;
    estado.residuos.forEach((r) => {
        const flotacion = Math.sin(ahora * 3 + r.pulso) * 3;
        const contaminacion = CONTAMINACION[r.nivel];
        const urgente = r.vida <= 3;
        ctx.save(); ctx.translate(r.x, r.y + flotacion);
        ctx.fillStyle = "rgba(23,51,45,.2)"; ctx.beginPath(); ctx.ellipse(2, 20, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
        if (r.dorado) {
            ctx.strokeStyle = "#f4c542"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 25 + Math.sin(ahora * 5) * 2, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = "#173f35"; ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fffaf0"; ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = contaminacion.color;
        ctx.lineWidth = urgente ? 5 : 3;
        ctx.globalAlpha = urgente ? .55 + Math.sin(ahora * 12) * .35 : 1;
        ctx.beginPath();
        ctx.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (r.vida / r.vidaMaxima));
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.font = "25px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(r.icono, 0, 1);
        ctx.fillStyle = contaminacion.color;
        ctx.font = "700 10px 'Atkinson Hyperlegible'";
        ctx.fillText(contaminacion.marca, 0, 34);
        ctx.restore();
    });
}

function dibujarAyudas() {
    const ahora = performance.now() / 1000;
    estado.ayudas.forEach((ayuda) => {
        const escala = 1 + Math.sin(ahora * 5 + ayuda.pulso) * .07;
        ctx.save();
        ctx.translate(ayuda.x, ayuda.y);
        ctx.scale(escala, escala);
        ctx.fillStyle = "rgba(23,51,45,.18)";
        ctx.beginPath(); ctx.ellipse(0, 20, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ayuda.tipo === "vida" ? "#fffaf0" : "#f4c542";
        ctx.strokeStyle = "#173f35"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ayuda.tipo === "vida" ? "#b73d32" : "#173f35";
        ctx.font = ayuda.tipo === "vida" ? "700 25px sans-serif" : "700 23px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(ayuda.tipo === "vida" ? "♥" : ayuda.tipo === "velocidad" ? "⚡" : "×2", 0, 1);
        ctx.fillStyle = "#173f35"; ctx.font = "700 10px 'Atkinson Hyperlegible'";
        ctx.fillText(ayuda.tipo === "vida" ? "VIDA" : "BOOST", 0, 36);
        ctx.restore();
    });
}

function dibujarJugador() {
    const j = estado.jugador;
    // Segunda barrera de seguridad: evita que estados antiguos o sincronizados
    // lleguen al render fuera del área visible del parque.
    j.x = limitar(j.x, LIMITE_JUGADOR.izquierda, LIMITE_JUGADOR.derecha);
    j.y = limitar(j.y, LIMITE_JUGADOR.arriba, LIMITE_JUGADOR.abajo);
    const andando = Math.hypot(j.vx, j.vy) > 20;
    const ahora = movimientoReducido ? 0 : performance.now();
    const paso = andando ? Math.sin(ahora / 72) * 5 : Math.sin(ahora / 520) * 1.4;
    const respiracion = andando ? 1 : 1 + Math.sin(ahora / 520) * .025;
    const parpadea = !movimientoReducido && ahora % 3200 > 3070;
    ctx.save(); ctx.translate(j.x, j.y + paso); ctx.scale(ESCALA_JUGADOR, ESCALA_JUGADOR);
    ctx.fillStyle = "rgba(16,47,43,.3)"; ctx.beginPath(); ctx.ellipse(4, 29 - paso, andando ? 29 : 24, andando ? 10 : 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.scale(1, respiracion);
    const aspecto = PERSONAJES[estado.personaje] || PERSONAJES.exploradora;
    ctx.strokeStyle = "#17332d"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-7,22); ctx.lineTo(-10,34 + paso); ctx.moveTo(7,22); ctx.lineTo(10,34 - paso); ctx.stroke();
    ctx.fillStyle = "#5a4030"; ctx.beginPath(); ctx.arc(-10,34+paso,4,0,Math.PI*2);ctx.arc(10,34-paso,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle = "#e0a744"; rectRedondo(-22,-1,11,25,5); ctx.fill();
    const camiseta = ctx.createLinearGradient(-17, 0, 18, 26);
    camiseta.addColorStop(0, aspecto.camiseta);
    camiseta.addColorStop(.68, aspecto.camiseta);
    camiseta.addColorStop(1, "#173f35");
    ctx.fillStyle = camiseta; ctx.strokeStyle="#17332d";ctx.lineWidth=3;rectRedondo(-17, 0, 34, 29, 10); ctx.fill();ctx.stroke();
    const brazo = andando ? Math.sin(ahora / 72) * 7 : Math.sin(ahora / 650) * 1.5;
    ctx.strokeStyle = aspecto.piel; ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-14,8);ctx.lineTo(-21,18+brazo);ctx.moveTo(14,8);ctx.lineTo(21,18-brazo);ctx.stroke();
    ctx.fillStyle = aspecto.piel; ctx.strokeStyle="#17332d";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-10,14,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle = aspecto.pelo;
    ctx.beginPath(); ctx.arc(-1, -15, 16, Math.PI, aspecto.peloLargo ? Math.PI * 2.2 : Math.PI * 2); ctx.fill();
    if (aspecto.peloLargo) { ctx.fillRect(-16, -13, 5, 24); ctx.fillRect(11, -13, 5, 24); }
    ctx.fillStyle = "#17332d";
    ctx.beginPath();
    if (parpadea) { ctx.fillRect(-7,-9,4,1); ctx.fillRect(3,-9,4,1); }
    else { ctx.arc(-5, -9, 1.5, 0, Math.PI * 2); ctx.arc(5, -9, 1.5, 0, Math.PI * 2); }
    ctx.fill();
    if (estado.llevando) {
        ctx.fillStyle = estado.llevando.dorado ? "#f4c542" : "#fffaf0"; ctx.beginPath(); ctx.arc(0, -38, 17, 0, Math.PI * 2); ctx.fill();
        ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(estado.llevando.icono, 0, -38);
    }
    ctx.restore();
}

function dibujarJugadorRemoto(jugador) {
    const antiguedad = Math.max(0, Math.min(150,
        Date.now() + red.desfaseServidor - (jugador.actualizacion_ms || Date.now())
    )) / 1000;
    const objetivoX = limitar(jugador.x + (jugador.vx || 0) * antiguedad, LIMITE_JUGADOR.izquierda, LIMITE_JUGADOR.derecha);
    const objetivoY = limitar(jugador.y + (jugador.vy || 0) * antiguedad, LIMITE_JUGADOR.arriba, LIMITE_JUGADOR.abajo);
    const anterior = red.suavizados[jugador.id] || { x: objetivoX, y: objetivoY };
    anterior.x += (objetivoX - anterior.x) * .28;
    anterior.y += (objetivoY - anterior.y) * .28;
    anterior.x = limitar(anterior.x, LIMITE_JUGADOR.izquierda, LIMITE_JUGADOR.derecha);
    anterior.y = limitar(anterior.y, LIMITE_JUGADOR.arriba, LIMITE_JUGADOR.abajo);
    red.suavizados[jugador.id] = anterior;
    const aspecto = PERSONAJES[jugador.personaje] || PERSONAJES.guardaparque;
    const andando = Math.hypot(jugador.vx || 0, jugador.vy || 0) > 20;
    const paso = !movimientoReducido && andando ? Math.sin(performance.now() / 78 + jugador.id.length) * 4 : 0;
    ctx.save();
    ctx.globalAlpha = .88;
    ctx.translate(anterior.x, anterior.y + paso);
    ctx.scale(ESCALA_JUGADOR, ESCALA_JUGADOR);
    ctx.fillStyle = "rgba(23,51,45,.2)"; ctx.beginPath(); ctx.ellipse(0, 20, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#17332d"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-7,22); ctx.lineTo(-10,34+paso); ctx.moveTo(7,22); ctx.lineTo(10,34-paso); ctx.stroke();
    ctx.fillStyle = aspecto.camiseta; rectRedondo(-17, 1, 34, 31, 12); ctx.fill();
    ctx.fillStyle = aspecto.piel; ctx.beginPath(); ctx.arc(0, -8, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = aspecto.pelo; ctx.beginPath(); ctx.arc(0, -13, 16, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#17332d"; ctx.font = "700 13px 'Atkinson Hyperlegible'"; ctx.textAlign = "center";
    ctx.fillText(jugador.nombre, 0, -31);
    ctx.restore();
}

function dibujarParticulas() {
    estado.particulas.forEach((p) => {
        ctx.globalAlpha = limitar(p.vida * 2, 0, 1);
        ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.vida * 5); ctx.fillRect(-p.tam / 2, -p.tam / 2, p.tam, p.tam * .55); ctx.restore();
    });
    ctx.globalAlpha = 1;
}

function rectRedondo(x, y, w, h, r) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

function bucle(timestamp) {
    if (!estado.jugando || estado.pausado) return;
    const delta = Math.min((timestamp - estado.ultimoTiempo) / 1000, .05);
    estado.ultimoTiempo = timestamp;
    actualizar(delta);
    dibujar();
    if (estado.jugando) requestAnimationFrame(bucle);
}

function terminar(completado = false, causa = "tiempo") {
    if (!estado.jugando) return;
    estado.jugando = false;
    detenerMusica();
    const intentos = estado.entregas + estado.errores;
    const precision = intentos ? Math.round((estado.entregas / intentos) * 100) : 0;
    $("#final-puntos").textContent = estado.puntos.toLocaleString("es");
    $("#final-reciclados").textContent = estado.reciclados;
    $("#final-racha").textContent = estado.mejorCombo;
    $("#final-precision").textContent = `${precision}%`;
    $("#titulo-final").textContent = completado
        ? "¡El parque vuelve a respirar!"
        : causa === "sin-vida" ? "El parque necesita otra patrulla" : "La patrulla ha terminado";
    $("#final-resumen").textContent = `${estado.nombre}, clasificaste ${estado.reciclados} residuos y alcanzaste una racha de ${estado.mejorCombo}.`;
    $("#medalla-final").textContent = completado ? "🌳" : estado.reciclados >= 8 ? "🌿" : "🌱";
    $("#final-reto").textContent = causa === "sin-vida"
        ? "Próximo reto: prioriza los residuos con marca II y III antes de que expiren."
        : precision < 80 ? "Próximo reto: supera el 80% de precisión." : estado.mejorCombo < 6 ? "Próximo reto: encadena 6 entregas correctas." : "Próximo reto: completa la patrulla con más tiempo restante.";
    if (completado) efectoSonido("mision"); else tono(420, .25);
    if (!esModoLocal()) enviarEstadoRed(true);
    Campania.registrarParque(estado.puntos, estado.reciclados);
}

function mostrarResultadoVersus() {
    const panel = $("#final-versus");
    if (Campania.modo !== "versus" || red.jugadores.length < 2) {
        panel.classList.add("oculto");
        return;
    }
    const clasificacion = [...red.jugadores].sort((a, b) => b.puntos - a.puntos);
    const mejorPuntaje = clasificacion[0].puntos;
    const ganadores = clasificacion.filter((jugador) => jugador.puntos === mejorPuntaje);
    const propio = clasificacion.find((jugador) => jugador.id === red.jugadorId);
    const posicion = clasificacion.findIndex((jugador) => jugador.id === red.jugadorId) + 1;
    const empate = ganadores.length > 1;
    const nombresGanadores = ganadores.map((jugador) => jugador.nombre).join(" y ");
    $("#titulo-final").textContent = empate ? "¡El versus terminó en empate!" : `¡${nombresGanadores} gana el versus!`;
    panel.textContent = `${empate ? "Empate" : "Ganador"}: ${nombresGanadores} con ${mejorPuntaje} puntos · Tu resultado: ${propio?.puntos || 0} puntos, posición ${posicion} de ${clasificacion.length}.`;
    panel.classList.remove("oculto");
    if (propio && ganadores.some((jugador) => jugador.id === propio.id)) $("#medalla-final").textContent = "🏆";
}

window.mostrarFinalCampania = function mostrarFinalCampania(correctas) {
    document.body.classList.remove("en-campania");
    const total = Campania.total();
    $("#final-puntos").textContent = total.toLocaleString("es");
    $("#titulo-final").textContent = "¡Misión ecológica completada!";
    $("#final-resumen").textContent = `${Campania.nombre}, recorriste las cuatro etapas y acertaste ${correctas} de 3 preguntas.`;
    $("#final-reto").textContent = correctas === 3 ? "Dominas las decisiones esenciales. Ahora llévalas a tu casa y comunidad." : "Cada pequeño hábito cuenta: clasifica, repara fugas y apaga lo que no utilizas.";
    $("#medalla-final").textContent = correctas === 3 ? "🏆" : "🌍";
    mostrarResultadoVersus();
    const nombres = { reciclaje: "Parque", agua: "Llaves", energia: "Casa", reforestacion: "Bosque" };
    const desglose = $("#desglose-etapas"); desglose.replaceChildren();
    Object.entries(Campania.puntos).forEach(([clave, puntos]) => { const item = document.createElement("div"); item.innerHTML = `<span>${nombres[clave]}</span><strong>${puntos} pts</strong>`; desglose.appendChild(item); });
    mostrarPantalla(ui.final); cargarRanking();
};

async function guardarPuntuacion() {
    try {
        const respuesta = await fetch("/api/puntuaciones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre: estado.nombre, puntos: estado.puntos, objetos_reciclados: estado.reciclados }),
        });
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    } catch (error) {
        console.warn("La puntuación no pudo guardarse.", error);
    }
    cargarRanking();
}

async function cargarRanking() {
    const listas = [$("#lista-ranking-inicio"), $("#lista-ranking-final")];
    try {
        const respuesta = await fetch("/api/puntuaciones");
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        const datos = await respuesta.json();
        listas.forEach((lista) => pintarRanking(lista, datos));
    } catch {
        listas.forEach((lista) => {
            lista.innerHTML = '<li class="vacio">El ranking no está disponible. Puedes jugar igualmente.</li>';
        });
    }
}

function pintarRanking(lista, datos) {
    lista.replaceChildren();
    if (!datos.length) {
        lista.innerHTML = '<li class="vacio">Aún no hay patrullas. ¡Abre el camino!</li>';
        return;
    }
    datos.slice(0, 8).forEach((dato) => {
        const li = document.createElement("li");
        const nombre = document.createElement("span");
        const puntos = document.createElement("strong");
        const objetos = document.createElement("small");
        nombre.textContent = dato.nombre_jugador;
        puntos.textContent = `${dato.puntos} pts`;
        objetos.textContent = `${dato.objetos_reciclados} ♻`;
        li.append(nombre, puntos, objetos);
        lista.appendChild(li);
    });
}

async function peticionJSON(url, opciones = {}) {
    const respuesta = await fetch(url, {
        headers: { "Content-Type": "application/json", ...(opciones.headers || {}) },
        ...opciones,
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.error || "No se pudo conectar con la sala");
    return datos;
}

function mostrarErrorSala(error) {
    const mensaje = $("#sala-error");
    mensaje.textContent = error.message || String(error);
    mensaje.classList.remove("oculto");
}

function configurarSalaVisible() {
    ui.form.classList.add("oculto");
    $("#panel-sala").classList.remove("oculto");
    $("#sala-error").classList.add("oculto");
}

async function crearSala() {
    try {
        const datos = await peticionJSON("/api/salas", {
            method: "POST",
            body: JSON.stringify({
                modo: red.modo,
                nombre: ui.nombre.value.trim(),
                personaje: document.querySelector('input[name="personaje"]:checked').value,
            }),
        });
        Object.assign(red, { codigo: datos.codigo, token: datos.token, jugadorId: datos.jugador_id, anfitrion: true });
        entrarEspera();
    } catch (error) { mostrarErrorSala(error); }
}

async function unirseSala(evento) {
    evento.preventDefault();
    const codigo = $("#codigo-sala").value.trim().toUpperCase();
    if (codigo.length !== 4) {
        mostrarErrorSala(new Error("Escribe las cuatro letras del código."));
        return;
    }
    try {
        const datos = await peticionJSON(`/api/salas/${encodeURIComponent(codigo)}/unirse`, {
            method: "POST",
            body: JSON.stringify({
                nombre: ui.nombre.value.trim(),
                personaje: document.querySelector('input[name="personaje"]:checked').value,
            }),
        });
        Object.assign(red, { codigo: datos.codigo, token: datos.token, jugadorId: datos.jugador_id, anfitrion: false });
        entrarEspera();
    } catch (error) { mostrarErrorSala(error); }
}

function entrarEspera() {
    $("#acciones-sala").classList.add("oculto");
    $("#sala-espera").classList.remove("oculto");
    $("#sala-codigo").textContent = red.codigo;
    clearInterval(red.intervalo);
    consultarSala();
    red.intervalo = setInterval(consultarSala, 400);
}

async function consultarSala() {
    if (!red.codigo || !red.token) return;
    const inicioPeticion = performance.now();
    try {
        const sala = await peticionJSON(`/api/salas/${red.codigo}?token=${encodeURIComponent(red.token)}`);
        actualizarRelojServidor(sala, inicioPeticion, performance.now());
        red.jugadores = sala.jugadores;
        red.anfitrion = sala.eres_anfitrion;
        red.modo = sala.modo;
        const lista = $("#sala-jugadores");
        lista.replaceChildren(...sala.jugadores.map((jugador) => {
            const item = document.createElement("li");
            item.textContent = `${PERSONAJES[jugador.personaje]?.nombre || "Jugador"} · ${jugador.nombre}`;
            return item;
        }));
        const minimo = sala.min_jugadores || 2;
        const maximo = sala.max_jugadores || 10;
        const puedeIniciar = sala.jugadores.length >= minimo;
        const cupos = `${sala.jugadores.length}/${maximo} jugadores`;
        $("#sala-estado").textContent = puedeIniciar
            ? (red.anfitrion
                ? `${cupos} · Puedes iniciar o esperar a más personas.`
                : `${cupos} · Esperando que el anfitrión inicie…`)
            : `${cupos} · Esperando al menos a otra persona…`;
        $("#iniciar-sala").classList.toggle("oculto", !red.anfitrion || !puedeIniciar || sala.estado === "jugando");
        actualizarMarcadorRed();
        if (sala.estado === "jugando") comenzarDesdeSala(sala);
    } catch (error) {
        mostrarErrorSala(error);
        clearInterval(red.intervalo);
    }
}

async function iniciarSala() {
    try {
        const inicioPeticion = performance.now();
        const sala = await peticionJSON(`/api/salas/${red.codigo}/iniciar`, {
            method: "POST", body: JSON.stringify({ token: red.token }),
        });
        // El anfitrión entra inmediatamente; el invitado lo hace al recibir
        // el estado "jugando" en el siguiente sondeo.
        actualizarRelojServidor(sala, inicioPeticion, performance.now());
        await comenzarDesdeSala(sala);
    } catch (error) { mostrarErrorSala(error); }
}

function sincronizarJugador() {
    if (esModoLocal() || red.enviando || performance.now() - red.envioAnterior < 55) return;
    red.envioAnterior = performance.now();
    enviarEstadoRed(false);
}

async function enviarEstadoRed(terminado) {
    if (!red.codigo || !red.token) return;
    red.enviando = true;
    const inicioPeticion = performance.now();
    try {
        const sala = await peticionJSON(`/api/salas/${red.codigo}/estado`, {
            method: "POST",
            body: JSON.stringify({
                token: red.token, x: estado.jugador.x, y: estado.jugador.y,
                vx: estado.jugador.vx, vy: estado.jugador.vy,
                terminado,
            }),
        });
        actualizarRelojServidor(sala, inicioPeticion, performance.now());
        aplicarEstadoCompartido(sala);
    } catch {
        // Un corte breve de Wi-Fi no debe detener la partida local.
    } finally {
        red.enviando = false;
    }
}

function actualizarRelojServidor(sala, inicioPeticion, finPeticion) {
    if (!sala?.servidor_ms) return;
    const estimacionAhora = sala.servidor_ms + (finPeticion - inicioPeticion) / 2;
    const muestra = estimacionAhora - Date.now();
    if (!red.relojSincronizado) {
        red.desfaseServidor = muestra;
        red.relojSincronizado = true;
    } else {
        red.desfaseServidor += (muestra - red.desfaseServidor) * .2;
    }
}

function aplicarEstadoCompartido(sala) {
    if (!sala?.jugadores || !sala.mundo) return;
    red.jugadores = sala.jugadores;
    const propio = sala.jugadores.find((jugador) => jugador.id === red.jugadorId);
    if (!propio) return;
    estado.puntos = propio.puntos;
    estado.reciclados = propio.reciclados;
    estado.combo = propio.racha;
    estado.mejorCombo = Math.max(estado.mejorCombo, propio.racha);
    estado.vida = propio.vida;
    estado.llevando = propio.llevando;
    estado.boost = propio.boost;
    estado.boostRestante = propio.boost
        ? Math.max(0, propio.boost_hasta - Date.now() / 1000)
        : 0;
    estado.residuos = sala.mundo.residuos;
    estado.ayudas = sala.mundo.ayudas;
    estado.tiempo = sala.mundo.tiempo;
    actualizarMarcadorRed();
    if (sala.estado === "terminado" && estado.jugando) {
        terminar(false, estado.vida <= 0 ? "sin-vida" : "tiempo");
    }
}

function actualizarMarcadorRed() {
    if (esModoLocal() || !red.jugadores.length) return;
    const propio = red.jugadores.find((j) => j.id === red.jugadorId);
    const rival = red.jugadores.find((j) => j.id !== red.jugadorId);
    if (red.modo === "cooperativo") {
        $("#hud-marcador").textContent = red.jugadores.reduce((total, j) => total + j.puntos, 0);
        $("#hud-rival").textContent = rival ? `${rival.nombre}: ${rival.puntos} · ${"♥".repeat(rival.vida)}` : "Esperando…";
    } else {
        $("#hud-marcador").textContent = propio?.puntos || estado.puntos;
        $("#hud-rival").textContent = rival ? `${rival.nombre}: ${rival.puntos} · ${"♥".repeat(rival.vida)}` : "Esperando…";
    }
}

ui.form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    red.modo = document.querySelector('input[name="modo"]:checked').value;
    red.partidaIniciada = false;
    if (esModoLocal()) {
        $("#hud-red").classList.add("oculto");
        comenzar();
    } else {
        configurarSalaVisible();
    }
});
$("#tutorial-omitir").addEventListener("click", () => {
    estado.tutorialPaso = PASOS_TUTORIAL.length;
    actualizarTutorial();
});
$("#crear-sala").addEventListener("click", crearSala);
$("#form-unirse").addEventListener("submit", unirseSala);
$("#iniciar-sala").addEventListener("click", iniciarSala);
$("#volver-configuracion").addEventListener("click", () => {
    clearInterval(red.intervalo);
    Object.assign(red, { modo: "solo", codigo: "", token: "", jugadorId: "", jugadores: [], partidaIniciada: false });
    $("#panel-sala").classList.add("oculto");
    $("#sala-espera").classList.add("oculto");
    $("#acciones-sala").classList.remove("oculto");
    ui.form.classList.remove("oculto");
});
$("#boton-jugar-de-nuevo").addEventListener("click", () => {
    desconectarSala();
    document.querySelector('input[name="modo"][value="solo"]').checked = true;
    comenzar();
});
$("#boton-inicio").addEventListener("click", () => {
    desconectarSala();
    document.body.classList.remove("en-campania");
    mostrarPantalla(ui.inicio);
    ui.nombre.focus();
    cargarRanking();
});
$("#boton-pausa").addEventListener("click", alternarPausa);
$("#boton-continuar").addEventListener("click", alternarPausa);
$("#boton-salir").addEventListener("click", () => {
    estado.jugando = false; estado.pausado = false; ui.pausa.classList.add("oculto");
    detenerMusica();
    desconectarSala();
    document.body.classList.remove("en-campania");
    mostrarPantalla(ui.inicio);
});

const dialogo = $("#dialogo-ajustes");
$("#boton-ajustes").addEventListener("click", () => dialogo.showModal());
[
    ["#ajuste-sonido", "sonido"],
    ["#ajuste-musica", "musica"],
    ["#ajuste-particulas", "particulas"],
    ["#ajuste-sacudida", "sacudida"],
    ["#ajuste-contraste", "contraste"],
].forEach(([selector, clave]) => {
    const control = $(selector);
    control.checked = ajustes[clave];
    control.addEventListener("change", () => {
        ajustes[clave] = control.checked;
        if (clave === "musica") {
            if (ajustes.musica) iniciarMusica(); else detenerMusica();
        }
        document.body.classList.toggle("alto-contraste", ajustes.contraste);
        guardarAjustes();
    });
});
document.body.classList.toggle("alto-contraste", ajustes.contraste);
dialogo.addEventListener("close", () => $("#boton-ajustes").focus());

cargarRanking();
dibujar();
window.addEventListener("resize", configurarResolucionCanvas);
