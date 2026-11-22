FROM composer:2 AS composer
FROM php:8.4-apache

RUN apt-get update && apt-get install -y --no-install-recommends unzip libzip-dev \
    && docker-php-ext-install pdo_mysql zip \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/bibliotecary.ini
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/bibliotecary-entrypoint
ENTRYPOINT ["bibliotecary-entrypoint"]
WORKDIR /var/www/html
CMD ["apache2-foreground"]
