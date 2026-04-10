# ──────────────────────────────────────────────
# Sistema POS — PHP 8.2 + Apache
# ──────────────────────────────────────────────
FROM php:8.2-apache

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libzip-dev \
    libxml2-dev \
    libonig-dev \
    zip \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar extensiones PHP necesarias
RUN docker-php-ext-install \
    pdo \
    pdo_mysql \
    mysqli \
    mbstring \
    gd \
    zip \
    bcmath \
    xml

# Habilitar mod_rewrite para las rutas amigables
RUN a2enmod rewrite

# Copiar configuración Apache con AllowOverride All
COPY docker/apache-pos.conf /etc/apache2/conf-available/pos.conf
RUN a2enconf pos

# Configurar zona horaria
RUN echo "date.timezone = America/Bogota" >> /usr/local/etc/php/php.ini
RUN echo "display_errors = On" >> /usr/local/etc/php/php.ini
RUN echo "error_reporting = E_ALL" >> /usr/local/etc/php/php.ini

# El código se monta como volumen (no se copia aquí)
WORKDIR /var/www/html
