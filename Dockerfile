# Use the official PHP image as the base
FROM php:8.2-fpm

LABEL maintainer="latayada1233@gmail.com"
LABEL app_environment="development"

# Set the working directory
WORKDIR /var/www

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libonig-dev \
    libzip-dev \
    zip \
    unzip \
    curl

# Install PHP extensions
RUN docker-php-ext-configure gd --with-jpeg && \
    docker-php-ext-install mysqli pdo pdo_mysql zip gd

RUN yes | pecl install xdebug \
    && echo "zend_extension=$(find /usr/local/lib/php/extensions/ -name xdebug.so)" > /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.mode=coverage" >> /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.remote_autostart=off" >> /usr/local/etc/php/conf.d/xdebug.ini

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy the existing application code
COPY . /var/www

# Copy custom PHP configuration (local.ini) into the container
COPY ./docker/php/local.ini /usr/local/etc/php/conf.d/local.ini

# Set COMPOSER_ALLOW_SUPERUSER environment variable and clear vendor directory
RUN export COMPOSER_ALLOW_SUPERUSER=1 && \
    rm -rf /var/www/html/vendor/* && \
    composer update && \
    composer install

# Set appropriate permissions
RUN chown -R www-data:www-data /var/www

# Expose port 9000 and start PHP-FPM server
EXPOSE 9000
CMD ["php-fpm"]
