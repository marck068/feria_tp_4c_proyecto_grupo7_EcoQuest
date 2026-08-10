# EcoRecicla — Rescate del parque 🌱

Juego de clasificación, velocidad y dominio en vista superior, hecho con **HTML, CSS y JavaScript**
en el frontend, y **Python + Flask** en el backend, con una base de datos
**SQLite** para guardar las puntuaciones.

## Cómo jugar

- Muévete con **W A S D** o las flechas del teclado.
- Mantén **Espacio** para correr mientras tengas energía.
- Pulsa **P** o **Escape** para pausar.
- Camina sobre un residuo para recogerlo (solo puedes llevar uno a la vez).
- Llévalo hasta el contenedor del color/categoría correcta:
  - 🟡 Plástico · 🔵 Papel/Cartón · 🟢 Vidrio · 🟤 Orgánico · ⚪ Metal
- Los aciertos consecutivos aumentan el multiplicador hasta **×4**.
- Un error resta 4 puntos, muestra la categoría correcta y conserva el residuo.
- El jugador tiene **3 corazones**. Los residuos desaparecen al agotarse su
  anillo; los de contaminación media y alta pueden causar daño.
- Nivel I: 8 puntos y 14 segundos; nivel II: 16 puntos y 10 segundos; nivel III:
  32 puntos y 7 segundos.
- Los botiquines recuperan un corazón. Los potenciadores conceden velocidad o
  puntos dobles durante 8 segundos.
- Supera tres misiones antes de que terminen los 75 segundos.
- En pantallas táctiles aparecen una cruceta y un botón de carrera.

El juego incluye sonido local, partículas, alto contraste y controles para
reducir movimiento, sacudida y efectos visuales.

## Multijugador local

El menú permite elegir entre:

- **En solitario:** la experiencia clásica individual.
- **Cooperativo local:** dos jugadores comparten el objetivo y el marcador suma
  los puntos del equipo.
- **Versus local:** ambos juegan simultáneamente y comparan su puntuación.

En los modos locales, el servidor controla un único parque compartido: ambos
ven los mismos residuos y ayudas en las mismas posiciones. Una recogida o
entrega se refleja para los dos. El movimiento utiliza actualización rápida e
interpolación visual para evitar saltos del otro personaje.

Para jugar entre dos dispositivos:

1. Ejecuta `python app.py` en el computador anfitrión.
2. Ambos abren `http://IP-LOCAL:5000` desde la misma red Wi-Fi.
3. El primer jugador selecciona un modo local y pulsa **Crear sala**.
4. El segundo selecciona el mismo tipo de modo, escribe el código de cuatro
   letras y pulsa **Unirme**.
5. El anfitrión inicia cuando aparezcan los dos nombres.

Las salas viven en memoria: se eliminan al reiniciar el servidor y no necesitan
cuentas ni conexión a Internet.

## Estructura del proyecto

```
reciclaje-game/
├── app.py                 # Rutas de Flask y arranque del servidor
├── database.py             # Acceso a la base de datos SQLite
├── requirements.txt        # Dependencias de Python
├── templates/
│   └── index.html          # Estructura de la página
└── static/
    ├── css/style.css       # Estilos visuales del juego
    └── js/game.js          # Lógica del juego (canvas, física, API)
```

## Instalación y ejecución

1. (Recomendado) Crea un entorno virtual:
   ```bash
   python3 -m venv venv
   source venv/bin/activate      # En Windows: venv\Scripts\activate
   ```

2. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

3. Ejecuta el servidor:
   ```bash
   python app.py
   ```

4. Abre tu navegador en:
   ```
   http://127.0.0.1:5000
   ```

La primera vez que se ejecuta, se crea automáticamente el archivo
`reciclaje.db` con la tabla de puntuaciones — no necesitas configurar
nada más.

## API disponible

| Método | Ruta                  | Descripción                                  |
|--------|-----------------------|-----------------------------------------------|
| GET    | `/api/puntuaciones`   | Devuelve el top 10 de puntuaciones            |
| POST   | `/api/puntuaciones`   | Guarda una nueva puntuación (`nombre`, `puntos`, `objetos_reciclados`) |
