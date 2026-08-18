# EcoRecicla — Rescate del parque 🌱

Juego educativo organizado como una aventura de cuatro etapas, hecho con **HTML, CSS y JavaScript**
en el frontend, y **Python + Flask** en el backend, con una base de datos
**SQLite** para guardar las puntuaciones.

## Recorrido de la aventura

Cada partida continúa automáticamente por cuatro etapas breves:

1. Clasificar residuos en el parque.
2. Cerrar las llaves de agua que gotean.
3. Apagar las luces encendidas de una casa.
4. Reforestar el bosque siguiendo el orden cavar, plantar y regar.

Después se presenta un cuestionario de tres preguntas y una reflexión sobre lo
aprendido. Las respuestas y el resultado completo se guardan en SQLite. La
clasificación final suma los puntos de las cuatro etapas y se ordena de mayor a
menor.

## Cómo jugar en el parque

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
- Supera tres misiones breves antes de que termine el tiempo.
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

## Plan de rediseño fotorrealista (pendiente)

> **Estado:** planificado, todavía no implementado.
>
> Este apartado documenta la próxima fase visual. Antes de comenzar se debe
> decidir si se usarán fotografías reales con licencia o renders
> fotorrealistas creados específicamente para el juego. Se recomiendan los
> renders fotorrealistas porque permiten preparar pares idénticos de cada
> escena en sus estados encendido/apagado y abierto/cerrado.

### 1. Etapa de las llaves de agua

- Sustituir las figuras actuales por imágenes realistas de llaves de agua.
- Preparar estados visuales diferenciados: abierta, goteando, presionada y
  cerrada.
- Mostrar agua reconocible y animar el cierre de la manilla.
- Marcar inmediatamente la llave pulsada mediante un aro, hundimiento visual,
  mensaje y sonido opcional.
- Mantener las zonas pulsables separadas de la imagen para que funcionen con
  precisión en cualquier tamaño de pantalla.

### 2. Etapa de la casa y las luces

- Reemplazar la cuadrícula abstracta por interiores realistas de una casa.
- Incluir habitaciones, lámparas e interruptores claramente reconocibles.
- Preparar una versión encendida y otra apagada de cada habitación.
- Al pulsar una luz, cambiar el interruptor, eliminar el resplandor y oscurecer
  visiblemente la habitación.
- Usar distintos tipos de iluminación, como lámparas de techo, mesa y pie, sin
  ocultar cuáles son los objetivos interactivos.

### 3. Respuesta visual de las interacciones

- Marcar la modalidad seleccionada con fondo diferenciado, borde fuerte, check
  visible y texto de confirmación.
- Añadir estados consistentes para `hover`, foco por teclado, pulsación,
  selección y desactivación.
- Hacer que todos los botones respondan visualmente desde el momento en que se
  presionan.
- Comunicar aciertos y errores con icono, texto y una animación breve, sin
  depender exclusivamente del color.
- Conservar soporte para `prefers-reduced-motion`.

### 4. Corrección del menú y multijugador

- Ajustar portada, configuración y ranking para que entren completos en
  escritorios de 1366×768 sin desplazamiento vertical.
- Reducir espacios innecesarios y equilibrar las columnas del menú.
- Mostrar la configuración multijugador en un panel o diálogo centrado.
- Separar claramente las acciones **Crear sala** y **Unirse a una sala**.
- Evitar que el campo del código o el botón **Unirme** sobresalgan del panel.
- En pantallas pequeñas, dividir la configuración en pasos compactos y evitar
  siempre el desplazamiento horizontal.

### 5. Preparación y rendimiento de imágenes

- Exportar las imágenes en WebP o AVIF con dimensiones adecuadas para cada
  escenario.
- Precargar los pares encendido/apagado y abierto/cerrado antes de iniciar la
  etapa correspondiente.
- Mostrar un estado de carga cuando un recurso tarde en estar disponible.
- Incluir alternativas accesibles para todos los objetivos visuales.
- Mantener las colisiones y zonas interactivas independientes de la resolución
  de los recursos gráficos.

### 6. Criterios de aceptación

- Todas las modalidades muestran con claridad cuál está seleccionada.
- Cada botón y objetivo ofrece confirmación visual inmediata al pulsarlo.
- Las llaves parecen objetos reales y muestran claramente cuándo gotean o están
  cerradas.
- La casa parece un espacio real y cada luz cambia de forma inequívoca entre
  encendida y apagada.
- El menú completo cabe en 1366×768, 1440×900 y 1920×1080 sin elementos
  cortados.
- No existe desplazamiento horizontal en escritorio, tableta ni móvil.
- El recorrido completo funciona con ratón, teclado y pantalla táctil.
- Se verifican las cuatro etapas, el cuestionario, el modo versus y el flujo de
  creación y unión a salas.

## API disponible

| Método | Ruta                  | Descripción                                  |
|--------|-----------------------|-----------------------------------------------|
| GET    | `/api/puntuaciones`   | Devuelve el top 10 de puntuaciones            |
| POST   | `/api/puntuaciones`   | Guarda una nueva puntuación (`nombre`, `puntos`, `objetos_reciclados`) |
| POST   | `/api/resultados`     | Guarda la campaña, sus etapas y las respuestas del cuestionario |
