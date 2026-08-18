"""
app.py
------
Servidor Flask del juego "EcoRecicla".

Rutas:
    GET  /                  -> Página principal donde se juega el juego.
    GET  /api/puntuaciones  -> Devuelve las mejores puntuaciones guardadas.
    POST /api/puntuaciones  -> Guarda una nueva puntuación al terminar la partida.
"""

import secrets
import string
import threading
import time
import math
import random

from flask import Flask, render_template, request, jsonify

from database import (inicializar_bd, guardar_puntuacion,
                      obtener_mejores_puntuaciones, guardar_resultado)

app = Flask(__name__)
inicializar_bd()

salas = {}
bloqueo_salas = threading.Lock()
MIN_JUGADORES = 2
MAX_JUGADORES = 10
RETARDO_INICIO_RED = 3.0
DURACION_ETAPA_PARQUE = 75
CONTENEDORES_RED = {
    "plastico": (100, 72), "papel": (290, 72), "vidrio": (480, 72),
    "organico": (670, 72), "metal": (860, 72),
}
RESIDUOS_RED = [
    ("Periódico", "papel", "📰", 1), ("Caja de cartón", "papel", "📦", 1),
    ("Cáscara de fruta", "organico", "🍌", 1),
    ("Botella plástica", "plastico", "🧴", 2), ("Lata", "metal", "🥫", 2),
    ("Frasco de vidrio", "vidrio", "🍾", 2),
    ("Pila usada", "metal", "🔋", 3), ("Envase químico", "plastico", "☣️", 3),
]
NIVELES_RED = {
    1: {"puntos": 8, "duracion": 14},
    2: {"puntos": 16, "duracion": 10},
    3: {"puntos": 32, "duracion": 7},
}


def limpiar_salas():
    """Elimina salas locales sin actividad durante dos horas."""
    limite = time.time() - 7200
    for codigo in list(salas):
        if salas[codigo]["actualizada"] < limite:
            del salas[codigo]


def crear_codigo():
    alfabeto = string.ascii_uppercase
    while True:
        codigo = "".join(secrets.choice(alfabeto) for _ in range(4))
        if codigo not in salas:
            return codigo


def jugador_publico(jugador):
    return {
        clave: jugador[clave]
        for clave in ("id", "nombre", "personaje", "x", "y", "puntos",
                      "reciclados", "racha", "vida", "terminado", "llevando",
                      "boost", "boost_hasta", "vx", "vy", "actualizacion_ms")
    }


def distancia_red(a, b):
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"])


def crear_residuo_red(sala):
    nombre, categoria, icono, nivel = random.choice(RESIDUOS_RED)
    ahora = time.time()
    sala["secuencia"] += 1
    sala["mundo"]["residuos"].append({
        "id": f"r-{sala['secuencia']}", "nombre": nombre, "categoria": categoria,
        "icono": icono, "nivel": nivel, "x": random.randint(55, 905),
        "y": random.randint(175, 545), "vida": NIVELES_RED[nivel]["duracion"],
        "vidaMaxima": NIVELES_RED[nivel]["duracion"], "creado": ahora,
        "dorado": random.random() < .12, "pulso": random.random() * 6.28,
    })


def crear_ayuda_red(sala):
    sala["secuencia"] += 1
    necesita_vida = any(j["vida"] < 3 for j in sala["jugadores"].values())
    opciones = ["vida", "vida", "velocidad", "puntos"] if necesita_vida else ["velocidad", "puntos"]
    sala["mundo"]["ayudas"] = [{
        "id": f"a-{sala['secuencia']}", "tipo": random.choice(opciones),
        "x": random.randint(70, 890), "y": random.randint(190, 545),
        "creado": time.time(), "vida": 9, "pulso": random.random() * 6.28,
    }]


def iniciar_mundo_red(sala, inicio=None):
    ahora = inicio if inicio is not None else time.time()
    sala["secuencia"] = 0
    sala["mundo"] = {
        "residuos": [], "ayudas": [], "inicio": ahora, "tiempo": DURACION_ETAPA_PARQUE,
        "proxima_aparicion": ahora + 2.2, "proxima_ayuda": ahora + 7,
    }
    for _ in range(4):
        crear_residuo_red(sala)
    for residuo in sala["mundo"]["residuos"]:
        residuo["creado"] = ahora


