# Catastro al Punto

Localiza el inmueble exacto (piso, escalera, puerta) en el Catastro a partir de lo que te dice el cliente, y abre su ficha en la Sede Electrónica del Catastro.

## Qué acepta el buscador

- Dirección con piso: `Calle Mayor 12, 3ºB, Cartagena`, `C/ Real 5 bajo 2, Murcia`, `esc 2, planta 4 puerta C`
- Coordenadas: `37.6052, -0.9864` (en Google Maps: mantén pulsado el edificio y copia las coordenadas)
- Enlace largo de Google Maps (el que lleva `@lat,lng` o `!3d…!4d…`)
- Referencia catastral de 14 o 20 caracteres

Los enlaces cortos `maps.app.goo.gl` no llevan coordenadas y no se pueden leer.

## Cómo funciona

1. La dirección se geolocaliza con OpenStreetMap (Nominatim).
2. Con esas coordenadas se consulta el servicio oficial del Catastro (`Consulta_RCCOOR`) para saber qué parcela hay en ese punto, y también las parcelas a menos de 50 m por si el punto cae en el edificio de al lado.
3. Se piden todos los inmuebles de la parcela (`Consulta_DNPRC`) y se marca el que coincide con la planta, puerta y escalera del cliente.
4. Los botones abren la Sede Electrónica (visor y ficha) en ese inmueble para la comprobación final.

Toca cualquier edificio del mapa o arrastra el pin para corregir el punto.

## Despliegue en Vercel

1. Sube esta carpeta a un repositorio de GitHub (o usa `vercel` desde la terminal dentro de la carpeta).
2. Importa el proyecto en Vercel. No hay que configurar nada: `index.html` es la página y `api/catastro.js` es la función que habla con el Catastro.
3. Abre la URL que te da Vercel. En el panel "Marcador para Google Maps" tienes el marcador ya apuntando a tu dominio.

## Por qué hay un proxy

El navegador no puede llamar directamente a los servicios del Catastro desde otro dominio. `api/catastro.js` solo reenvía cinco consultas concretas, valida los parámetros y cachea las respuestas 24 h.

## Limitaciones conocidas

- País Vasco y Navarra tienen catastros forales propios: este servicio estatal no los cubre.
- Los enlaces profundos a la Sede (`mapa.aspx?refcat=`, `OVCListaBienes.aspx`, `OVCConCiud.aspx`) no son una API documentada. Si alguno deja de abrir el inmueble, el botón "Buscador oficial" y "Copiar" siempre funcionan.
- Nominatim tiene un límite de uso (1 consulta por segundo). Para uso intensivo con varios usuarios, cambia a un geocodificador de pago o a CartoCiudad (IGN).
