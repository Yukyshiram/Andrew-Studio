#!/bin/sh
set -eu

# Solo directorios de ejecución de la aplicación nueva, nunca el legado.
mkdir -p storage/app/private storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

exec docker-php-entrypoint "$@"