def actualizar_mundo_red(sala):
    """Avanza el mundo compartido y resuelve colisiones en el servidor."""
    mundo = sala.get("mundo")
    if sala["estado"] != "jugando" or not mundo:
        return
    ahora = time.time()
    mundo["tiempo"] = max(0, min(DURACION_ETAPA_PARQUE,
                                  DURACION_ETAPA_PARQUE - (ahora - mundo["inicio"])))
    if ahora < mundo["inicio"]:
        return

    expirados = [
        r for r in mundo["residuos"]
        if ahora - r["creado"] >= r["vidaMaxima"]
    ]
    mundo["residuos"] = [r for r in mundo["residuos"] if r not in expirados]
    if any(r["nivel"] >= 2 for r in expirados):
        for jugador in sala["jugadores"].values():
            jugador["vida"] = max(0, jugador["vida"] - 1)
            jugador["racha"] = 0

    if ahora >= mundo["proxima_aparicion"] and len(mundo["residuos"]) < 8:
        crear_residuo_red(sala)
        mundo["proxima_aparicion"] = ahora + 1.7
    if ahora >= mundo["proxima_ayuda"]:
        crear_ayuda_red(sala)
        mundo["proxima_ayuda"] = ahora + random.uniform(11, 16)
    mundo["ayudas"] = [
        a for a in mundo["ayudas"] if ahora - a["creado"] < 9
    ]

    for jugador in sala["jugadores"].values():
        if jugador["boost_hasta"] <= ahora:
            jugador["boost"] = None
        if not jugador["llevando"]:
            encontrado = next(
                (r for r in mundo["residuos"] if distancia_red(jugador, r) < 39),
                None,
            )
            if encontrado:
                jugador["llevando"] = encontrado
                mundo["residuos"].remove(encontrado)
        else:
            for categoria, (x, y) in CONTENEDORES_RED.items():
                if math.hypot(jugador["x"] - x, jugador["y"] - y) < 70:
                    residuo = jugador["llevando"]
                    if categoria == residuo["categoria"]:
                        mult = min(4, 1 + jugador["racha"] // 3)
                        base = NIVELES_RED[residuo["nivel"]]["puntos"]
                        if residuo["dorado"]:
                            base *= 2
                        if jugador["boost"] == "puntos":
                            base *= 2
                        jugador["puntos"] += base * mult
                        jugador["reciclados"] += 1
                        jugador["racha"] += 1
                        jugador["llevando"] = None
                    break
        ayuda = next(
            (a for a in mundo["ayudas"] if distancia_red(jugador, a) < 42), None
        )
        if ayuda:
            if ayuda["tipo"] == "vida":
                jugador["vida"] = min(3, jugador["vida"] + 1)
            else:
                jugador["boost"] = ayuda["tipo"]
                jugador["boost_hasta"] = ahora + 8
            mundo["ayudas"].remove(ayuda)

    if mundo["tiempo"] <= 0 or all(j["vida"] <= 0 for j in sala["jugadores"].values()):
        sala["estado"] = "terminado"


def obtener_sala_jugador(codigo, token):
    sala = salas.get(codigo.upper())
    if not sala:
        return None, None
    jugador = next(
        (j for j in sala["jugadores"].values() if j["token"] == token), None
    )
    return sala, jugador


def estado_publico_sala(sala, jugador):
    ahora = time.time()
    mundo = sala.get("mundo")
    mundo_publico = None
    if mundo:
        mundo_publico = {
            "tiempo": mundo["tiempo"],
            "residuos": [
                {**r, "vida": max(0, min(r["vidaMaxima"],
                    r["vidaMaxima"] - (ahora - r["creado"])))}
                for r in mundo["residuos"]
            ],
            "ayudas": [
                {**a, "vida": max(0, min(9, 9 - (ahora - a["creado"])))}
                for a in mundo["ayudas"]
            ],
        }
    return {
        "codigo": sala["codigo"], "modo": sala["modo"],
        "estado": sala["estado"],
        "eres_anfitrion": jugador["id"] == sala["anfitrion"],
        "jugadores": [jugador_publico(j) for j in sala["jugadores"].values()],
        "min_jugadores": MIN_JUGADORES,
        "max_jugadores": MAX_JUGADORES,
        "mundo": mundo_publico,
        "servidor_ms": int(ahora * 1000),
        "inicio_ms": int(mundo["inicio"] * 1000) if mundo else None,
    }


@app.route("/")
def index():
    """Renderiza la página principal con el juego."""
    return render_template("index.html")


@app.route("/api/puntuaciones", methods=["GET"])
def api_obtener_puntuaciones():
    """Devuelve el top de puntuaciones en formato JSON."""
    mejores = obtener_mejores_puntuaciones(limite=10)
    return jsonify(mejores)


@app.route("/api/puntuaciones", methods=["POST"])
def api_guardar_puntuacion():
    """Recibe el resultado de una partida y lo guarda en la base de datos."""
    datos = request.get_json(silent=True) or {}

    nombre_jugador = str(datos.get("nombre", "")).strip()[:20] or "Anónimo"
    puntos = datos.get("puntos", 0)
    objetos_reciclados = datos.get("objetos_reciclados", 0)

    # Validación básica de tipos para no guardar datos corruptos
    try:
        puntos = int(puntos)
        objetos_reciclados = int(objetos_reciclados)
    except (TypeError, ValueError):
        return jsonify({"error": "Los puntos y objetos reciclados deben ser números"}), 400

    if not 0 <= puntos <= 100_000 or not 0 <= objetos_reciclados <= 1_000:
        return jsonify({"error": "La puntuación está fuera del rango permitido"}), 400

    nuevo_id = guardar_puntuacion(nombre_jugador, puntos, objetos_reciclados)

    return jsonify({"id": nuevo_id, "mensaje": "Puntuación guardada correctamente"}), 201


@app.post("/api/resultados")
def api_guardar_resultado():
    datos = request.get_json(silent=True) or {}
    nombre = str(datos.get("nombre", "")).strip()[:20] or "Anónimo"
    aprendizaje = str(datos.get("aprendizaje", "")).strip()[:500]
    respuestas = datos.get("respuestas", {})
    etapas = datos.get("puntajes_etapas", {})
    modo = str(datos.get("modo", "individual"))[:20]
    if not aprendizaje:
        return jsonify({"error": "Cuéntanos brevemente qué aprendiste"}), 400
    if not isinstance(respuestas, dict) or not isinstance(etapas, dict):
        return jsonify({"error": "El resultado no tiene un formato válido"}), 400
    try:
        puntos = int(datos.get("puntos", 0))
        objetos = int(datos.get("objetos_reciclados", 0))
        correctas = int(datos.get("respuestas_correctas", 0))
        etapas_limpias = {str(k)[:30]: max(0, min(int(v), 100000)) for k, v in etapas.items()}
    except (TypeError, ValueError):
        return jsonify({"error": "Los puntajes deben ser números"}), 400
    if not 0 <= puntos <= 400000 or not 0 <= objetos <= 1000 or not 0 <= correctas <= 3:
        return jsonify({"error": "Resultado fuera del rango permitido"}), 400
    nuevo_id = guardar_resultado(nombre, puntos, objetos, etapas_limpias, modo,
                                 respuestas, correctas, aprendizaje)
    return jsonify({"id": nuevo_id, "mensaje": "Campaña guardada"}), 201


@app.post("/api/salas")
def api_crear_sala():
    datos = request.get_json(silent=True) or {}
    modo = datos.get("modo")
    if modo not in ("cooperativo", "versus"):
        return jsonify({"error": "Modo de sala no válido"}), 400
    nombre = str(datos.get("nombre", "")).strip()[:20] or "Jugador 1"
    personaje = str(datos.get("personaje", "exploradora"))[:20]
    with bloqueo_salas:
        limpiar_salas()
        codigo = crear_codigo()
        token = secrets.token_urlsafe(24)
        jugador_id = "j1"
        salas[codigo] = {
            "codigo": codigo,
            "modo": modo,
            "estado": "esperando",
            "anfitrion": jugador_id,
            "actualizada": time.time(),
            "jugadores": {
                jugador_id: {
                    "id": jugador_id, "token": token, "nombre": nombre,
                    "personaje": personaje, "x": 430, "y": 430, "puntos": 0,
                    "reciclados": 0, "racha": 0, "vida": 3, "terminado": False,
                    "llevando": None, "boost": None, "boost_hasta": 0,
                    "vx": 0, "vy": 0, "actualizacion_ms": int(time.time() * 1000),
                }
            },
        }
    return jsonify({"codigo": codigo, "token": token, "jugador_id": jugador_id}), 201


@app.post("/api/salas/<codigo>/unirse")
def api_unirse_sala(codigo):
    datos = request.get_json(silent=True) or {}
    with bloqueo_salas:
        sala = salas.get(codigo.upper())
        if not sala:
            return jsonify({"error": "La sala no existe"}), 404
        if sala["estado"] != "esperando":
            return jsonify({"error": "La partida ya comenzó"}), 409
        if len(sala["jugadores"]) >= MAX_JUGADORES:
            return jsonify({"error": "La sala está completa"}), 409
        numero_jugador = next(
            numero for numero in range(2, MAX_JUGADORES + 1)
            if f"j{numero}" not in sala["jugadores"]
        )
        jugador_id = f"j{numero_jugador}"
        token = secrets.token_urlsafe(24)
        columna = (numero_jugador - 1) % 5
        fila = (numero_jugador - 1) // 5
        sala["jugadores"][jugador_id] = {
            "id": jugador_id, "token": token,
            "nombre": str(datos.get("nombre", "")).strip()[:20] or f"Jugador {numero_jugador}",
            "personaje": str(datos.get("personaje", "guardaparque"))[:20],
            "x": 320 + columna * 80, "y": 390 + fila * 70,
            "puntos": 0, "reciclados": 0, "racha": 0,
            "vida": 3, "terminado": False,
            "llevando": None, "boost": None, "boost_hasta": 0,
            "vx": 0, "vy": 0, "actualizacion_ms": int(time.time() * 1000),
        }
        sala["actualizada"] = time.time()
    return jsonify({"codigo": codigo.upper(), "token": token, "jugador_id": jugador_id})


@app.get("/api/salas/<codigo>")
def api_estado_sala(codigo):
    token = request.args.get("token", "")
    with bloqueo_salas:
        sala, jugador = obtener_sala_jugador(codigo, token)
        if not sala or not jugador:
            return jsonify({"error": "Acceso de sala no válido"}), 404
        sala["actualizada"] = time.time()
        actualizar_mundo_red(sala)
        return jsonify(estado_publico_sala(sala, jugador))


@app.post("/api/salas/<codigo>/iniciar")
def api_iniciar_sala(codigo):
    token = (request.get_json(silent=True) or {}).get("token", "")
    with bloqueo_salas:
        sala, jugador = obtener_sala_jugador(codigo, token)
        if not sala or not jugador or jugador["id"] != sala["anfitrion"]:
            return jsonify({"error": "Sólo el anfitrión puede iniciar"}), 403
        if len(sala["jugadores"]) < MIN_JUGADORES:
            return jsonify({"error": "Se necesitan al menos dos jugadores"}), 409
        sala["estado"] = "jugando"
        sala["actualizada"] = time.time()
        iniciar_mundo_red(sala, time.time() + RETARDO_INICIO_RED)
        respuesta = estado_publico_sala(sala, jugador)
    return jsonify(respuesta)


@app.post("/api/salas/<codigo>/estado")
def api_actualizar_jugador(codigo):
    datos = request.get_json(silent=True) or {}
    with bloqueo_salas:
        sala, jugador = obtener_sala_jugador(codigo, datos.get("token", ""))
        if not sala or not jugador:
            return jsonify({"error": "Acceso de sala no válido"}), 404
        # El cliente sólo controla su posición. Puntos, vida, objetos y ayudas
        # son autoritativos del servidor para que ambos vean el mismo mundo.
        for clave, minimo, maximo in (
            ("x", 0, 960), ("y", 0, 600),
            ("vx", -500, 500), ("vy", -500, 500),
        ):
            try:
                jugador[clave] = max(minimo, min(maximo, float(datos.get(clave, jugador[clave]))))
            except (TypeError, ValueError):
                pass
        jugador["actualizacion_ms"] = int(time.time() * 1000)
        jugador["terminado"] = bool(datos.get("terminado", False))
        sala["actualizada"] = time.time()
        actualizar_mundo_red(sala)
        respuesta = estado_publico_sala(sala, jugador)
    return jsonify(respuesta)


if __name__ == "__main__":
    inicializar_bd()
    app.run(host="0.0.0.0", port=5000, debug=False)
