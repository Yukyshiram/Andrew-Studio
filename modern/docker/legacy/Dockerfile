FROM php:8.4-apache
RUN docker-php-ext-install pdo_mysql
RUN a2enmod rewrite
COPY isolation.conf /etc/apache2/conf-enabled/legacy-isolation.conf
# El código original se monta en modo lectura por compose.yaml.
# No se copia el repositorio ni sus configuraciones privadas a la imagen.
