<?php
require 'database.php';

if($_POST['delall']) {
    ?>

    <!DOCTYPE html>
    <html lang="en" dir="ltr">
      <head>
        <meta charset="utf-8">
        <title>Borrar en Exito</title>
        <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,600&family=Smooch&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="..\interfaz\css\tabladmin.css">
      </head>
      <body>
        <br><br><br><br>
        <?php
        $sql = $conn->query("DELETE FROM catalogo_books");
            echo "Se han eliminado todos los campos con exito"; ?>
      </body>
    </html>
    <br><br><br><br>
    <a href="tabladmin.php">Regresar al catalogo</a>
<?php
    }

 ?>
