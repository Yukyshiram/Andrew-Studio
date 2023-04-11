<?php
    require 'database.php';
 ?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8">
    <title>Tabla vista admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,600&family=Smooch&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="..\interfaz\css\tabladmin.css">
  </head>
  <body>
    <?php require '../parciales/header.php' ?>
    <p>Borrar por ID</p>
    <form action="eliminar.php" method="post" enctype="multipart/form-data">
    <input type="text" name="ide" placeholder="id del libro">
    <input type="submit" name="del" value="eliminar"><br><br>
    </form>

    <br>
    <table border="1" style="margin: 0 auto;">
      <thead>
      <tr>
          <td>ID</td>
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
         <td><?php echo $row['id_libro'] ?></td>
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
    <p>Borrar todos los campos de la tabla</p>
            <form action="eliminartodo.php" method="post" enctype="multipart/form-data">
            <input type="submit" name="delall" value="borrar todo">
            </form>

</body>
</html>
