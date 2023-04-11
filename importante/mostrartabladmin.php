<?php
    require 'database.php';
 ?>

<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8">
    <title>Libros Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,600&family=Smooch&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="..\interfaz\css\tabladmin.css">
  </head>
  <body>
        <?php require '../parciales/header.php' ?>
<h1 align="center">Libros en existencia</h1>
│
       <br>
       <div id="main-contenedor">

      <table>
        <thead>
        <tr>
            <td>Nombre</td>
            <td>Autor</td>
            <td>Editorial</td>
            <td>Año de publicacion</td>
            <td>Descripcion</td>
          </tr>
            </thead>
          </div>

          <?php
              $query = "SELECT * FROM catalogo_books";
              $resultado = $conn->query($query);
              while ($row = $resultado->fetch(PDO::FETCH_ASSOC)){
                ?>

          <tr>
            <td><?php echo $row['Nombre_book'] ?></td>
            <td><?php echo $row['Autor_book'] ?></td>
            <td><?php echo $row['Editorial_book'] ?></td>
            <td><?php echo $row['Año_Salida_book'] ?></td>
            <td><?php echo $row['Des_book'] ?></td>
          </tr>
          <?php
        }
           ?>
      </table>
  </br>

  </body>
</html>
