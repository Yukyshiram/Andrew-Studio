<?php
require 'database.php';

if($_POST['del']) {

    $id = $_POST['ide'];

    $sql = $conn->query("DELETE FROM catalogo_books WHERE id_libro = '$id'");
    echo "Se ha eliminado con exito";
    ?>
    <br><br><br><br>
    <a href="tabladmin.php">Regresar al catalogo</a>
<?php
    }

 ?>
