<?php
    require 'database.php';
 ?>

<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8">
    <title>Libros</title>
    <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,600&family=Smooch&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="..\interfaz\css\tabladmin.css">
  </head>
  <body>
      
<h1 align="center">Catalogo</h1>
<h3>Filtro:</h3>
<div class="srcb">
  <form action="" method="get">
    <input type="text" name="busqueda">
      <input type="submit" name="envio" value="Buscar">

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
  </form>
  <br><br>
  <?php
  if (isset($_GET['envio'])) {
    $busqueda = $_GET['busqueda'];

    $consulta = $conn->query("SELECT * FROM catalogo_books WHERE nombre_book LIKE'$busqueda'");

      while ($row = $consulta->fetch(PDO::FETCH_ASSOC)) {
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
  }
   ?>
</table>
<h3>Libros disponibles</h3>
    <br>
      <table border="1" style="margin: 0 auto;">
        <thead>
        <tr>
            <td>Nombre</td>
            <td>Autor</td>
            <td>Editorial</td>
            <td>Año de publicacion</td>
            <td>Descripcion</td>
          </tr>
            </thead>

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
<span>│<a href="..\logout.php">Entrar a modo Administrador</a>│<br>│</span><br>
  </body>
</html>
