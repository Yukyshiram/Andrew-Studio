<?php

  session_start();

  require 'database.php';

  if (!empty($_POST['email']) && !empty($_POST['password'])) {
    $records = $conn->prepare('SELECT id, email, password FROM users WHERE email = :email');
    $records->bindParam(':email', $_POST['email']);
    $records->execute();
    $results = $records->fetch(PDO::FETCH_ASSOC);

    $message = '';

    if (is_countable($results) > 0 && password_verify($_POST['password'], $results['password'])) {
      $_SESSION['user_id'] = $results['id'];
      header("Location: /Andrews_bibliotecary_CX");
    } else {
      $message = 'lo sentimos, no se encuentran las credenciales';
    }
  }
?>

<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8">
    <title>Iniciar Sesion</title>
    <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@1,600&family=Smooch&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="interfaz\css\style.css">

  </head>
  <body>
    <?php require 'parciales/header.php' ?>

    <div class="login-box">
      <img class="avatar" src="interfaz/css/CX.png" alt="Logo de CX"
    </div>

    <?php if(!empty($message)): ?>
      <p> <?= $message ?></p>
    <?php endif; ?>

    <h1>Iniciar Sesion</h1>


    <form action="login.php" method="post">
      <input type="text" name="email" placeholder="Ingresa tu Correo">
      <input type="password" name="password" placeholder="Ingresa tu contraseña">
      <input type="submit" value="Enviar">
    </form>

  </body>
</html>
