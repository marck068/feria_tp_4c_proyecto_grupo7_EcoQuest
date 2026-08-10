# Rediseño integral de EcoRecicla

## 1. Resumen del concepto mejorado

Una patrulla de rescate en tres actos: recoger, identificar, elegir ruta y
entregar alimenta una racha; correr ahorra tiempo, pero consume energía. El
objetivo final es restaurar el parque antes del límite.

## 2. Diagnóstico de los problemas actuales

El prototipo no tenía decisiones, metas intermedias, variación ni final
alcanzable. Un error consumía el residuo; color y emoji sostenían casi toda la
información. Faltaban pausa, controles táctiles, sonido y accesibilidad. Se
conservan el núcleo educativo, la vista superior, las partidas breves, Canvas,
Flask y el ranking local.

## 3. Nueva propuesta de experiencia

La partida alterna exploración, decisión de ruta, tensión por mantener la racha
y alivio al superar una etapa. La identidad es un cartel ilustrado de
guardaparques: cálido, reconocible y legible.

## 4. Ciclo principal de juego

Localizar → recoger → reconocer categoría → decidir ruta y uso de carrera →
entregar → recibir corrección o recompensa → sostener la racha → superar misión.
El reloj crea tensión; los doce segundos ganados entre etapas dan descanso.

## 5. Mecánicas mejoradas

| Mecánica | Decisión | Valor inicial |
|---|---|---:|
| Movimiento | Ruta y posicionamiento | 225 px/s |
| Carrera | Tiempo frente a energía | 330 px/s |
| Energía | Cuándo acelerar | coste 34/s, recarga 20/s |
| Clasificación | Cinco categorías redundantes | color + texto + símbolo |
| Racha | Precisión frente a multiplicador | nivel cada 3, máximo ×4 |
| Error | Corregir y recuperarse | −4 puntos, conserva objeto |
| Reloj | Presión legible | 75 s, +12 s por etapa |

## 6. Nuevas mecánicas recomendadas

Ya incorporadas: carrera limitada, tres misiones, combo, residuo dorado y bonus
de etapa, selector de tres personajes humanos, cooperativo local y versus local.
También se incluyen tres corazones, residuos con caducidad y valor por nivel de
contaminación, botiquines y potenciadores temporales de velocidad y puntos.
Para una segunda versión: obstáculos reales, contenedores llenos
temporalmente y detector con enfriamiento. No conviene añadir combate: diluiría
el aprendizaje.

## 7. Diseño de progresión

- Frecuente: puntos y feedback por entrega.
- Intermedia: multiplicador cada tres aciertos.
- Importante: etapa superada y tiempo adicional.
- Excepcional: residuo dorado y restauración completa.
- Habilidad: precisión, mejor racha y tiempo restante.
- Persistencia: ranking; cosméticos y logros quedan para una fase futura.

## 8. Diseño de niveles

1. Sendero escuela: categorías separadas; primer dorado.
2. Plaza concurrida: peatones lentos; ruta sin choques.
3. Ribera: puentes estrechos; atajo que exige energía.
4. Picnic: oleada corta de orgánicos.
5. Día de viento: residuos se desplazan con aviso de hojas.
6. Mercado: cajas abren pasillos al reciclar papel.
7. Lluvia: charcos reducen aceleración.
8. Festival: objetivos simultáneos y pausas de calma.
9. Vivero: rutas seguras para vidrio.
10. Gran rescate: combina viento, atajos y puntos limpios rotatorios.

Cada nivel debe introducir, practicar, combinar y evaluar una sola idea nueva.

## 9. Enemigos y jefes

El tema funciona mejor con condiciones del parque que con enemigos: viento,
cuervo, bolsa atascada, lluvia y camión de limpieza. Un jefe apropiado es una
tormenta en tres fases, con ráfagas señaladas, lluvia y ventanas de calma.

## 10. Dirección artística

Pino `#173f35`, crema `#f7f0d8`, hoja `#4d8b4a`, diente de león `#f4c542`,
arroyo `#267b91` y coral `#cf513f`. Formas redondeadas, contornos selectivos,
vegetación simplificada y fondo de menor contraste que los interactivos.

## 11. Animaciones

Balanceo al caminar, dirección inmediata, residuos flotantes y objeto cargado
visible. Siguiente paso: sprites de reposo, carrera, frenado, recogida y
celebración, sin acoplar la respuesta del control a la animación.

