<?php
require 'database.php';

if($_POST['PABLO']) {


    $Nombre_book = $_POST['nombre'];
    $Autor_book = $_POST['autor'];
    $Editorial_book = $_POST['editor'];
    $Año_Salida_book = $_POST['añopub'];
    $Des_book = $_POST['desc'];
    ?>

    <!DOCTYPE html>
    <html lang="en" dir="ltr">
      <head>
        <meta charset="utf-8">
        <title>Exito al subir</title>
        <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,600&family=Smooch&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="..\interfaz\css\formulario.css">
      </head>
      <body>
          <?php require '../parciales/header.php' ?>
<br><br><br>

<?php
$sql = $conn->query("INSERT INTO catalogo_books (nombre_book,Autor_book,Editorial_book,Año_Salida_book,Des_book) Values('".$Nombre_book."','".$Autor_book."','".$Editorial_book."','".$Año_Salida_book."','".$Des_book."')");
echo "Se subio con exito";
 ?>
    <br><br><br><br>
    <a href="mostrartabladmin.php">Ver Catalogo de libros</a>
    <br><br>
    O
    <br><br>
    <span><a href="inupload.html">Agregar otro libro </a></br></span><br>
  </body>
</html>
<?php
    }else{
      echo "no se subio";
    }
 ?>
