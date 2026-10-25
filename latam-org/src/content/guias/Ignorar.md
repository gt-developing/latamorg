---
title: Guía de ejemplo con todo lo que puedes usar
description: Plantilla con todos los elementos de markdown que puedes usar para escribir una guía.
image: https://static0.gamerantimages.com/wordpress/wp-content/uploads/2026/10/star-citizen-squadron-42-trailer-still-game-rant-27.jpg?q=49&fit=contain&w=3840&h=2160&dpr=2
---

Este párrafo es la introducción de la guía. Aquí explicas en una o dos frases **qué va a aprender** el lector. Puedes usar **negrita** para lo importante, *cursiva* para dar énfasis o ***ambas a la vez***.

También puedes escribir `código en línea` para nombres de teclas, comandos o botones, por ejemplo: pulsa `F11` para abrir el mapa.

## Antes de empezar

Los títulos con `##` crean las secciones principales de la guía. El título grande de arriba sale solo de `title`, así que **no uses `#`** en el contenido.

### Requisitos

Los `###` sirven para dividir una sección en partes más pequeñas.

#### Detalles

Y con `####` puedes bajar un nivel más, aunque casi nunca hace falta.

## Listas

Lista con viñetas, ideal para cosas sin orden:

- Una cuenta de RSI
- Espacio suficiente en disco
- Conexión estable a internet

Lista numerada, ideal para pasos que van en orden:

1. Inicia sesión en el launcher.
2. Elige tu servidor.
3. Explora tu hangar y sal a conocer la ciudad.

Listas dentro de listas, para agrupar detalles:

- Naves para empezar
  - Aurora MR
  - Mustang Alpha
- Naves para carga
  - Hull A
  - Cutlass Black

## Citas y avisos

Una cita con `>` sirve para consejos, advertencias o notas destacadas:

> **Consejo:** no te frustres con los errores iniciales, forman parte del desarrollo.

> **Advertencia:** guarda tu progreso antes de cerrar el juego.

## Imágenes

Una imagen se escribe con `![descripción](dirección)`. La descripción es el texto alternativo y ayuda a la accesibilidad:

![Escena de Star Citizen](https://static0.gamerantimages.com/wordpress/wp-content/uploads/2026/10/star-citizen-squadron-42-trailer-still-game-rant-27.jpg?q=49&fit=contain&w=3840&h=2160&dpr=2)

*Puedes poner un pie de foto en cursiva justo debajo de la imagen.*

Para usar una imagen tuya, ponla en la carpeta `public/` y escribe su ruta, por ejemploo `![Mi nave](/mi-nave.jpg)`.

## Enlaces

- Enlace a otra guía de la página: [Rutas de comercio para principiantes](/guias/rutas-de-comercio)
- Enlace a un recurso de la página: [Glosario en español](/recursos/glosario)
- Enlace a una web externa: [Sitio oficial de Star Citizen](https://robertsspaceindustries.com)

## Bloques de código

Útil para comandos, configuraciones o texto que se debe copiar tal cual:

```text
Ctrl + Alt + Supr
```

También sirve para mostrar cómo se escribe algo en markdown:

```markdown
## Mi sección

Texto con **negrita** y una lista:

- Primer elemento
- Segundo elemento
```

## Separadores

Una línea con tres guiones crea una división horizontal entre bloques:

---

## Estructura recomendada de una guía

Una guía clara suele seguir este orden:

1. **Introducción:** qué va a aprender el lector.
2. **Requisitos:** qué necesita antes de empezar.
3. **Pasos:** el procedimiento, numerado y con imágenes si ayudan.
4. **Consejos:** trucos y avisos importantes.
5. **Errores comunes:** qué suele salir mal y cómo arreglarlo.
6. **Siguientes pasos:** a qué guía ir después.

## Cómo crear una guía nueva

1. Crea un archivo `.md` en `src/content/guias/` (o en `src/content/recursos/` si es un recurso).
2. Ponle un nombre en minúsculas y con guiones, por ejemplo `mi-guia.md`. Ese nombre será la dirección: `/guias/mi-guia`.
3. Empieza el archivo con este bloque, con los tres guiones arriba y abajo:

```markdown
---
title: Título de la guía
description: Resumen corto que sale debajo del título
---
```

4. Escribe el contenido debajo. Aparecerá solo en el buscador.

> **Nota:** en `title` y `description` escribe todo en una sola línea.