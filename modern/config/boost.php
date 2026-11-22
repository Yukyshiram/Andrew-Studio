<?php

return [
    // Herramienta de desarrollo CLI; no inyecta scripts ni rutas en la aplicación web.
    'enabled' => PHP_SAPI === 'cli' && (bool) env('BOOST_ENABLED', true),
    'browser_logs_watcher' => false,
];
