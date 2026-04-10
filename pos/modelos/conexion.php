<?php

/*=============================================
CONFIGURACIÓN DE BASE DE DATOS
──────────────────────────────────────────────
Docker:            DB_HOST = 'db'    | PASS = 'root'
MAMP Mac:          DB_HOST = 'localhost' | PASS = 'root'
XAMPP/Laragon Win: DB_HOST = 'localhost' | PASS = ''
=============================================*/
define('DB_HOST', getenv('DB_HOST') ?: 'db');        // 'db' para Docker
define('DB_NAME', getenv('DB_NAME') ?: 'pos');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: 'root');
define('DB_CHARSET', 'utf8mb4');

class Conexion {

    static public function conectar() {

        try {

            $dsn  = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;

            $opciones = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            $link = new PDO($dsn, DB_USER, DB_PASS, $opciones);

            return $link;

        } catch (PDOException $e) {

            http_response_code(500);
            die(json_encode([
                'error'   => true,
                'mensaje' => 'Error de conexión a la base de datos: ' . $e->getMessage()
            ]));

        }

    }

}