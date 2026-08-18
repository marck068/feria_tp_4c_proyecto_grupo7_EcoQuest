"""
database.py
-----------
Capa de acceso a datos del juego "EcoRecicla".

Usa SQLite (a través del módulo estándar sqlite3) para guardar las
puntuaciones de los jugadores y poder mostrar una tabla de mejores
puntuaciones (leaderboard).

No se necesita ningún servidor de base de datos externo: el archivo
'reciclaje.db' se crea automáticamente en la primera ejecución.
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime

# Ruta del archivo de base de datos (junto a este script)
DB_PATH = Path(__file__).parent / "reciclaje.db"


def obtener_conexion():
    """Crea y devuelve una conexión a la base de datos SQLite."""
    conexion = sqlite3.connect(DB_PATH)
    conexion.row_factory = sqlite3.Row  # Permite acceder a columnas por nombre
    return conexion


def inicializar_bd():
    """Crea la tabla de puntuaciones si todavía no existe."""
    with obtener_conexion() as conexion:
        conexion.execute(
            """
            CREATE TABLE IF NOT EXISTS puntuaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_jugador TEXT NOT NULL,
                puntos INTEGER NOT NULL,
                objetos_reciclados INTEGER NOT NULL DEFAULT 0,
                fecha TEXT NOT NULL
            )
            """
        )
        columnas = {fila[1] for fila in conexion.execute("PRAGMA table_info(puntuaciones)")}
        if "puntajes_etapas" not in columnas:
            conexion.execute("ALTER TABLE puntuaciones ADD COLUMN puntajes_etapas TEXT NOT NULL DEFAULT '{}'")
        if "modo" not in columnas:
            conexion.execute("ALTER TABLE puntuaciones ADD COLUMN modo TEXT NOT NULL DEFAULT 'individual'")
        conexion.execute(
            """
            CREATE TABLE IF NOT EXISTS cuestionarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                puntuacion_id INTEGER NOT NULL,
                nombre_jugador TEXT NOT NULL,
                respuestas TEXT NOT NULL,
                respuestas_correctas INTEGER NOT NULL,
                aprendizaje TEXT NOT NULL,
                fecha TEXT NOT NULL,
                FOREIGN KEY (puntuacion_id) REFERENCES puntuaciones(id)
            )
            """
        )
        conexion.commit()


def guardar_puntuacion(nombre_jugador, puntos, objetos_reciclados):
    """Guarda una nueva puntuación en la base de datos.

    Args:
        nombre_jugador (str): Nombre elegido por el jugador.
        puntos (int): Puntuación final obtenida en la partida.
        objetos_reciclados (int): Cantidad de objetos reciclados correctamente.

    Returns:
        int: El id de la fila insertada.
    """
    fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with obtener_conexion() as conexion:
        cursor = conexion.execute(
            """
            INSERT INTO puntuaciones (nombre_jugador, puntos, objetos_reciclados, fecha)
            VALUES (?, ?, ?, ?)
            """,
            (nombre_jugador, puntos, objetos_reciclados, fecha_actual),
        )
        conexion.commit()
        return cursor.lastrowid


def obtener_mejores_puntuaciones(limite=10):
    """Devuelve las mejores puntuaciones ordenadas de mayor a menor.

    Args:
        limite (int): Cantidad máxima de resultados a devolver.

    Returns:
        list[dict]: Lista de puntuaciones con nombre, puntos, objetos y fecha.
    """
    with obtener_conexion() as conexion:
        filas = conexion.execute(
            """
            SELECT nombre_jugador, puntos, objetos_reciclados, fecha
            FROM puntuaciones
            ORDER BY puntos DESC
            LIMIT ?
            """,
            (limite,),
        ).fetchall()

        return [dict(fila) for fila in filas]


def guardar_resultado(nombre, puntos, objetos, puntajes_etapas, modo,
                      respuestas, correctas, aprendizaje):
    """Guarda como una unidad la campaña completa y su reflexión final."""
    fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with obtener_conexion() as conexion:
        cursor = conexion.execute(
            """
            INSERT INTO puntuaciones
                (nombre_jugador, puntos, objetos_reciclados, fecha, puntajes_etapas, modo)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (nombre, puntos, objetos, fecha_actual,
             json.dumps(puntajes_etapas, ensure_ascii=False), modo),
        )
        puntuacion_id = cursor.lastrowid
        conexion.execute(
            """
            INSERT INTO cuestionarios
                (puntuacion_id, nombre_jugador, respuestas, respuestas_correctas, aprendizaje, fecha)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (puntuacion_id, nombre, json.dumps(respuestas, ensure_ascii=False),
             correctas, aprendizaje, fecha_actual),
        )
        conexion.commit()
        return puntuacion_id
