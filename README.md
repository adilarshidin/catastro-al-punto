# Catastro al Punto

Localiza el inmueble exacto (piso, escalera, puerta) en el Catastro a partir de lo que te dice el cliente, y abre su ficha en la Sede Electrónica del Catastro.

## Cómo se usa

Pensado para el personal de la agencia, sin conocimientos técnicos: cada dato va en su propia casilla.

1. **¿Dónde está la vivienda?** Hay dos formas:
   - **Escribir la dirección**: calle, número y municipio por separado. Al escribir la calle aparecen sugerencias de portales reales (CartoCiudad, IGN); al elegir una se rellenan número y municipio.
   - **Pegar enlace de Google Maps**: vale el enlace corto que da el botón Compartir (`maps.app.goo.gl/…`), un enlace largo o unas coordenadas (`37.6052, -0.9864`).
   - El enlace «Ya tengo la referencia catastral» permite buscar por referencia de 14 o 20 caracteres.
2. **¿Qué piso es?** Escalera, planta y puerta (opcionales). Se entiende «3º», «Bajo», «Ático», «izquierda», etc.
3. **Buscar la vivienda.** El piso que coincide sale en verde con su dirección completa (calle, número, escalera, planta, puerta, código postal y municipio) y su referencia catastral, con botones para copiar cada una.

Si una dirección existe en varios sitios (por ejemplo, la misma calle en dos pedanías), la herramienta pregunta cuál es.

## Cómo funciona

1. La dirección se sitúa con CartoCiudad (portal oficial y su referencia catastral) y, si no lo encuentra, con OpenStreetMap (Nominatim). Los enlaces cortos de Google Maps los abre el servidor para sacar las coordenadas.
2. Con esas coordenadas se consulta el servicio oficial del Catastro (`Consulta_RCCOOR`) para saber qué parcela hay en ese punto, y también las parcelas a menos de 50 m por si el punto cae en el edificio de al lado.
3. Se piden todos los inmuebles de la parcela (`Consulta_DNPRC`) y se marca el que coincide con la planta, puerta y escalera del cliente.
4. Los botones abren la Sede Electrónica (visor y ficha) en ese inmueble para la comprobación final.

Toca cualquier edificio del mapa o arrastra el pin para corregir el punto.

## Despliegue en Vercel

1. Sube esta carpeta a un repositorio de GitHub (o usa `vercel` desde la terminal dentro de la carpeta).
2. Importa el proyecto en Vercel. No hay que configurar nada: `index.html` es la página y `api/catastro.js` es la función que habla con el Catastro.
3. Abre la URL que te da Vercel.

## Por qué hay un proxy

El navegador no puede llamar directamente a los servicios del Catastro desde otro dominio. `api/catastro.js` solo reenvía cinco consultas concretas, valida los parámetros y cachea las respuestas 24 h. También abre los enlaces cortos de Google Maps (solo sigue sus redirecciones, sin descargar páginas).

## Limitaciones conocidas

- País Vasco y Navarra tienen catastros forales propios: este servicio estatal no los cubre.
- Los enlaces profundos a la Sede (`mapa.aspx?refcat=`, `OVCListaBienes.aspx`, `OVCConCiud.aspx`) no son una API documentada. Si alguno deja de abrir el inmueble, el botón "Buscador oficial" y "Copiar" siempre funcionan.
- Nominatim tiene un límite de uso (1 consulta por segundo). Para uso intensivo con varios usuarios, cambia a un geocodificador de pago o a CartoCiudad (IGN).
