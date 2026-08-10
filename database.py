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
