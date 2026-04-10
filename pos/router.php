<?php
/**
 * Router para PHP Built-in Server (php -S localhost:8000)
 * Simula el comportamiento del .htaccess sin necesitar Apache.
 *
 * Uso: php -S localhost:8000 -t /ruta/al/pos router.php
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Servir archivos estáticos directamente (css, js, img, etc.)
$extensionesEstaticas = ['css','js','png','jpg','jpeg','gif','svg','ico','woff','woff2','ttf','eot','map','pdf'];
$ext = strtolower(pathinfo($uri, PATHINFO_EXTENSION));

if (in_array($ext, $extensionesEstaticas)) {
    $archivo = __DIR__ . $uri;
    if (file_exists($archivo)) {
        // Tipos MIME
        $mimes = [
            'css'   => 'text/css',
            'js'    => 'application/javascript',
            'png'   => 'image/png',
            'jpg'   => 'image/jpeg',
            'jpeg'  => 'image/jpeg',
            'gif'   => 'image/gif',
            'svg'   => 'image/svg+xml',
            'ico'   => 'image/x-icon',
            'woff'  => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf'   => 'font/ttf',
        ];
        if (isset($mimes[$ext])) {
            header('Content-Type: ' . $mimes[$ext]);
        }
        readfile($archivo);
        return true;
    }
}

// Simular .htaccess: rutas como /inicio → index.php?ruta=inicio
if ($uri !== '/' && !file_exists(__DIR__ . $uri)) {
    $ruta = ltrim($uri, '/');
    if (preg_match('/^[-a-zA-Z0-9]+$/', $ruta)) {
        $_GET['ruta'] = $ruta;
    }
}

// Siempre cargar index.php
require_once __DIR__ . '/index.php';