## 12. Efectos visuales

Polvo al correr, fragmentos al entregar, halo dorado, mensajes y sacudida sólo
en error. Partículas y sacudida se pueden desactivar; la interfaz respeta
`prefers-reduced-motion`.

## 13. Sonido y música

Hay señales distintas para recogida, acierto, error, etapa y victoria mediante
Web Audio. La siguiente fase debe sumar ambiente, ritmo suave y percusión de
urgencia, con controles separados para música, efectos y ambiente.

## 14. Cámara

El primer nivel usa cámara fija para enseñar el mapa y evitar mareos. En mapas
mayores: zona muerta del 18%, anticipación de 60 px, suavizado de 120 ms, límites
firmes y zoom breve de 4% al completar etapa.

## 15. Interfaz

Misión y progreso dominan; puntos, tiempo, racha, carga y energía son
secundarios. Inicio, pausa, resultado, ranking y ajustes admiten teclado y
mensajes útiles.

## 16. Tutorial

Orden: mover → tocar un residuo → observar nombre/símbolo → entregar en el punto
destacado → probar un error sin perder objeto → introducir carrera → mostrar
racha → presentar dorado. Debe convertirse en avisos contextuales descartables.

## 17. Narrativa

La patrulla limpia un parque tras un evento comunitario. Cada etapa recupera
sendero, zonas verdes y claro central. El entorno y el informe cuentan la
historia sin diálogos largos.

## 18. Accesibilidad

Incluido: teclado, táctil, foco visible, alto contraste, señales redundantes,
movimiento reducido y efectos configurables. Pendiente: reasignación, Gamepad,
subtítulos visuales completos y escala de interfaz.

## 19. Optimización

Canvas único, delta máximo de 50 ms, hasta nueve residuos y partículas de vida
corta. Para escalar: pools, atlas de sprites, precarga de audio y partición
espacial al superar treinta objetos.

## 20. Equilibrio

La curva usa objetivos 4/6/7, aparición de 2.4 a 1.45 segundos, acierto base de
10, error de 4 y combo cada tres aciertos. Busca enseñar, evaluar y cerrar en
una partida de 75 segundos sin castigo duro.

## 21. Plan de pruebas

Probar con cinco jugadores nuevos y cinco recurrentes. Medir tiempo al primer
residuo, errores, precisión, racha, etapa, uso de carrera e inactividad.
Preguntar: “¿qué intentabas hacer?”, “¿por qué fallaste?”, “¿qué cambió?” y
“¿qué recuerdas?”. Meta: 90% comprende el objetivo y 80% supera la etapa uno.

## 22. Lista priorizada de tareas

- Crítica: validar controles, colisiones, final y API en varios navegadores.
- Alta: sprites propios, tutorial contextual y balance con jugadores.
- Media: mapas, eventos, mando y audio por capas.
- Opcional: cosméticos, retos locales, contrarreloj y final alternativo.

## 23. Plan de implementación por etapas

1. Núcleo y final (completado).
2. Misiones, combo, balance y ranking (completado).
3. Arte, responsive, sonido y accesibilidad (completado).
4. Validación humana y ajuste de métricas.
5. Niveles, eventos y sprites.
6. Audio final, accesibilidad ampliada y gama baja.

## 24. Ejemplos técnicos o código

Los parámetros editables están al inicio de `static/js/game.js`. La interfaz
está en `templates/index.html`, el sistema visual en `static/css/style.css` y
Flask valida y persiste resultados en `app.py`.

## 25. Riesgos y errores que deben evitarse

No aumentar dificultad sólo con cantidad; depender de color; lanzar eventos sin
aviso; ocultar al jugador con partículas; aceptar puntuaciones sin validar ni
usar el ranking como presión manipuladora.

## 26. Checklist final de calidad

- [x] Objetivo visible antes de jugar.
- [x] Movimiento inmediato, diagonal normalizada y carrera limitada.
- [x] Errores explicables y recuperables.
- [x] Tres ritmos y final alcanzable.
- [x] Feedback configurable.
- [x] Pausa, táctil, foco y reducción de movimiento.
- [x] API compatible y ranking construido con nodos de texto.
- [ ] Diez pruebas humanas.
- [ ] Sprites y audio originales.
- [ ] Gamepad y pruebas en dispositivos de gama baja.
