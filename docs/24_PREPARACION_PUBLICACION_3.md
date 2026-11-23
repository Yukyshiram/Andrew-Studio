# Publicación revisable de Andrew's Bibliotecary 3.0

La autorización actual comprende publicar una rama revisada y abrir un PR hacia main. No autoriza merge, release, paquetes, despliegue Vercel ni cambios de integración.

## Estructura y conservación

La rama codex/publicacion-bibliotecary-3 parte del main remoto comprobado en 372dbf3. Conserva Laravel en modern/, la demo en demo/, los lockfiles, recursos utilizados, licencias, pruebas y CI. El PHP legado y su Docker de raíz quedan fuera de la estructura activa. El legado sigue en la historia publicada de main y en las referencias históricas locales, sin moverlas.

Los commits locales anteriores incluían escenas/dependencias 3D antiguas y evidencias masivas. Se tomó la base 2.6 ya sin WebGL y se reconstruyeron selectivamente las unidades útiles posteriores. Cada commit reconstruido conserva su autor y fecha de autoría y declara Origen-local. La rama fuente codex/bibliotecary-3 no se modifica ni se publica con sus artefactos. Consulta [trazabilidad y auditoría](25_PUBLICACION_LIMPIA.md).

## Validación y revisión

Las instrucciones reproducibles permanecen en README.md y modern/README.md. Se ejecutan npm ci y npm run build desde la raíz (salida dist/), las pruebas de demo, las puertas PHP con bases sintéticas aisladas, PHPStan, TypeScript, auditorías y revisión de objetos Git nuevos. La ejecución remota de Actions se comprueba sobre el SHA enviado; no se equipara a una validación local.

Los resultados completos, dumps sintéticos, trazas y capturas de QA se generan fuera del seguimiento Git. Solo cuatro capturas ilustran el producto. Las contraseñas de fixtures y cuentas demo son datos sintéticos explícitos; no son credenciales de producción y los seeders deben permanecer deshabilitados en producción.

## Vercel, misión posterior

Se revisan solo los enlaces existentes antes del push. En la cuenta/equipo accesibles se consultó la lista completa de proyectos y ningún enlace Git coincidía con Yukyshiram/Andrew-Studio. GitHub tampoco mostraba webhooks, deployments ni checks/status de Vercel en main. No se inició sesión, enlazó un proyecto ni modificó la integración. Esta observación tiene el alcance de las cuentas y permisos consultados.

Una publicación futura debe verificar equipo/proyecto exactos, rama de producción y protección de previews. La demo se compila desde la raíz, nunca desde demo/, porque reutiliza modern/resources/ y modern/legal/. Comandos: npm ci; npm run build; salida dist. vercel.json conserva fallback SPA y cabeceras. No requiere PHP/MySQL ni secretos. No hay URL pública nueva ni despliegue autorizado en esta misión.

## Antes del merge o de publicar un servidor

Revisar el PR y los dos trabajos de calidad, las migraciones aditivas y el procedimiento con respaldo. No usar rollback destructivo sobre datos existentes. Revertir código no restaura automáticamente una base. Una publicación Laravel exige staging, document root modern/public/, HTTPS/cookies Secure, correo, cuentas demo deshabilitadas, permisos de BD, scheduler, backups con restauración real comprobada, revisión de imágenes y monitoreo. No se acredita certificación WCAG/ASVS, carga de producción ni 60 FPS reales.

La reversión del PR, si llega a fusionarse con autorización futura, debe ser un commit de reversión revisado; no force push ni movimiento de etiquetas históricas. El merge, los despliegues y la creación de releases quedan pendientes de autorización independiente.
