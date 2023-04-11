<?php
  session_start();
  require 'database.php';

  if (isset($_SESSION['user_id'])) {
    $records = $conn->prepare('SELECT id, email, password FROM users WHERE id = :id');
    $records->bindParam(':id', $_SESSION['user_id']);
    $records->execute();
    $results = $records->fetch(PDO::FETCH_ASSOC);

    $user = null;

    if (count($results) > 0) {
      $user = $results;
    }
  }
?>

<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title>Andrew's Library CX </title>
        <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,600&family=Smooch&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="interfaz\css\style.css">
    </head>
    <body>

      <?php if(!empty($user)): ?>
        <br> Bienvenid@ <?= $user['email']; ?>
        <br>Iniciaste sesion satisfactoriamente
        <h1>¿Que desea realizar?</h1>

        <a href="new.php">Menu Administrador </a></br>│<br>
        <a href="importante\mostrartabla.php">Entrar a modo Usuario</a><br>│<br>

        <br><br><br>
        <a href="logout.php">
          Cerrar Sesion
        </a>
      <?php else: ?>

        <h1>Andrew's Library </h1>

        <div class="index-box">
          <img class="avatar" src="andrews.jpg" alt="Logo de CX"
        </div>
        <br><br><br><br><br>
        <br><br><br><br><br>
        <br><br><br><br><br>

        <p><?php  ?></p>

          <span><a href="login.php">Iniciar Sesion</a></span>


            <?php endif; ?>

    </body>
</html>
