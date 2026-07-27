# cert-frames — Frames de animación de certificado

Pon aquí tus imágenes de secuencia numeradas y actualiza el array
`FRAMES` en `src/components/ui/ScrollFrameCanvas.jsx`.

## Requisitos

- Formato recomendado: **WebP** (mejor compresión) o JPG/PNG
- Nombrado secuencial: `frame_0001.webp`, `frame_0002.webp`, …
- Resolución recomendada: **1920×1080** o la relación de aspecto de tu animación
- Todos los frames deben tener el mismo tamaño

## Ejemplo de estructura

```
cert-frames/
  frame_0001.webp
  frame_0002.webp
  frame_0003.webp
  ...
  frame_0120.webp
```

## Cómo actualizar los frames en el componente

Abre `src/components/ui/ScrollFrameCanvas.jsx` y edita:

```js
// Número total de frames que has puesto en esta carpeta
const TOTAL_FRAMES = 120;

// Función que genera la ruta de cada frame (ajusta el nombre si es diferente)
const framePath = (i) =>
  `/cert-frames/frame_${String(i + 1).padStart(4, "0")}.webp`;
```

Si usas otro formato (jpg, png) cambia `.webp` por el tuyo.
Si tus frames empiezan en 0 en lugar de 1, ajusta el padding.
